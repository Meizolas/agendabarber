import { AvailabilityRule, Barber, Service } from '@/types'

export const DEMO_CLIENT = {
  email: 'cliente@gmail.com',
  password: 'senha123',
  role: 'client' as const,
}

export const DEMO_ADMIN = {
  email: 'admin@gmail.com',
  password: 'senha123',
  role: 'admin' as const,
}

export type DemoRole = typeof DEMO_CLIENT.role | typeof DEMO_ADMIN.role

export const demoBarber: Barber = {
  id: 'demo-admin',
  user_id: 'demo-admin',
  barbershop_name: 'Barber House',
  barber_name: 'Admin Barber',
  whatsapp: '11999999999',
  slug: 'demo',
  logo_url: null,
  created_at: '',
  updated_at: '',
}

export const demoServices: Service[] = [
  {
    id: 'demo-service-1',
    barber_id: demoBarber.id,
    name: 'Corte + Barba',
    image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85',
    price: 80,
    duration_minutes: 60,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'demo-service-2',
    barber_id: demoBarber.id,
    name: 'Degradê premium',
    image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85',
    price: 60,
    duration_minutes: 45,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

export const demoRules: AvailabilityRule[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  id: `demo-rule-${day}`,
  barber_id: demoBarber.id,
  day_of_week: day,
  start_time: '09:00:00',
  end_time: '18:00:00',
  interval_minutes: 30,
  is_active: true,
  created_at: '',
}))

export function isDemoCredential(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail === DEMO_CLIENT.email && password === DEMO_CLIENT.password) {
    return DEMO_CLIENT.role
  }

  if (normalizedEmail === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
    return DEMO_ADMIN.role
  }

  return null
}
