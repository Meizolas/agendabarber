'use client'

import { useState } from 'react'
import { addDays, addMonths, format, getDay, isBefore, isSameMonth, startOfMonth, startOfToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DateSelectorProps {
  availableDays: number[]
  selectedDate: string | null
  onSelect: (date: string) => void
}

export function DateSelector({ availableDays, selectedDate, onSelect }: DateSelectorProps) {
  const [monthOffset, setMonthOffset] = useState(0)
  const today = startOfToday()
  const month = addMonths(startOfMonth(today), monthOffset)
  const gridStart = startOfWeek(month, { weekStartsOn: 0 })
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}
          disabled={monthOffset === 0}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-[#101214] text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-[18px] font-semibold capitalize text-white">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={() => setMonthOffset((value) => value + 1)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-[#101214] text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#6B7280]">
        {weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isAvailable = availableDays.includes(getDay(day)) && !isBefore(day, today) && isSameMonth(day, month)
          const isSelected = dateStr === selectedDate

          return (
            <button
              key={dateStr}
              disabled={!isAvailable}
              onClick={() => onSelect(dateStr)}
              className={cn(
                'aspect-square rounded-full text-sm font-semibold transition',
                isSelected && 'bg-[#F4B400] text-[#08090A] shadow-[0_10px_24px_rgba(244,180,0,0.24)]',
                !isSelected && isAvailable && 'bg-[#16181D] text-white hover:bg-[#FFCC33] hover:text-[#08090A]',
                !isAvailable && 'text-[#3F444C]',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
