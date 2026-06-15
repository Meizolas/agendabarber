import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createAppointmentSchema } from '@/lib/validations/appointment'
import { sendAppointmentNotifications } from '@/lib/whatsapp/evolution'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const data = parsed.data
    const supabase = createServiceClient()

    // Verificar se o barbeiro existe
    const { data: barber } = await supabase
      .from('barbers')
      .select('id, barber_name, barbershop_name, whatsapp')
      .eq('id', data.barber_id)
      .single()

    if (!barber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 })
    }

    // Verificar se o serviço existe e pertence ao barbeiro
    const { data: service } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('id', data.service_id)
      .eq('barber_id', data.barber_id)
      .eq('is_active', true)
      .single()

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    // Verificar conflito de horário
    const appointmentTime = `${data.appointment_time}:00`
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', data.barber_id)
      .eq('appointment_date', data.appointment_date)
      .eq('appointment_time', appointmentTime)
      .eq('status', 'confirmed')
      .single()

    if (conflict) {
      return NextResponse.json(
        { error: 'Este horário já está ocupado. Escolha outro.' },
        { status: 409 },
      )
    }

    // Criar agendamento
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        barber_id: data.barber_id,
        service_id: data.service_id,
        client_name: data.client_name,
        client_whatsapp: data.client_whatsapp,
        appointment_date: data.appointment_date,
        appointment_time: appointmentTime,
        notes: data.notes ?? null,
        status: 'confirmed',
      })
      .select()
      .single()

    if (error) {
      console.error('[Appointments POST] DB error:', error)
      return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
    }

    // Enviar notificações WhatsApp (não bloqueia a resposta)
    sendAppointmentNotifications({
      appointmentId: appointment.id,
      clientName: data.client_name,
      clientWhatsapp: data.client_whatsapp,
      barberWhatsapp: barber.whatsapp,
      barbershopName: barber.barbershop_name,
      serviceName: service.name,
      appointmentDate: data.appointment_date,
      appointmentTime: data.appointment_time,
      notes: data.notes,
    }).catch((err) => console.error('[WhatsApp] Error:', err))

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (err) {
    console.error('[Appointments POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
