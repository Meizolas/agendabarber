export interface Barber {
  id: string
  user_id: string
  barbershop_name: string
  barber_name: string
  whatsapp: string
  slug: string
  logo_url: string | null
  pix_key?: string | null
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null
  trial_started_at?: string | null
  trial_ends_at?: string | null
  trial_plan_code?: 'solo' | 'team' | 'studio' | null
  trial_converted_at?: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  barber_id: string
  name: string
  price: number
  duration_minutes: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  barber_id: string
  name: string
  whatsapp: string | null
  photo_url: string | null
  is_owner: boolean
  is_active: boolean
  display_order: number
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
  lunch_start_time?: string | null
  lunch_end_time?: string | null
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
  staff_member_id?: string | null
  client_name: string
  client_whatsapp: string
  appointment_date: string
  appointment_time: string
  notes: string | null
  status: 'confirmed' | 'cancelled' | 'completed'
  payment_method?: 'pix' | 'at_barbershop'
  payment_status?: 'pending_confirmation' | 'paid'
  payment_confirmed_at?: string | null
  created_at: string
  updated_at: string
  service?: Service
  barber?: Barber
  staff_member?: StaffMember
  calendar_token?: { public_token: string } | Array<{ public_token: string }> | null
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
export type AppointmentPaymentMethod = 'pix' | 'at_barbershop'
export type AppointmentPaymentStatus = 'pending_confirmation' | 'paid'
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
