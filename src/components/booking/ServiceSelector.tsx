import { Service } from '@/types'
import { formatPrice, formatDuration } from '@/lib/utils/format'
import { Check, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { featuredServices } from '@/lib/premium-data'

interface ServiceSelectorProps {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export function ServiceSelector({ services, selectedId, onSelect }: ServiceSelectorProps) {
  return (
    <div className="space-y-3">
      {services.map((service, index) => {
        const selected = service.id === selectedId
        const visual = featuredServices[index % featuredServices.length]

        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              'flex w-full items-center gap-4 rounded-lg border p-3 text-left transition',
              selected
                ? 'border-[#F4B400] bg-[#F4B400]/10 shadow-[0_0_0_1px_rgba(244,180,0,0.28)]'
                : 'border-white/10 bg-[#16181D] hover:border-[#F4B400]/45',
            )}
          >
            <img src={visual.photo} alt={service.name} className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-white">{service.name}</p>
                {selected && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#F4B400] text-[#08090A]">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-[#9CA3AF]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDuration(service.duration_minutes)}
                </span>
                <span className="font-semibold text-[#F4B400]">{formatPrice(service.price)}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
