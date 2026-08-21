import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types'
import { createHash, randomBytes } from 'node:crypto'

const manualAppointmentSchema = z.object({
  staff_member_id: z.string().uuid(),
  service_id: z.string().uuid(),
  client_name: z.string().trim().min(2).max(100),
  client_whatsapp: z.string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length >= 10 && value.length <= 13, 'WhatsApp inválido'),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).optional(),
})

const appointmentErrors: Record<string, { message: string; status: number }> = {
  SLOT_CONFLICT: { message: 'Este horário já está ocupado. Escolha outro.', status: 409 },
  OUTSIDE_AVAILABILITY: { message: 'Horário fora do expediente configurado.', status: 400 },
  BLOCKED_TIME: { message: 'Este horário está bloqueado.', status: 409 },
  LUNCH_BREAK: { message: 'Este horário coincide com o intervalo de almoço.', status: 409 },
  PAST_APPOINTMENT: { message: 'Escolha uma data e horário futuros.', status: 400 },
  INVALID_SERVICE: { message: 'Serviço indisponível.', status: 400 },
  INVALID_STAFF_MEMBER: { message: 'Profissional indisponível.', status: 400 },
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const parsed = manualAppointmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Preencha corretamente os dados do agendamento.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const admin = createServiceClient()
    const { data: barber } = await admin
      .from('barbers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!barber) return NextResponse.json({ error: 'Perfil da barbearia não encontrado.' }, { status: 404 })

    const data = parsed.data
    const { data: appointment, error } = await admin.rpc('create_public_appointment', {
      p_barber_id: barber.id,
      p_staff_member_id: data.staff_member_id,
      p_service_id: data.service_id,
      p_client_name: data.client_name,
      p_client_whatsapp: data.client_whatsapp,
      p_appointment_date: data.appointment_date,
      p_appointment_time: data.appointment_time,
      p_notes: data.notes || 'Agendamento registrado manualmente pela barbearia.',
      p_payment_method: 'at_barbershop',
    }).single()

    if (error) {
      const known = Object.entries(appointmentErrors)
        .find(([code]) => error.message.includes(code))?.[1]
      return NextResponse.json(
        { error: known?.message ?? 'Não foi possível registrar o agendamento.' },
        { status: known?.status ?? 500 },
      )
    }

    const createdAppointment = appointment as Appointment | null
    if (!createdAppointment) return NextResponse.json({ error: 'Agendamento não retornado pelo banco.' }, { status: 500 })

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .upsert({ barber_id: barber.id, name: data.client_name, whatsapp: data.client_whatsapp, updated_at: new Date().toISOString() }, { onConflict: 'barber_id,whatsapp' })
      .select('id')
      .single()
    if (customerError || !customer) {
      console.error('[Manual appointment POST] Customer error:', customerError)
      return NextResponse.json({ error: 'Agendamento criado, mas não foi possível cadastrar o cliente.' }, { status: 500 })
    }

    await admin.from('appointments').update({ customer_id: customer.id }).eq('id', createdAppointment.id).eq('barber_id', barber.id)
    const calendarToken = randomBytes(32).toString('hex')
    const { error: tokenError } = await admin.from('appointment_calendar_tokens').insert({
      appointment_id: createdAppointment.id,
      token_hash: createHash('sha256').update(calendarToken).digest('hex'),
      public_token: calendarToken,
    })
    if (tokenError) console.error('[Manual appointment POST] Calendar token error:', tokenError)

    return NextResponse.json({ appointment: createdAppointment, calendarToken: tokenError ? null : calendarToken }, { status: 201 })
  } catch (error) {
    console.error('[Manual appointment POST] Unexpected error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
