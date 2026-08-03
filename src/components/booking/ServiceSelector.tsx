import type { Service } from '@/types'
import { formatDuration, formatPrice } from '@/lib/utils/format'
import { Check, Clock3, Scissors } from 'lucide-react'

interface ServiceSelectorProps {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export function ServiceSelector({ services, selectedId, onSelect }: ServiceSelectorProps) {
  return (
    <div className="space-y-2.5">
      {services.map((service) => {
        const selected = service.id === selectedId
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className={`flex w-full items-stretch overflow-hidden rounded-lg border text-left transition ${selected ? 'border-[#F5C400] bg-[#191A1D] shadow-[0_0_0_1px_rgba(245,196,0,0.12)]' : 'border-white/10 bg-[#17191C] hover:border-white/20'}`}
          >
            {service.image_url ? (
              <img src={service.image_url} alt={service.name} className="h-[86px] w-[88px] shrink-0 object-cover" />
            ) : (
              <span className="grid h-[86px] w-[88px] shrink-0 place-items-center bg-[#101214] text-[#F5C400]"><Scissors className="h-7 w-7" /></span>
            )}
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0">
                <strong className="block truncate text-sm font-medium text-white">{service.name}</strong>
                <span className="mt-1.5 flex items-center gap-1 text-[11px] text-[#A2A6AD]"><Clock3 className="h-3.5 w-3.5" /> {formatDuration(service.duration_minutes)}</span>
                <span className="mt-1 block text-sm font-semibold text-[#F5C400]">{formatPrice(service.price)}</span>
              </span>
              {selected && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F5C400] text-black"><Check className="h-4 w-4 stroke-[3]" /></span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
