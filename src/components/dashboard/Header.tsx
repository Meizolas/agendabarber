import { Barber } from '@/types'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  barber: Barber | null
  title: string
}

export function Header({ barber, title }: HeaderProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#101214]/85 px-4 py-4 pl-16 backdrop-blur-xl sm:px-6 lg:pl-6">
      <div className="min-w-0">
        <p className="hidden text-xs text-[#9CA3AF] sm:block">Painel admin</p>
        <h1 className="truncate text-[21px] font-semibold leading-tight text-white sm:text-[24px]">{title}</h1>
      </div>
      {barber && (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white">{barber.barber_name}</p>
            <p className="text-xs text-[#9CA3AF]">{barber.barbershop_name}</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 border-white/10 bg-[#16181D] px-3 text-white hover:bg-white/5" asChild>
            <Link
              href={`${appUrl}/agendar/${barber.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">Link</span>
            </Link>
          </Button>
        </div>
      )}
    </header>
  )
}
