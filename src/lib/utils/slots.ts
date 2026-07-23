import { addMinutes, format, isAfter, parse } from 'date-fns'

export interface OccupiedInterval {
  start: string
  durationMinutes: number
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  durationMinutes: number,
  occupiedIntervals: OccupiedInterval[],
  blockedTimes: string[],
): string[] {
  const slots: string[] = []
  const baseDate = new Date(2000, 0, 1)
  let current = parse(startTime, 'HH:mm', baseDate)
  const end = parse(endTime, 'HH:mm', baseDate)
  const lastPossibleStart = addMinutes(end, -durationMinutes)

  while (!isAfter(current, lastPossibleStart)) {
    const slotStr = format(current, 'HH:mm')
    const slotEnd = addMinutes(current, durationMinutes)
    const isBooked = occupiedIntervals.some((occupied) => {
      const occupiedStart = parse(occupied.start, 'HH:mm', baseDate)
      const occupiedEnd = addMinutes(occupiedStart, occupied.durationMinutes)
      return current < occupiedEnd && slotEnd > occupiedStart
    })

    if (!isBooked && !blockedTimes.includes(slotStr)) slots.push(slotStr)
    current = addMinutes(current, intervalMinutes)
  }

  return slots
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`
}
