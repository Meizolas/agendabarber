export interface FinancialAppointment {
  appointment_date: string
  status: 'confirmed' | 'cancelled' | 'completed'
  payment_status?: 'pending_confirmation' | 'paid'
  service?: { price: number } | Array<{ price: number }> | null
}

export interface DailyRevenue {
  date: string
  amount: number
}

export interface FinancialSummary {
  monthRevenue: number
  previousMonthRevenue: number
  todayRevenue: number
  receivable: number
  comparisonPercent: number | null
  lastSevenDays: DailyRevenue[]
}

export function monthBounds(date: string) {
  const [year, month] = date.split('-').map(Number)
  const currentStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonthDate = new Date(Date.UTC(year, month, 1, 12))
  const nextStart = nextMonthDate.toISOString().slice(0, 10)
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1, 12))
  const previousStart = previousMonthDate.toISOString().slice(0, 10)
  return { currentStart, nextStart, previousStart }
}

function addDateDays(date: string, amount: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount, 12)).toISOString().slice(0, 10)
}

function servicePrice(appointment: FinancialAppointment) {
  const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service
  return Number(service?.price ?? 0)
}

function isReceived(appointment: FinancialAppointment) {
  return appointment.status === 'completed' && appointment.payment_status === 'paid'
}

export function calculateFinancialSummary({
  appointments,
  pendingAppointments,
  today,
}: {
  appointments: FinancialAppointment[]
  pendingAppointments: FinancialAppointment[]
  today: string
}): FinancialSummary {
  const { currentStart, nextStart, previousStart } = monthBounds(today)
  const received = appointments.filter(isReceived)
  const sum = (items: FinancialAppointment[]) => items.reduce((total, item) => total + servicePrice(item), 0)
  const monthRevenue = sum(received.filter((item) => item.appointment_date >= currentStart && item.appointment_date < nextStart))
  const previousMonthRevenue = sum(received.filter((item) => item.appointment_date >= previousStart && item.appointment_date < currentStart))
  const todayRevenue = sum(received.filter((item) => item.appointment_date === today))
  const receivable = sum(pendingAppointments.filter((item) =>
    (item.status === 'confirmed' || item.status === 'completed')
    && item.payment_status !== 'paid',
  ))
  const comparisonPercent = previousMonthRevenue > 0
    ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : null
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDateDays(today, index - 6)
    return {
      date,
      amount: sum(received.filter((item) => item.appointment_date === date)),
    }
  })

  return {
    monthRevenue,
    previousMonthRevenue,
    todayRevenue,
    receivable,
    comparisonPercent,
    lastSevenDays,
  }
}
