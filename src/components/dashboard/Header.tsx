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
    <header className="border-b border-white/10 bg-[#101214]/85 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
      <h1 className="text-[24px] font-semibold text-white">{title}</h1>
      {barber && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white">{barber.barber_name}</p>
            <p className="text-xs text-[#9CA3AF]">{barber.barbershop_name}</p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 bg-[#16181D] text-white hover:bg-white/5" asChild>
            <Link
              href={`${appUrl}/agendar/${barber.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Meu link</span>
            </Link>
          </Button>
        </div>
      )}
    </header>
  )
}
