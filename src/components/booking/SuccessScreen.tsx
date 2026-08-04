import { CalendarDays, Check, Clock3, MessageCircle, Scissors, Tag, UserRound } from 'lucide-react'
import { formatDate, formatDuration, formatPrice, formatTime, sanitizeWhatsApp } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'

interface SuccessScreenProps {
  clientName: string
  barbershopName: string
  barbershopWhatsApp?: string | null
  serviceName: string
  staffName: string
  servicePrice: number
  serviceDuration: number
  date: string
  time: string
  onNewBooking: () => void
}

function calendarStamp(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}00`
}

export function SuccessScreen({
  clientName,
  barbershopName,
  barbershopWhatsApp,
  serviceName,
  staffName,
  servicePrice,
  serviceDuration,
  date,
  time,
  onNewBooking,
}: SuccessScreenProps) {
  const startsAt = new Date(`${date}T${formatTime(time)}:00`)
  const endsAt = new Date(startsAt.getTime() + serviceDuration * 60_000)
  const calendarFile = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${calendarStamp(startsAt)}`,
    `DTEND:${calendarStamp(endsAt)}`,
    `SUMMARY:${serviceName} - ${barbershopName}`,
    `DESCRIPTION:Agendamento de ${clientName} na ${barbershopName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const calendarHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarFile)}`
  const whatsappHref = barbershopWhatsApp
    ? `https://wa.me/${sanitizeWhatsApp(barbershopWhatsApp)}?text=${encodeURIComponent(`Olá! Gostaria de falar sobre meu agendamento de ${serviceName}.`)}`
    : null

  return (
    <div className="auth-surface relative min-h-[calc(100dvh-3rem)] overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#08090B] px-5 pb-7 pt-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="relative z-10">
        <div className="relative mx-auto mt-2 grid h-24 w-24 place-items-center rounded-full border border-[#F5C400] bg-[#F5C400]/[0.07] shadow-[0_0_12px_#F5C400,0_0_42px_rgba(245,196,0,0.42)]">
          <Check className="h-12 w-12 stroke-[4] text-[#F5C400] drop-shadow-[0_0_8px_rgba(245,196,0,0.8)]" />
          <span className="absolute inset-2 rounded-full border border-[#F5C400]/20" />
        </div>

        <h2 className="mt-7 text-[25px] font-semibold leading-[1.05] text-white">
          Agendamento<br /><span className="text-[#F5C400]">confirmado!</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[280px] truncate text-sm font-medium text-[#D7DADE]">{barbershopName}</p>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#15171A] px-4 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
          <Detail icon={UserRound} value={staffName} />
          <Detail icon={Scissors} value={serviceName} />
          <Detail icon={CalendarDays} value={formatDate(date)} />
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] py-3">
            <span className="flex items-center gap-3 text-sm text-white">
              <Clock3 className="h-[18px] w-[18px] text-[#D7DADE]" />
              {formatTime(time)}
            </span>
            <span className="flex items-center gap-2 text-xs text-[#A6AAB1]">
              <Clock3 className="h-4 w-4" /> {formatDuration(serviceDuration)}
            </span>
          </div>
          <Detail icon={Tag} value={formatPrice(servicePrice)} />
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#9A9EA6]">
          <MessageCircle className="h-4 w-4 text-[#22C55E]" />
          Enviamos a confirmação para seu WhatsApp
        </p>

        <a href={calendarHref} download={`agendamento-${date}.ics`} className="gold-action mt-5 flex w-full items-center justify-center gap-2 text-sm">
          <CalendarDays className="h-[18px] w-[18px]" /> Adicionar ao calendário
        </a>

        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg border border-[#F5C400] text-sm font-medium text-[#F5C400] transition hover:bg-[#F5C400]/10">
            <MessageCircle className="h-[18px] w-[18px]" /> Falar com a barbearia
          </a>
        )}

        <Button variant="ghost" className="mt-4 text-sm font-medium text-[#F5C400] hover:bg-transparent hover:text-[#FFD21A]" onClick={onNewBooking}>
          Fazer outro agendamento
        </Button>
      </div>
    </div>
  )
}

function Detail({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-white/[0.06] py-3 first:border-0">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#D7DADE]" />
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}
