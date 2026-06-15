import { addMinutes, format, parse, isBefore, isAfter } from 'date-fns'

/**
 * Gera lista de horários disponíveis para uma data específica,
 * considerando regras de disponibilidade, horários bloqueados e agendamentos existentes.
 */
export function generateTimeSlots(
  startTime: string, // "HH:MM"
  endTime: string,   // "HH:MM"
  intervalMinutes: number,
  durationMinutes: number,
  bookedTimes: string[],     // ["HH:MM", ...]
  blockedTimes: string[],    // ["HH:MM", ...] - horários específicos bloqueados
): string[] {
  const slots: string[] = []
  const baseDate = new Date(2000, 0, 1) // data fictícia para parsing

  let current = parse(startTime, 'HH:mm', baseDate)
  const end = parse(endTime, 'HH:mm', baseDate)

  // O último slot possível deve terminar antes ou no horário final
  const lastPossibleStart = addMinutes(end, -durationMinutes)

  while (!isAfter(current, lastPossibleStart)) {
    const slotStr = format(current, 'HH:mm')
    const slotEnd = addMinutes(current, durationMinutes)

    // Verificar se o slot não conflita com horários ocupados
    const isBooked = bookedTimes.some((booked) => {
      const bookedTime = parse(booked, 'HH:mm', baseDate)
      // Conflita se o horário agendado está dentro da janela do slot
      return !isBefore(bookedTime, current) && isBefore(bookedTime, slotEnd)
    })

    // Verificar se está na lista de bloqueados
    const isBlocked = blockedTimes.includes(slotStr)

    if (!isBooked && !isBlocked) {
      slots.push(slotStr)
    }

    current = addMinutes(current, intervalMinutes)
  }

  return slots
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
