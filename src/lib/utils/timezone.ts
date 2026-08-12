const TIME_ZONE = 'America/Sao_Paulo'

export function getSaoPauloParts(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    parts[part.type] = part.value
    return parts
  }, {})
}

export function getSaoPauloDate(date = new Date()) {
  const parts = getSaoPauloParts(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function addCalendarDays(date: string, amount: number) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + amount, 12))
  return value.toISOString().slice(0, 10)
}

export function calendarDaysBetween(fromDate: string, toDate: string) {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number)
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const to = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((to - from) / 86_400_000)
}

export function getSaoPauloDayAndMinutes(date = new Date()) {
  const parts = getSaoPauloParts(date)
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { day: weekdays[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}
