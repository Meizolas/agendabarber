'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Clock3, Home, SlidersHorizontal, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Início' },
  { href: '/servicos', icon: SlidersHorizontal, label: 'Serviços' },
  { href: '/agendamentos', icon: CalendarDays, label: 'Agenda' },
  { href: '/horarios', icon: Clock3, label: 'Horários' },
  { href: '/perfil', icon: UserRound, label: 'Perfil' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-x border-t border-white/10 bg-[#0B0D0F]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {navItems.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition',
              active ? 'text-[#F5C400]' : 'text-[#858A93] hover:text-white',
            )}
          >
            <item.icon className={cn('h-[19px] w-[19px]', active && 'fill-[#F5C400]/15')} strokeWidth={active ? 2.4 : 1.7} />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
