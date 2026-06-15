import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateTimeSlots } from '@/lib/utils/slots'
import { getDay } from 'date-fns'

type AppointmentSlot = { appointment_time: string }
type BlockedSlot = { blocked_time: string | null }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const barberId = searchParams.get('barber_id')
  const date = searchParams.get('date')       // "YYYY-MM-DD"
  const serviceId = searchParams.get('service_id')

  if (!barberId || !date || !serviceId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: barber_id, date, service_id' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    const dayOfWeek = getDay(new Date(date + 'T12:00:00'))

    // Buscar regra de disponibilidade para o dia da semana
    const { data: rule } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (!rule) {
      return NextResponse.json({ slots: [] })
    }

    // Buscar serviço para saber a duração
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (!service) {
      return NextResponse.json({ slots: [] })
    }

    // Buscar agendamentos confirmados na data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('barber_id', barberId)
      .eq('appointment_date', date)
      .eq('status', 'confirmed')

    // Buscar horários bloqueados no dia
    const { data: blocked } = await supabase
      .from('blocked_times')
      .select('blocked_time')
      .eq('barber_id', barberId)
      .eq('blocked_date', date)

    // Se houver bloqueio de dia inteiro (blocked_time = NULL)
    const blockedSlots = (blocked ?? []) as BlockedSlot[]
    const appointmentSlots = (appointments ?? []) as AppointmentSlot[]

    const wholeDayBlocked = blockedSlots.some((b) => !b.blocked_time)
    if (wholeDayBlocked) {
      return NextResponse.json({ slots: [] })
    }

    const bookedTimes = appointmentSlots.map((a) =>
      // "HH:MM:SS" -> "HH:MM"
      a.appointment_time.substring(0, 5),
    )

    const blockedTimes = blockedSlots
      .filter((b) => b.blocked_time)
      .map((b) => b.blocked_time!.substring(0, 5))

    const slots = generateTimeSlots(
      rule.start_time.substring(0, 5),
      rule.end_time.substring(0, 5),
      rule.interval_minutes,
      service.duration_minutes,
      bookedTimes,
      blockedTimes,
    )

    return NextResponse.json({ slots })
  } catch (err) {
    console.error('[Available Slots] Error:', err)
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 })
  }
}
