import { cn } from '@/lib/utils/cn'
import { BrandLogo } from '@/components/premium/BrandLogo'

interface BrandMarkProps {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact, className }: BrandMarkProps) {
  return <BrandLogo compact className={cn(compact && '[&>div]:hidden', className)} />
}
