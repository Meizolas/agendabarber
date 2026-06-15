import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  color?: 'amber' | 'green' | 'blue' | 'red'
}

const colorMap = {
  amber: 'bg-[#F4B400]/12 text-[#F4B400]',
  green: 'bg-[#22C55E]/12 text-[#22C55E]',
  blue: 'bg-sky-500/12 text-sky-400',
  red: 'bg-[#EF4444]/12 text-[#EF4444]',
}

export function StatsCard({ title, value, description, icon: Icon, color = 'amber' }: StatsCardProps) {
  return (
    <div className="premium-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="line-clamp-2 text-xs font-medium text-[#9CA3AF] sm:text-sm">{title}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none text-white sm:text-[32px]">{value}</p>
          {description && <p className="mt-1 truncate text-[11px] text-[#6B7280] sm:text-xs">{description}</p>}
        </div>
        <div className={cn('ml-2 rounded-lg p-2.5 sm:p-3', colorMap[color])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  )
}
