'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { CalendarDays, Check, Clock3, Copy, MessageCircle, QrCode, Scissors, Tag, UserRound } from 'lucide-react'
import { formatDate, formatDuration, formatPrice, formatTime, sanitizeWhatsApp } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import type { AppointmentPaymentMethod } from '@/types'

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
  paymentMethod?: AppointmentPaymentMethod
  pixPayload?: string
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
  paymentMethod = 'at_barbershop',
  pixPayload,
  onNewBooking,
}: SuccessScreenProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
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
    ? `https://wa.me/${sanitizeWhatsApp(barbershopWhatsApp)}?text=${encodeURIComponent(`Ola! Gostaria de falar sobre meu agendamento de ${serviceName}.`)}`
    : null

  useEffect(() => {
    let active = true
    if (!pixPayload) {
      setQrCodeUrl('')
      return
    }
    QRCode.toDataURL(pixPayload, { width: 220, margin: 1, color: { dark: '#050607', light: '#FFFFFF' } })
      .then((url) => { if (active) setQrCodeUrl(url) })
      .catch(() => { if (active) setQrCodeUrl('') })
    return () => { active = false }
  }, [pixPayload])

  const copyPix = async () => {
    if (!pixPayload) return
    await navigator.clipboard.writeText(pixPayload)
  }

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

        {paymentMethod === 'pix' && pixPayload ? (
          <div className="mt-4 rounded-xl border border-[#F5C400]/35 bg-[#111315] p-4 text-left">
            <div className="mb-3 flex items-start gap-2">
              <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[#F5C400]" />
              <div>
                <p className="text-sm font-semibold text-white">Pagamento via Pix</p>
                <p className="mt-1 text-[10px] leading-4 text-[#E8D281]">A barbearia confirma o pagamento manualmente depois de verificar o recebimento.</p>
              </div>
            </div>
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code Pix" className="mx-auto h-44 w-44 rounded-lg bg-white p-2" />}
            <button type="button" onClick={copyPix} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#F5C400] px-3 text-xs font-semibold text-[#F5C400]">
              <Copy className="h-4 w-4" /> Copiar codigo Pix
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#F5C400]/25 bg-[#F5C400]/10 px-3 py-3 text-left text-[11px] leading-4 text-[#E8D281]">
            Pagamento escolhido: na barbearia. O profissional confirmara o pagamento no painel apos receber.
          </div>
        )}

        <a href={calendarHref} download={`agendamento-${date}.ics`} className="gold-action mt-5 flex w-full items-center justify-center gap-2 text-sm">
          <CalendarDays className="h-[18px] w-[18px]" /> Adicionar ao calendario
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
