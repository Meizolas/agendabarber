import { sanitizeWhatsApp, formatDate, formatTime, formatPrice, formatWhatsApp } from '@/lib/utils/format'
import { createServiceClient } from '@/lib/supabase/server'

interface SendMessageParams {
  phone: string
  message: string
}

interface WhatsAppResponse {
  success: boolean
  error?: string
}

function getEvolutionBaseUrl() {
  return (process.env.EVOLUTION_API_URL ?? '')
    .replace(/\/+$/, '')
    .replace(/\/manager$/i, '')
}

async function sendWhatsAppMessage({ phone, message }: SendMessageParams): Promise<WhatsAppResponse> {
  const apiUrl = getEvolutionBaseUrl()
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!apiUrl || !apiKey || !instance) {
    console.warn('[WhatsApp] Variaveis de ambiente da Evolution API nao configuradas.')
    return { success: false, error: 'Evolution API nao configurada' }
  }

  const cleanPhone = sanitizeWhatsApp(phone)
  const endpoint = `${apiUrl}/message/sendText/${instance}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: cleanPhone,
        textMessage: { text: message },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const error = `HTTP ${response.status} em ${endpoint}: ${errorText}`
      console.error('[WhatsApp] Evolution API error:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[WhatsApp] Evolution API request failed:', error)
    return { success: false, error }
  }
}

interface AppointmentNotificationParams {
  appointmentId: string
  clientName: string
  clientWhatsapp: string
  barberWhatsapp: string
  barberName: string
  barbershopName: string
  serviceName: string
  servicePrice: number
  appointmentDate: string
  appointmentTime: string
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
    barberName,
    barbershopName,
    serviceName,
    servicePrice,
    appointmentDate,
    appointmentTime,
    notes,
  } = params

  const dateFormatted = formatDate(appointmentDate)
  const timeFormatted = formatTime(appointmentTime)
  const priceFormatted = formatPrice(servicePrice)
  const notesText = notes?.trim() ? notes.trim() : 'Nenhuma observacao.'

  const clientMessage = [
    `Ola, ${clientName}! Seu agendamento foi confirmado na ${barbershopName}.`,
    '',
    `Servico: ${serviceName}`,
    `Valor a pagar: ${priceFormatted}`,
    `Data: ${dateFormatted}`,
    `Horario: ${timeFormatted}`,
    '',
    'Obrigado pelo agendamento. Te esperamos no horario combinado.',
  ].join('\n')

  const barberMessage = [
    `Novo agendamento para ${barbershopName}.`,
    '',
    `Barbeiro: ${barberName}`,
    `Cliente: ${clientName}`,
    `WhatsApp do cliente: ${formatWhatsApp(clientWhatsapp)}`,
    `Servico: ${serviceName}`,
    `Valor: ${priceFormatted}`,
    `Data: ${dateFormatted}`,
    `Horario: ${timeFormatted}`,
    `Observacao: ${notesText}`,
  ].join('\n')

  const supabase = createServiceClient()

  const clientResult = await sendWhatsAppMessage({
    phone: clientWhatsapp,
    message: clientMessage,
  })

  await logWhatsApp({
    appointmentId,
    recipientType: 'client',
    phone: clientWhatsapp,
    message: clientMessage,
    result: clientResult,
    supabase,
  })

  const barberResult = await sendWhatsAppMessage({
    phone: barberWhatsapp,
    message: barberMessage,
  })

  await logWhatsApp({
    appointmentId,
    recipientType: 'barber',
    phone: barberWhatsapp,
    message: barberMessage,
    result: barberResult,
    supabase,
  })

  const failures = [
    !clientResult.success ? `cliente: ${clientResult.error}` : null,
    !barberResult.success ? `barbeiro: ${barberResult.error}` : null,
  ].filter(Boolean)

  if (failures.length > 0) {
    throw new Error(`Falha ao enviar WhatsApp (${failures.join(' | ')})`)
  }
}

async function logWhatsApp({
  appointmentId,
  recipientType,
  phone,
  message,
  result,
  supabase,
}: {
  appointmentId: string
  recipientType: 'client' | 'barber'
  phone: string
  message: string
  result: WhatsAppResponse
  supabase: ReturnType<typeof createServiceClient>
}) {
  const { error } = await supabase.from('whatsapp_logs').insert({
    appointment_id: appointmentId,
    recipient_type: recipientType,
    phone_number: sanitizeWhatsApp(phone),
    message,
    status: result.success ? 'sent' : 'failed',
    error_message: result.error ?? null,
  })

  if (error) {
    console.error('[WhatsApp Logs] Error:', error)
  }
}
