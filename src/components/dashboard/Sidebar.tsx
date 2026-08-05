'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
  const router = useRouter()
  const plansPage = pathname.startsWith('/assinatura')

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href))
    router.prefetch('/assinatura')
  }, [router])

  return (
    <nav className={cn(
      'fixed left-1/2 z-50 grid -translate-x-1/2 grid-cols-5 bg-[#0B0D0F]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl',
      plansPage
        ? 'bottom-1 w-[calc(100%-12px)] max-w-[418px] rounded-[30px] border border-white/15 shadow-[0_-8px_30px_rgba(0,0,0,.65)]'
        : 'bottom-0 w-full max-w-[430px] border-x border-t border-white/10 shadow-[0_-12px_35px_rgba(0,0,0,0.5)]',
    )}>
      {navItems.map((item) => {
        const active = pathname === item.href || (plansPage && item.href === '/dashboard')
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
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
