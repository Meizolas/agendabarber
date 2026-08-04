import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { asaasDate, processAsaasWebhook, sanitizeAsaasPayload, type AsaasWebhookPayload } from '@/lib/asaas/webhook'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_WEBHOOK_BYTES = 256 * 1024
const webhookSchema = z.object({
  id: z.string().min(1).max(200),
  event: z.string().min(1).max(200),
  dateCreated: z.string().max(100).optional(),
  checkout: z.record(z.unknown()).optional(),
  subscription: z.record(z.unknown()).optional(),
  payment: z.record(z.unknown()).optional(),
}).passthrough()

function secureTokenMatch(received: string | null, expected: string) {
  if (!received) return false
  const receivedHash = createHash('sha256').update(received).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(receivedHash, expectedHash)
}

export async function POST(request: NextRequest) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim()
  if (!webhookToken || webhookToken.length < 32) {
    return NextResponse.json({ error: 'Webhook nao configurado.' }, { status: 503 })
  }

  if (!secureTokenMatch(request.headers.get('asaas-access-token'), webhookToken)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload muito grande.' }, { status: 413 })
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload muito grande.' }, { status: 413 })
  }

  const parsedJson = (() => {
    try { return JSON.parse(rawBody) }
    catch { return null }
  })()
  const parsed = webhookSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Evento invalido.' }, { status: 400 })
  }

  const payload = parsed.data as AsaasWebhookPayload
  const admin = createServiceClient()
  const { data: registered, error: registerError } = await admin
    .rpc('register_billing_event', {
      p_provider: 'asaas',
      p_provider_event_id: payload.id,
      p_event_type: payload.event,
      p_payload: sanitizeAsaasPayload(payload),
      p_event_created_at: asaasDate(payload.dateCreated),
    })
    .single()

  if (registerError || !registered) {
    console.error('[Billing webhook] Event registration failed:', registerError?.code)
    return NextResponse.json({ error: 'Falha ao registrar evento.' }, { status: 500 })
  }
  const registration = registered as { event_id: string; was_inserted: boolean }

  // Um evento que chegou antes de seus dados de correlacao pode ter sido
  // marcado como ignored. Quando o Asaas o reenviar, permitimos uma nova
  // tentativa; claim_billing_event continua garantindo processamento unico.
  if (!registration.was_inserted) {
    await admin
      .from('billing_events')
      .update({ processing_status: 'pending', processed_at: null })
      .eq('id', registration.event_id)
      .eq('processing_status', 'ignored')
  }

  const { data: claimed, error: claimError } = await admin
    .rpc('claim_billing_event', { p_event_id: registration.event_id })
    .maybeSingle()

  if (claimError) {
    console.error('[Billing webhook] Event claim failed:', claimError.code)
    return NextResponse.json({ error: 'Falha ao reservar evento.' }, { status: 500 })
  }

  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const result = await processAsaasWebhook(admin, payload)
    const { error: completionError } = await admin
      .from('billing_events')
      .update({
        processing_status: result.status,
        processed_at: new Date().toISOString(),
        processing_started_at: null,
        processing_error: null,
        barber_id: result.barberId ?? null,
        subscription_id: result.subscriptionId ?? null,
        payment_id: result.paymentId ?? null,
      })
      .eq('id', registration.event_id)

    if (completionError) throw completionError
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'UNKNOWN_PROCESSING_ERROR'
    console.error('[Billing webhook] Processing failed:', message)
    await admin
      .from('billing_events')
      .update({
        processing_status: 'failed',
        processing_started_at: null,
        processing_error: message,
      })
      .eq('id', registration.event_id)

    return NextResponse.json({ error: 'Falha ao processar evento.' }, { status: 500 })
  }
}
