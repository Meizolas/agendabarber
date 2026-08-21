import { createHash } from 'node:crypto'
import { notFound } from 'next/navigation'
import { CalendarDays, Check, Clock3, MessageCircle, Scissors, UserRound } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate, formatDuration, formatTime, sanitizeWhatsApp } from '@/lib/utils/format'
import { ConfirmationCalendarAction } from '@/components/booking/ConfirmationCalendarAction'
import { CopyAppointmentDetails } from '@/components/booking/CopyAppointmentDetails'

export const dynamic = 'force-dynamic'

export default async function AppointmentConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 32) notFound()

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('appointment_calendar_tokens')
    .select('expires_at, appointment:appointments(client_name, appointment_date, appointment_time, service:services(name, duration_minutes), staff_member:staff_members(name), barber:barbers(barbershop_name, whatsapp))')
    .or(`token_hash.eq.${createHash('sha256').update(token).digest('hex')},public_token.eq.${token}`)
    .maybeSingle()

  if (!data || (data.expires_at && new Date(data.expires_at) < new Date())) notFound()
  const appointment = Array.isArray(data.appointment) ? data.appointment[0] : data.appointment
  if (!appointment) notFound()
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service
  const staff = Array.isArray(appointment.staff_member) ? appointment.staff_member[0] : appointment.staff_member
  const barber = Array.isArray(appointment.barber) ? appointment.barber[0] : appointment.barber
  if (!service || !barber) notFound()

  const calendarUrl = `/api/calendar/${token}`
  const [year, month, day] = appointment.appointment_date.split('-').map(Number)
  const [hour, minute] = formatTime(appointment.appointment_time).split(':').map(Number)
  const pad = (value: number) => String(value).padStart(2, '0')
  const googleStart = `${appointment.appointment_date.replace(/-/g, '')}T${formatTime(appointment.appointment_time).replace(':', '')}00`
  const googleEndDate = new Date(Date.UTC(year, month - 1, day, hour, minute + service.duration_minutes))
  const googleEnd = `${googleEndDate.getUTCFullYear()}${pad(googleEndDate.getUTCMonth() + 1)}${pad(googleEndDate.getUTCDate())}T${pad(googleEndDate.getUTCHours())}${pad(googleEndDate.getUTCMinutes())}00`
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${service.name} - ${barber.barbershop_name}`)}&dates=${googleStart}/${googleEnd}&ctz=America%2FSao_Paulo&details=${encodeURIComponent(`Agendamento de ${appointment.client_name}${staff?.name ? ` com ${staff.name}` : ''}`)}`
  const androidStartMillis = new Date(`${appointment.appointment_date}T${formatTime(appointment.appointment_time)}:00-03:00`).getTime()
  const whatsapp = barber.whatsapp ? `https://wa.me/${sanitizeWhatsApp(barber.whatsapp)}` : null
  const appointmentDetails = `${barber.barbershop_name}\nServiço: ${service.name}\nProfissional: ${staff?.name ?? 'Profissional'}\nData: ${formatDate(appointment.appointment_date)}\nHorário: ${formatTime(appointment.appointment_time)}\nDuração: ${formatDuration(service.duration_minutes)}`

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-[30px] border border-white/[0.08] bg-[#08090B] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#F5C400] bg-[#F5C400]/[0.07]">
          <Check className="h-10 w-10 text-[#F5C400]" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Agendamento confirmado</h1>
        <p className="mt-2 text-sm text-[#A6AAB1]">{barber.barbershop_name}</p>
        <div className="mt-6 rounded-xl border border-white/10 bg-[#15171A] p-4 text-left">
          <p className="mb-3 text-sm text-[#A6AAB1]">Olá, {appointment.client_name}!</p>
          <Detail icon={Scissors} value={service.name} />
          <Detail icon={UserRound} value={staff?.name ?? 'Profissional'} />
          <Detail icon={CalendarDays} value={formatDate(appointment.appointment_date)} />
          <Detail icon={Clock3} value={`${formatTime(appointment.appointment_time)} · ${formatDuration(service.duration_minutes)}`} />
        </div>
        <ConfirmationCalendarAction appleHref={calendarUrl} googleHref={googleUrl} androidEvent={{ title: `${service.name} - ${barber.barbershop_name}`, description: `Agendamento de ${appointment.client_name}${staff?.name ? ` com ${staff.name}` : ''}`, startMillis: androidStartMillis, endMillis: androidStartMillis + service.duration_minutes * 60_000 }} />
        <CopyAppointmentDetails text={appointmentDetails} />
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#F5C400] text-sm text-[#F5C400]"><MessageCircle className="h-5 w-5" /> Falar com a barbearia</a>}
        <p className="mt-5 text-xs text-[#777B82]">Guarde este link para consultar seu horário novamente.</p>
      </section>
    </main>
  )
}

function Detail({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string }) {
  return <div className="flex items-center gap-3 border-t border-white/[0.06] py-3 first:border-0"><Icon className="h-[18px] w-[18px] text-[#D7DADE]" /><span className="text-sm">{value}</span></div>
}
