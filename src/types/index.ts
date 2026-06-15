export interface Barber {
  id: string
  user_id: string
  barbershop_name: string
  barber_name: string
  whatsapp: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  barber_id: string
  name: string
  price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilityRule {
  id: string
  barber_id: string
  day_of_week: number
  start_time: string
  end_time: string
  interval_minutes: number
  is_active: boolean
  created_at: string
}

export interface BlockedTime {
  id: string
  barber_id: string
  blocked_date: string
  blocked_time: string | null
  reason: string | null
  created_at: string
}

export interface Appointment {
  id: string
  barber_id: string
  service_id: string
  client_name: string
  client_whatsapp: string
  appointment_date: string
  appointment_time: string
  notes: string | null
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
  service?: Service
  barber?: Barber
}

export interface WhatsAppLog {
  id: string
  appointment_id: string | null
  recipient_type: 'client' | 'barber'
  phone_number: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  created_at: string
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terca-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sabado',
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluido',
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  confirmed: 'bg-[#22C55E]/12 text-[#22C55E]',
  cancelled: 'bg-[#EF4444]/12 text-[#EF4444]',
  completed: 'bg-sky-500/12 text-sky-400',
}
