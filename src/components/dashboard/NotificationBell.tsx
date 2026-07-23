'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, CalendarDays } from 'lucide-react'
import type { Appointment } from '@/types'
import { formatDateShort, formatPrice, formatTime } from '@/lib/utils/format'

interface NotificationBellProps {
  appointments: Appointment[]
}

export function NotificationBell({ appointments }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tailLeft, setTailLeft] = useState<number | null>(null)
  const [panelPosition, setPanelPosition] = useState({ top: 80, left: 16, right: 16 })
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 36, height: 36 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const count = appointments.length

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const updateTailPosition = () => {
      const button = buttonRef.current
      if (!button) return

      const buttonRect = button.getBoundingClientRect()
      setButtonPosition({
        top: buttonRect.top,
        left: buttonRect.left,
        width: buttonRect.width,
        height: buttonRect.height,
      })
      const isDesktop = window.innerWidth >= 640
      const panelWidth = isDesktop ? 320 : window.innerWidth - 32
      const panelLeft = isDesktop
        ? Math.max(16, Math.min(window.innerWidth - panelWidth - 16, buttonRect.right - panelWidth))
        : 16
      const panelRight = isDesktop ? window.innerWidth - panelLeft - panelWidth : 16
      const panelTop = buttonRect.bottom + 12

      setPanelPosition({ top: panelTop, left: panelLeft, right: panelRight })

      const buttonCenter = buttonRect.left + buttonRect.width / 2
      const nextTailLeft = buttonCenter - panelLeft
      setTailLeft(Math.max(18, Math.min(panelWidth - 18, nextTailLeft)))
    }

    updateTailPosition()
    window.addEventListener('resize', updateTailPosition)
    window.addEventListener('scroll', updateTailPosition, true)

    return () => {
      window.removeEventListener('resize', updateTailPosition)
      window.removeEventListener('scroll', updateTailPosition, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-[#16181D] text-white transition hover:bg-white/5 ${open ? 'opacity-0' : ''}`}
        aria-label="Ver proximos agendamentos"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#F4B400] px-1 text-[10px] font-bold text-black">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {mounted && open && createPortal(
        <>
          <button
            type="button"
            aria-label="Fechar notificacoes"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[3px]"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed z-[120] grid place-items-center rounded-md border border-white/10 bg-[#16181D] text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            style={{
              top: buttonPosition.top,
              left: buttonPosition.left,
              width: buttonPosition.width,
              height: buttonPosition.height,
            }}
            aria-label="Fechar notificacoes"
          >
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#F4B400] px-1 text-[10px] font-bold text-black">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
          <div
            ref={panelRef}
            className="fixed z-[110]"
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              right: panelPosition.right,
            }}
          >
            <span
              className="absolute -top-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-[#101214]"
              style={{ left: tailLeft ?? '50%' }}
            />
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101214] shadow-[0_22px_70px_rgba(0,0,0,0.55)]">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">Proximos agendamentos</p>
                <p className="text-xs text-[#9CA3AF]">Preview dos proximos 7 dias</p>
              </div>

              {appointments.length === 0 ? (
                <div className="grid gap-2 px-4 py-6 text-center text-sm text-[#9CA3AF]">
                  <CalendarDays className="mx-auto h-6 w-6 text-[#F4B400]" />
                  <span>Nenhum agendamento futuro.</span>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto py-2">
                  {appointments.map((appointment) => (
                    <Link
                      key={appointment.id}
                      href={`/agendamentos?date=${appointment.appointment_date}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{appointment.client_name}</p>
                          <p className="truncate text-xs text-[#9CA3AF]">{appointment.service?.name ?? 'Servico'}</p>
                          <p className="mt-1 text-xs text-[#F4B400]">
                            {formatDateShort(appointment.appointment_date)} as {formatTime(appointment.appointment_time)}
                          </p>
                        </div>
                        {appointment.service && (
                          <span className="shrink-0 text-xs font-semibold text-white">
                            {formatPrice(appointment.service.price)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
