import type { Appointment } from '@/types'
import { formatPrice, formatTime, sanitizeWhatsApp } from '@/lib/utils/format'
import { Check, CircleDollarSign, MessageCircle, MoreVertical, X } from 'lucide-react'

interface AppointmentCardProps {
  appointment: Appointment
  onAction?: (id: string, status: 'cancelled' | 'completed') => void
  onPaymentConfirm?: (id: string) => void
  paymentLoading?: boolean
}

const statusStyle = {
  confirmed: { label: 'Confirmado', border: 'border-l-[#F5C400]', badge: 'bg-[#22C55E]/15 text-[#65D787]' },
  completed: { label: 'Concluído', border: 'border-l-sky-500', badge: 'bg-sky-500/15 text-sky-300' },
  cancelled: { label: 'Cancelado', border: 'border-l-[#EF4444]', badge: 'bg-[#EF4444]/15 text-[#FCA5A5]' },
}

export function AppointmentCard({ appointment, onAction, onPaymentConfirm, paymentLoading }: AppointmentCardProps) {
  const style = statusStyle[appointment.status]
  const whatsapp = `https://wa.me/${sanitizeWhatsApp(appointment.client_whatsapp)}`
  const paymentPending = appointment.payment_status !== 'paid'
  const paymentLabel = appointment.payment_status === 'paid'
    ? 'Pagamento confirmado'
    : appointment.payment_method === 'pix'
      ? 'Pix a confirmar'
      : 'Pagar na barbearia'

  return (
    <article className={`dashboard-card flex min-h-[76px] overflow-visible border-l-2 ${style.border}`}>
      <div className="grid w-[62px] shrink-0 place-items-center border-r border-white/[0.07] text-center">
        <span className="text-sm font-semibold text-white">{formatTime(appointment.appointment_time)}</span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{appointment.client_name}</p>
            <p className="mt-1 truncate text-[10px] text-[#A2A6AD]">{appointment.service?.name ?? 'Serviço'}</p>
            {appointment.staff_member?.name && <p className="mt-0.5 truncate text-[9px] text-[#F5C400]">com {appointment.staff_member.name}</p>}
            {appointment.service && <p className="mt-0.5 text-[10px] text-[#737881]">{formatPrice(appointment.service.price)}</p>}
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-medium ${paymentPending ? 'bg-[#F5C400]/15 text-[#F5C400]' : 'bg-[#22C55E]/15 text-[#65D787]'}`}>
              <CircleDollarSign className="h-3 w-3" /> {paymentLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-1 text-[8px] font-medium ${style.badge}`}>{style.label}</span>
            <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`Conversar com ${appointment.client_name}`} className="text-[#22C55E]"><MessageCircle className="h-4 w-4" /></a>
            {onAction && appointment.status === 'confirmed' && (
              <details className="group relative">
                <summary className="grid h-6 w-5 cursor-pointer list-none place-items-center text-[#737881] [&::-webkit-details-marker]:hidden"><MoreVertical className="h-4 w-4" /></summary>
                <div className="absolute right-0 top-6 z-20 w-28 rounded-lg border border-white/10 bg-[#17191C] p-1 shadow-2xl">
                  <button onClick={() => onAction(appointment.id, 'completed')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-[10px] text-[#65D787] hover:bg-white/5"><Check className="h-3.5 w-3.5" /> Concluir</button>
                  <button onClick={() => onAction(appointment.id, 'cancelled')} className="flex w-full items-center gap-2 rounded px-2 py-2 text-[10px] text-[#F87171] hover:bg-white/5"><X className="h-3.5 w-3.5" /> Cancelar</button>
                </div>
              </details>
            )}
          </div>
        </div>
        {paymentPending && onPaymentConfirm && appointment.status !== 'cancelled' && (
          <button
            type="button"
            disabled={paymentLoading}
            onClick={() => onPaymentConfirm(appointment.id)}
            className="mt-2 inline-flex min-h-8 items-center justify-center rounded-md border border-[#F5C400]/60 px-2.5 text-[10px] font-semibold text-[#F5C400] transition hover:bg-[#F5C400]/10 disabled:cursor-wait disabled:opacity-60"
          >
            Confirmar pagamento
          </button>
        )}
      </div>
    </article>
  )
}
