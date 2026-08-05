'use client'

import { useEffect, useRef, useState } from 'react'
import type { Service } from '@/types'
import { formatDuration, formatPrice } from '@/lib/utils/format'
import { Clock3, ImageIcon, MoreVertical, Pencil, Scissors, Trash2 } from 'lucide-react'

interface ServiceCardProps {
  service: Service
  onEdit: (service: Service) => void
  onDelete: (service: Service) => void
  onToggle?: (service: Service) => void
}

export function ServiceCard({ service, onEdit, onDelete, onToggle }: ServiceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [menuOpen])

  return (
    <article className="dashboard-card flex min-h-[86px] items-center gap-3 p-2.5">
      {service.image_url ? (
        <img src={service.image_url} alt={service.name} loading="lazy" decoding="async" className="h-[68px] w-[68px] shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-md border border-white/10 bg-[#101214] text-[#F5C400]">
          <div className="grid place-items-center gap-1"><Scissors className="h-5 w-5" /><ImageIcon className="h-3 w-3 text-[#737881]" /></div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{service.name}</p>
        <p className="mt-1 text-[11px] text-[#A2A6AD]">{formatPrice(service.price)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#737881]"><Clock3 className="h-3 w-3" /> {formatDuration(service.duration_minutes)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          role="switch"
          aria-checked={service.is_active}
          aria-label={`${service.is_active ? 'Desativar' : 'Ativar'} ${service.name}`}
          onClick={() => onToggle?.(service)}
          className={`relative h-6 w-10 rounded-full border transition ${service.is_active ? 'border-[#F5C400] bg-[#F5C400]' : 'border-white/15 bg-[#3D4147]'}`}
        >
          <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition ${service.is_active ? 'left-[18px]' : 'left-0.5'}`} />
        </button>

        <div ref={menuRef} className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={`Acoes de ${service.name}`} className="grid h-8 w-7 place-items-center text-[#A2A6AD]"><MoreVertical className="h-5 w-5" /></button>
          {menuOpen && <div className="absolute right-0 top-8 z-20 w-28 overflow-hidden rounded-lg border border-white/10 bg-[#17191C] p-1 shadow-2xl">
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(service) }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs text-white hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /> Editar</button>
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(service) }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs text-[#F87171] hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
          </div>
          }
        </div>
      </div>
    </article>
  )
}
