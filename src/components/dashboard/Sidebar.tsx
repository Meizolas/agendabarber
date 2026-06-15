'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, Clock, Home, LogOut, Menu, Scissors, User, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/servicos', icon: Scissors, label: 'Serviços' },
  { href: '/horarios', icon: Clock, label: 'Horários' },
  { href: '/agendamentos', icon: CalendarCheck, label: 'Agendamentos' },
  { href: '/perfil', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-white/10 bg-[#101214] p-2 text-white shadow-md lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full w-64 border-r border-white/10 bg-[#08090A] text-white flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="rounded-lg border border-[#F4B400]/30 bg-[#F4B400]/10 p-2">
            <Scissors className="h-5 w-5 text-[#F4B400]" />
          </div>
          <span className="text-lg font-bold">AgendBarber</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#F4B400] text-[#08090A]'
                    : 'text-[#9CA3AF] hover:bg-[#16181D] hover:text-white',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <Separator className="mb-4 bg-white/10" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[#9CA3AF] hover:bg-[#16181D] hover:text-white"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
