import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createAppointmentSchema } from '@/lib/validations/appointment'
import { sendAppointmentNotifications } from '@/lib/whatsapp/evolution'
import { enforceRateLimit, requestFingerprint } from '@/lib/security/request'
import type { Appointment } from '@/types'
import { getBillingAccessByBarberId } from '@/lib/billing/access'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const adminClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')

    const { data: barber } = await adminClient
      .from('barbers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!barber) {
      return NextResponse.json({ barber: null, appointments: [] })
    }

    let query = adminClient
      .from('appointments')
      .select('*, service:services(*), staff_member:staff_members(*)')
      .eq('barber_id', barber.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (date) {
      query = query.eq('appointment_date', date)
    } else {
      if (from) query = query.gte('appointment_date', from)
      if (to) query = query.lte('appointment_date', to)
    }
    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ barber, appointments: data ?? [] })
  } catch (err) {
    console.error('[Appointments GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const supabase = createServiceClient()

    try {
      const allowed = await enforceRateLimit({
        supabase,
        key: requestFingerprint(request, `appointment:${data.barber_id}`),
        limit: 8,
        windowSeconds: 10 * 60,
      })
      if (!allowed) {
        return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
      }
    } catch {
      return NextResponse.json({ error: 'Protecao do banco ainda nao foi instalada.' }, { status: 503 })
    }

    const { data: barber } = await supabase
      .from('barbers')
      .select('id, barber_name, barbershop_name, whatsapp')
      .eq('id', data.barber_id)
      .single()

    if (!barber) {
      return NextResponse.json({ error: 'Barbeiro nao encontrado' }, { status: 404 })
    }

    const billingAccess = await getBillingAccessByBarberId(barber.id)
    if (!billingAccess.allowed) {
      return NextResponse.json(
        { error: 'Agenda temporariamente indisponivel.', code: 'PAYMENT_REQUIRED' },
        { status: 402 },
      )
    }

    const { data: service } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('id', data.service_id)
      .eq('barber_id', data.barber_id)
      .eq('is_active', true)
      .single()

    if (!service) {
      return NextResponse.json({ error: 'Servico nao encontrado' }, { status: 404 })
    }

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('id, name, whatsapp')
      .eq('id', data.staff_member_id)
      .eq('barber_id', data.barber_id)
      .eq('is_active', true)
      .maybeSingle()
    if (!staffMember) return NextResponse.json({ error: 'Profissional indisponível.' }, { status: 404 })

    const { data: appointment, error } = await supabase
      .rpc('create_public_appointment', {
        p_barber_id: data.barber_id,
        p_staff_member_id: data.staff_member_id,
        p_service_id: data.service_id,
        p_client_name: data.client_name,
        p_client_whatsapp: data.client_whatsapp,
        p_appointment_date: data.appointment_date,
        p_appointment_time: data.appointment_time,
        p_notes: data.notes ?? null,
      })
      .single()

    if (error) {
      console.error('[Appointments POST] DB error:', error)
      const knownErrors: Record<string, { message: string; status: number }> = {
        SLOT_CONFLICT: { message: 'Este horario ja esta ocupado. Escolha outro.', status: 409 },
        OUTSIDE_AVAILABILITY: { message: 'Horario fora do expediente.', status: 400 },
        BLOCKED_TIME: { message: 'Este horario esta bloqueado.', status: 409 },
        PAST_APPOINTMENT: { message: 'Escolha uma data e horario futuros.', status: 400 },
        INVALID_SERVICE: { message: 'Servico indisponivel.', status: 400 },
        INVALID_STAFF_MEMBER: { message: 'Profissional indisponível.', status: 400 },
      }
      const known = Object.entries(knownErrors).find(([code]) => error.message.includes(code))?.[1]
      return NextResponse.json(
        { error: known?.message ?? 'Nao foi possivel validar o horario no banco.' },
        { status: known?.status ?? 500 },
      )
    }

    const createdAppointment = appointment as Appointment | null
    if (!createdAppointment) {
      return NextResponse.json({ error: 'Agendamento nao retornado pelo banco.' }, { status: 500 })
    }

    let notificationError: string | null = null

    try {
      await sendAppointmentNotifications({
        appointmentId: createdAppointment.id,
        clientName: data.client_name,
        clientWhatsapp: data.client_whatsapp,
        barberWhatsapp: staffMember.whatsapp || barber.whatsapp,
        barberName: staffMember.name,
        barbershopName: barber.barbershop_name,
        serviceName: service.name,
        servicePrice: Number(service.price),
        appointmentDate: data.appointment_date,
        appointmentTime: data.appointment_time,
        notes: data.notes,
      })
    } catch (err) {
      notificationError = err instanceof Error ? err.message : 'Erro ao enviar notificacoes'
      console.error('[WhatsApp] Error:', err)
    }

    return NextResponse.json({ appointment: createdAppointment, notificationError }, { status: 201 })
  } catch (err) {
    console.error('[Appointments POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
