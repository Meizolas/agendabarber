import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BrandLogo } from '@/components/premium/BrandLogo'
import { cn } from '@/lib/utils/cn'

interface AuthShellProps {
  children: React.ReactNode
  backHref?: string
  brand?: boolean
  className?: string
}

export function AuthShell({ children, backHref, brand = true, className }: AuthShellProps) {
  return (
    <section className={cn('auth-surface relative flex min-h-[calc(100dvh-2rem)] flex-1 flex-col overflow-hidden rounded-[32px] border border-white/[0.09] bg-[#08090B] px-5 pb-7 pt-5 shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:px-6', className)}>
      {backHref && (
        <Link
          href={backHref}
          aria-label="Voltar"
          className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white transition hover:border-[#F5C400]/50 hover:text-[#F5C400]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {brand && (
        <BrandLogo
          priority
          className={cn('relative z-10 mx-auto', backHref ? '-mt-8' : 'mt-10')}
          imageClassName="w-[78px] drop-shadow-[0_0_18px_rgba(245,196,0,0.12)]"
        />
      )}

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </section>
  )
}
