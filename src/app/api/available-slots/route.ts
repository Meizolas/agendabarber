import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateTimeSlots, timeToMinutes } from '@/lib/utils/slots'
import { getDay } from 'date-fns'
import { getBillingAccessByBarberId } from '@/lib/billing/access'

type AppointmentSlot = { appointment_time: string; service: { duration_minutes: number } | { duration_minutes: number }[] | null }
type BlockedSlot = { blocked_time: string | null }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const barberId = searchParams.get('barber_id')
  const date = searchParams.get('date')       // "YYYY-MM-DD"
  const serviceId = searchParams.get('service_id')
  const staffMemberId = searchParams.get('staff_member_id')

  if (!barberId || !date || !serviceId || !staffMemberId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: barber_id, staff_member_id, date, service_id' }, { status: 400 })
  }

  if (!/^[0-9a-f-]{36}$/i.test(barberId) || !/^[0-9a-f-]{36}$/i.test(staffMemberId) || !/^[0-9a-f-]{36}$/i.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    const billingAccess = await getBillingAccessByBarberId(barberId)
    if (!billingAccess.allowed) {
      return NextResponse.json(
        { error: 'Agenda temporariamente indisponivel.', code: 'PAYMENT_REQUIRED' },
        { status: 402 },
      )
    }
    const dayOfWeek = getDay(new Date(date + 'T12:00:00'))

    const { data: staffMember } = await supabase.from('staff_members').select('id').eq('id', staffMemberId).eq('barber_id', barberId).eq('is_active', true).maybeSingle()
    if (!staffMember) return NextResponse.json({ error: 'Profissional indisponível.' }, { status: 404 })

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
      .eq('barber_id', barberId)
      .eq('is_active', true)
      .single()

    if (!service) {
      return NextResponse.json({ slots: [] })
    }

    // Buscar agendamentos confirmados na data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time, service:services(duration_minutes)')
      .eq('barber_id', barberId)
      .eq('staff_member_id', staffMemberId)
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

    const occupiedIntervals = appointmentSlots.map((appointment) => {
      const joinedService = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service
      return {
        start: appointment.appointment_time.substring(0, 5),
        durationMinutes: joinedService?.duration_minutes ?? rule.interval_minutes,
      }
    })

    const blockedTimes = blockedSlots
      .filter((b) => b.blocked_time)
      .map((b) => b.blocked_time!.substring(0, 5))

    let slots = generateTimeSlots(
      rule.start_time.substring(0, 5),
      rule.end_time.substring(0, 5),
      rule.interval_minutes,
      service.duration_minutes,
      occupiedIntervals,
      blockedTimes,
    )
    let unavailableSlots = generateTimeSlots(
      rule.start_time.substring(0, 5),
      rule.end_time.substring(0, 5),
      rule.interval_minutes,
      service.duration_minutes,
      [],
      blockedTimes,
    ).filter((slot) => !slots.includes(slot))

    if (rule.lunch_start_time && rule.lunch_end_time) {
      const lunchStart = timeToMinutes(rule.lunch_start_time.substring(0, 5))
      const lunchEnd = timeToMinutes(rule.lunch_end_time.substring(0, 5))
      const overlapsLunch = (slot: string) => {
        const slotStart = timeToMinutes(slot)
        return slotStart < lunchEnd && slotStart + service.duration_minutes > lunchStart
      }
      slots = slots.filter((slot) => !overlapsLunch(slot))
      unavailableSlots = unavailableSlots.filter((slot) => !overlapsLunch(slot))
    }

    const nowInSaoPaulo = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).reduce<Record<string, string>>((parts, part) => {
      parts[part.type] = part.value
      return parts
    }, {})
    const today = `${nowInSaoPaulo.year}-${nowInSaoPaulo.month}-${nowInSaoPaulo.day}`
    const currentTime = `${nowInSaoPaulo.hour}:${nowInSaoPaulo.minute}`
    if (date < today) {
      slots = []
      unavailableSlots = []
    }
    if (date === today) {
      slots = slots.filter((slot) => slot > currentTime)
      unavailableSlots = unavailableSlots.filter((slot) => slot > currentTime)
    }

    return NextResponse.json({ slots, unavailableSlots }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (err) {
    console.error('[Available Slots] Error:', err)
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 })
  }
}
