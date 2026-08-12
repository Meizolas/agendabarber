import type { Appointment, Barber } from '@/types'
import Link from 'next/link'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { BrandLogo } from '@/components/premium/BrandLogo'
import { TourHelpButton } from '@/components/tour/TourHelpButton'

interface HeaderProps {
  barber: Barber | null
  title: string
  subtitle?: string
  notifications?: Appointment[]
}

export function Header({ barber, title, subtitle, notifications }: HeaderProps) {
  const initials = barber?.barber_name
    ?.split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="px-4 pb-3 pt-5">
      <div className="flex h-10 items-center justify-between">
        <BrandLogo compact className="[&>div]:hidden" imageClassName="w-9" priority />
        <div className="flex items-center gap-2.5">
          <TourHelpButton />
          {notifications && <NotificationBell appointments={notifications} />}
          <Link href="/perfil" aria-label="Abrir perfil" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#F5C400]/45 bg-[#16181D] text-[11px] font-semibold text-white">
            {barber?.logo_url ? (
              <img src={barber.logo_url} alt="Logo da barbearia" className="h-full w-full object-cover" />
            ) : (
              initials || 'AB'
            )}
          </Link>
        </div>
      </div>
      <div className="mt-3">
        <h1 className="text-[22px] font-semibold leading-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-[#858A93]">{subtitle}</p>}
      </div>
    </header>
  )
}
