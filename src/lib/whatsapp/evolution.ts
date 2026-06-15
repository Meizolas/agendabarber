import { sanitizeWhatsApp, formatDate, formatTime } from '@/lib/utils/format'
import { createServiceClient } from '@/lib/supabase/server'

interface SendMessageParams {
  phone: string
  message: string
}

interface WhatsAppResponse {
  success: boolean
  error?: string
}

async function sendWhatsAppMessage({ phone, message }: SendMessageParams): Promise<WhatsAppResponse> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!apiUrl || !apiKey || !instance) {
    console.warn('[WhatsApp] Variáveis de ambiente da Evolution API não configuradas.')
    return { success: false, error: 'Evolution API não configurada' }
  }

  const cleanPhone = sanitizeWhatsApp(phone)

  try {
    const response = await fetch(
      `${apiUrl}/message/sendText/${instance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: cleanPhone,
          textMessage: { text: message },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Erro desconhecido'
    return { success: false, error }
  }
}

interface AppointmentNotificationParams {
  appointmentId: string
  clientName: string
  clientWhatsapp: string
  barberWhatsapp: string
  barbershopName: string
  serviceName: string
  appointmentDate: string // "YYYY-MM-DD"
  appointmentTime: string // "HH:MM"
  notes?: string | null
}

export async function sendAppointmentNotifications(
  params: AppointmentNotificationParams,
): Promise<void> {
  const {
    appointmentId,
    clientName,
    clientWhatsapp,
    barberWhatsapp,
    barbershopName,
    serviceName,
    appointmentDate,
    appointmentTime,
    notes,
  } = params

  const dateFormatted = formatDate(appointmentDate)
  const timeFormatted = formatTime(appointmentTime)

  const clientMessage =
    `Olá, ${clientName}! Seu agendamento foi confirmado na ${barbershopName}. ` +
    `Serviço: ${serviceName}. Data: ${dateFormatted}. Horário: ${timeFormatted}.`

  const barberMessage =
    `Novo agendamento recebido! ` +
    `Cliente: ${clientName}. WhatsApp: ${clientWhatsapp}. ` +
    `Serviço: ${serviceName}. Data: ${dateFormatted}. Horário: ${timeFormatted}. ` +
    `Observação: ${notes || 'Nenhuma'}.`

  const supabase = createServiceClient()

  // Enviar para cliente
  const clientResult = await sendWhatsAppMessage({
    phone: clientWhatsapp,
    message: clientMessage,
  })

  await supabase.from('whatsapp_logs').insert({
    appointment_id: appointmentId,
    recipient_type: 'client',
    phone_number: sanitizeWhatsApp(clientWhatsapp),
    message: clientMessage,
    status: clientResult.success ? 'sent' : 'failed',
    error_message: clientResult.error ?? null,
  })

  // Enviar para barbeiro
  const barberResult = await sendWhatsAppMessage({
    phone: barberWhatsapp,
    message: barberMessage,
  })

  await supabase.from('whatsapp_logs').insert({
    appointment_id: appointmentId,
    recipient_type: 'barber',
    phone_number: sanitizeWhatsApp(barberWhatsapp),
    message: barberMessage,
    status: barberResult.success ? 'sent' : 'failed',
    error_message: barberResult.error ?? null,
  })
}
