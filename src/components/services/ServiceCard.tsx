'use client'

import { Service } from '@/types'
import { formatPrice, formatDuration } from '@/lib/utils/format'
import { Pencil, Trash2, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ServiceCardProps {
  service: Service
  onEdit: (service: Service) => void
  onDelete: (service: Service) => void
}

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  return (
    <div className="premium-card p-5 transition hover:border-[#F4B400]/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="truncate font-semibold text-white">{service.name}</h3>
            {!service.is_active && <Badge variant="secondary" className="shrink-0 text-xs">Inativo</Badge>}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-[#F4B400]">
              <DollarSign className="h-4 w-4" />
              {formatPrice(service.price)}
            </span>
            <span className="flex items-center gap-1.5 text-[#9CA3AF]">
              <Clock className="h-4 w-4" />
              {formatDuration(service.duration_minutes)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#9CA3AF] hover:text-[#F4B400]"
            onClick={() => onEdit(service)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#9CA3AF] hover:text-[#EF4444]"
            onClick={() => onDelete(service)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
