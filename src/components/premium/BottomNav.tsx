'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Heart, Home, Plus, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const items = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/cliente/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/cliente/servicos', label: 'Agendar', icon: Plus, primary: true },
  { href: '/cliente/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/cliente/perfil', label: 'Perfil', icon: UserRound },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-4 pb-4">
      <div className="grid grid-cols-5 items-center rounded-[22px] border border-white/10 bg-[#101214]/92 px-2 py-2 shadow-[0_-18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-[#9CA3AF] transition',
                active && 'text-[#F4B400]',
                item.primary && 'text-[#08090A]',
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-lg',
                  item.primary
                    ? 'bg-[#F4B400] text-[#08090A] shadow-[0_10px_26px_rgba(244,180,0,0.28)]'
                    : active
                      ? 'bg-[#F4B400]/12 text-[#F4B400]'
                      : 'text-[#9CA3AF]',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className={cn(item.primary && 'text-[#F4B400]')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
