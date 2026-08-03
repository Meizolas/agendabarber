import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface BrandLogoProps {
  className?: string
  imageClassName?: string
  compact?: boolean
  priority?: boolean
}

export function BrandLogo({ className, imageClassName, compact = false, priority = false }: BrandLogoProps) {
  return (
    <div className={cn('inline-flex items-center', compact ? 'gap-2.5' : 'flex-col gap-2', className)}>
      <Image
        src="/brand/agendbarber-mark.png"
        alt="Símbolo AgendBarber"
        width={180}
        height={180}
        priority={priority}
        className={cn('h-auto w-16 object-contain', compact && 'w-10', imageClassName)}
      />
      <div className={cn('whitespace-nowrap font-semibold leading-none', compact ? 'text-base' : 'text-lg')}>
        <span className="text-white">Agend</span>
        <span className="text-[#F5C400]">Barber</span>
      </div>
    </div>
  )
}
