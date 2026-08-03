'use client'

import { useState } from 'react'
import { addDays, addMonths, differenceInCalendarMonths, format, getDay, isBefore, isSameMonth, startOfMonth, startOfToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  const available = (day: Date) => availableDays.includes(getDay(day)) && !isBefore(day, today)

  const choose = (day: Date) => {
    if (!available(day)) return
    setMonthOffset(differenceInCalendarMonths(startOfMonth(day), startOfMonth(today)))
    onSelect(format(day, 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-[#15171A] p-3">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setMonthOffset((value) => Math.max(0, value - 1))} disabled={monthOffset === 0} className="grid h-8 w-8 place-items-center text-[#D7DADE] disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold capitalize text-white">{format(month, 'MMMM yyyy', { locale: ptBR })}</span>
          <button type="button" onClick={() => setMonthOffset((value) => value + 1)} className="grid h-8 w-8 place-items-center text-[#D7DADE]"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase text-[#858A93]">
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const value = format(day, 'yyyy-MM-dd')
            const enabled = available(day) && isSameMonth(day, month)
            const selected = value === selectedDate
            return (
              <button key={value} type="button" disabled={!enabled} onClick={() => choose(day)} className={`aspect-square rounded-full text-[11px] font-medium transition ${selected ? 'bg-[#F5C400] text-black shadow-[0_5px_16px_rgba(245,196,0,0.28)]' : enabled ? 'text-[#D7DADE] hover:bg-white/5' : 'text-[#4B4F55]'}`}>{format(day, 'dd')}</button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[['Hoje', today], ['Amanhã', addDays(today, 1)], [format(addDays(today, 2), 'EEE dd', { locale: ptBR }), addDays(today, 2)]].map(([label, day]) => {
          const date = day as Date
          const enabled = available(date)
          return <button key={String(label)} type="button" disabled={!enabled} onClick={() => choose(date)} className="rounded-lg border border-white/10 bg-[#15171A] px-1 py-2 text-center disabled:opacity-35"><span className="flex items-center justify-center gap-1 text-[10px] font-medium capitalize text-white"><CalendarDays className="h-3.5 w-3.5 text-[#A2A6AD]" />{String(label)}</span><span className="mt-1 block text-[9px] text-[#858A93]">{format(date, 'dd MMM', { locale: ptBR })}</span></button>
        })}
      </div>
    </div>
  )
}
