import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDateShort, formatTime } from '@/lib/utils/format'

type PushAppointment = {
  id: string
  barber_id: string
  client_name: string
  appointment_date: string
  appointment_time: string
  service?: { name: string } | null
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function notifyNewAppointment(appointment: PushAppointment) {
  if (!configureWebPush()) return
  const admin = createServiceClient()
  const { data: devices } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('barber_id', appointment.barber_id).eq('is_active', true)
  if (!devices?.length) return
  const payload = JSON.stringify({
    title: 'Novo agendamento!',
    body: `${appointment.client_name} agendou ${appointment.service?.name ?? 'um servico'} para ${formatDateShort(appointment.appointment_date)} as ${formatTime(appointment.appointment_time)}.`,
    url: `/agendamentos?date=${appointment.appointment_date}`,
    tag: `appointment-${appointment.id}`,
  })
  await Promise.allSettled(devices.map(async (device) => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, { TTL: 3600 })
      await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', device.id)
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0
      await admin.from('push_subscriptions').update({ is_active: ![404, 410].includes(statusCode), last_failure_at: new Date().toISOString() }).eq('id', device.id)
    }
  }))
}
