'use client'

import { useEffect, useRef } from 'react'
import type { Appointment } from '@/types'
import { isSpecialAppointment } from '@/lib/appointments/special'
import { playSpecialSound, prepareSpecialSound } from '@/lib/appointments/special-sound'
import { useToast } from '@/components/ui/use-toast'
import { formatDateShort, formatTime } from '@/lib/utils/format'

export function SpecialAppointmentAlerts({ appointments, barberId }: { appointments: Appointment[]; barberId: string | undefined }) {
  const mountedAt = useRef(0)
  const known = useRef(new Set<string>())
  const scope = useRef<string | undefined>(undefined)
  const { toast } = useToast()

  useEffect(() => {
    mountedAt.current = Date.now()
    const prepare = () => { void prepareSpecialSound().catch(() => {}) }
    window.addEventListener('pointerup', prepare, true)
    window.addEventListener('keydown', prepare, true)
    if (navigator.userActivation?.hasBeenActive) prepare()
    return () => {
      window.removeEventListener('pointerup', prepare, true)
      window.removeEventListener('keydown', prepare, true)
    }
  }, [])

  useEffect(() => {
    if (!barberId) return
    const key = `agendbarber_special_seen:${barberId}`
    if (scope.current !== barberId) {
      scope.current = barberId
      known.current = new Set()
      try {
        const saved: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? '[]')
        if (Array.isArray(saved)) known.current = new Set(saved.filter((id): id is string => typeof id === 'string'))
      } catch { /* O aviso também funciona sem armazenamento. */ }
    }
    const special = appointments.filter((item) => item.status === 'confirmed' && isSpecialAppointment(item))
    const arrivals = special.filter((item) => !known.current.has(item.id) && Date.parse(item.created_at) > mountedAt.current)
    for (const item of special) known.current.add(item.id)
    try { window.sessionStorage.setItem(key, JSON.stringify([...known.current].slice(-200))) } catch { /* Sem armazenamento, a deduplicação permanece em memória. */ }
    if (!arrivals.length) return
    const latest = arrivals[arrivals.length - 1]
    toast({ title: '✨ Hélio Nunes está chegando!', description: `Visita especial em ${formatDateShort(latest.appointment_date)}, às ${formatTime(latest.appointment_time)}.` })
    if (document.visibilityState === 'visible') void playSpecialSound().catch(() => {})
  }, [appointments, barberId, toast])

  return null
}
