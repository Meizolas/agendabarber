import type { Appointment } from '@/types'

export function isSpecialAppointment(appointment: Pick<Appointment, 'client_name' | 'client_whatsapp'>): boolean {
  const name = appointment.client_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
  let phone = appointment.client_whatsapp.replace(/\D/g, '')
  if (phone.length === 13 && phone.startsWith('55')) phone = phone.slice(2)
  return name === 'helio nunes' && phone === '77988197912'
}
