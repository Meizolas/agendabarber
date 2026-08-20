import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { formatTime } from '@/lib/utils/format'

function escapeIcal(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function calendarValue(date: string, time: string) {
  return `${date.replace(/-/g, '')}T${formatTime(time).replace(':', '')}00`
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token || token.length < 32) return new NextResponse('Evento nao encontrado.', { status: 404 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const admin = createServiceClient()
  const { data } = await admin
    .from('appointment_calendar_tokens')
    .select('expires_at, appointment:appointments(id, client_name, appointment_date, appointment_time, service:services(name, duration_minutes), staff_member:staff_members(name), barber:barbers(barbershop_name))')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!data || (data.expires_at && new Date(data.expires_at) < new Date())) {
    return new NextResponse('Evento nao encontrado ou expirado.', { status: 404 })
  }

  const appointment = Array.isArray(data.appointment) ? data.appointment[0] : data.appointment
  if (!appointment) return new NextResponse('Evento nao encontrado.', { status: 404 })
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service
  const staff = Array.isArray(appointment.staff_member) ? appointment.staff_member[0] : appointment.staff_member
  const barber = Array.isArray(appointment.barber) ? appointment.barber[0] : appointment.barber
  if (!service || !barber) return new NextResponse('Evento nao encontrado.', { status: 404 })

  const start = calendarValue(appointment.appointment_date, appointment.appointment_time)
  const [year, month, day] = appointment.appointment_date.split('-').map(Number)
  const [hour, minute] = formatTime(appointment.appointment_time).split(':').map(Number)
  const endDate = new Date(Date.UTC(year, month - 1, day, hour, minute + service.duration_minutes))
  const pad = (value: number) => String(value).padStart(2, '0')
  const end = `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}T${pad(endDate.getUTCHours())}${pad(endDate.getUTCMinutes())}00`
  const summary = `${service.name} - ${barber.barbershop_name}`
  const description = `Agendamento de ${appointment.client_name}${staff?.name ? ` com ${staff.name}` : ''}`
  const calendar = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AgendBarber//Calendario//PT-BR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${appointment.id}@agendbarber`, `DTSTART;TZID=America/Sao_Paulo:${start.slice(0, 8)}T${start.slice(9)}`,
    `DTEND;TZID=America/Sao_Paulo:${end.slice(0, 8)}T${end.slice(9)}`,
    `SUMMARY:${escapeIcal(summary)}`, `DESCRIPTION:${escapeIcal(description)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="agendamento.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}
