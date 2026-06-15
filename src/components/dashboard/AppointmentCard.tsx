import { Appointment, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatTime, formatWhatsApp, formatPrice } from '@/lib/utils/format'
import { Clock, User, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AppointmentCardProps {
  appointment: Appointment
  onAction?: (id: string, status: 'cancelled' | 'completed') => void
}

export function AppointmentCard({ appointment, onAction }: AppointmentCardProps) {
  const { service, status } = appointment

  return (
    <div className="premium-card p-4 transition hover:border-[#F4B400]/35">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-[#F4B400]" />
            <span className="font-semibold text-white">{formatTime(appointment.appointment_time)}</span>
            {service && (
              <>
                <span className="text-[#3F444C]">·</span>
                <span className="truncate text-sm text-[#9CA3AF]">{service.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{appointment.client_name}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-sm text-[#9CA3AF]">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{formatWhatsApp(appointment.client_whatsapp)}</span>
          </div>

          {appointment.notes && (
            <p className="mt-2 line-clamp-2 text-xs italic text-[#6B7280]">
              &quot;{appointment.notes}&quot;
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              STATUS_COLORS[status],
            )}
          >
            {STATUS_LABELS[status]}
          </span>
          {service && <span className="text-sm font-medium text-white">{formatPrice(service.price)}</span>}
        </div>
      </div>

      {onAction && status === 'confirmed' && (
        <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() => onAction(appointment.id, 'completed')}
            className="flex-1 rounded border border-[#22C55E]/25 py-1.5 text-xs font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/10"
          >
            Concluir
          </button>
          <button
            onClick={() => onAction(appointment.id, 'cancelled')}
            className="flex-1 rounded border border-[#EF4444]/25 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
