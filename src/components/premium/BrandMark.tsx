import { Scissors } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BrandMarkProps {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact, className }: BrandMarkProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <div className="grid h-11 w-11 place-items-center rounded-lg border border-[#F4B400]/35 bg-[#F4B400]/10 text-[#F4B400] shadow-[0_0_32px_rgba(244,180,0,0.18)]">
        <Scissors className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Barber</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#F4B400]">House</p>
        </div>
      )}
    </div>
  )
}
