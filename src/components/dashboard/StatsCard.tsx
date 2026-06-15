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
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#9CA3AF]">{title}</p>
          <p className="mt-1 text-[32px] font-semibold text-white">{value}</p>
          {description && <p className="mt-1 text-xs text-[#6B7280]">{description}</p>}
        </div>
        <div className={cn('rounded-lg p-3', colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
