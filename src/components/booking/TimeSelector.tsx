import { cn } from '@/lib/utils/cn'
import { Clock3 } from 'lucide-react'

interface TimeSelectorProps {
  slots: string[]
  selectedTime: string | null
  onSelect: (time: string) => void
  loading?: boolean
}

export function TimeSelector({ slots, selectedTime, onSelect, loading }: TimeSelectorProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-[#16181D] animate-pulse" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="premium-card p-8 text-center">
        <Clock3 className="mx-auto mb-3 h-9 w-9 text-[#6B7280]" />
        <p className="text-sm text-[#9CA3AF]">Nenhum horário disponível nesta data</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((slot) => {
        const isSelected = slot === selectedTime
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={cn(
              'h-12 rounded-lg border text-sm font-semibold transition',
              isSelected
                ? 'border-[#F4B400] bg-[#F4B400] text-[#08090A] shadow-[0_12px_26px_rgba(244,180,0,0.2)]'
                : 'border-white/10 bg-[#16181D] text-white hover:border-[#F4B400]/50',
            )}
          >
            {slot.substring(0, 5)}
          </button>
        )
      })}
    </div>
  )
}
