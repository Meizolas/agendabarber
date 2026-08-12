import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { processAsaasWebhook, type AsaasWebhookPayload } from '@/lib/asaas/webhook'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  if (!barber) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const { data: checkouts } = await admin.from('billing_checkouts').select('provider_checkout_id').eq('barber_id', barber.id)
  const checkoutIds = new Set((checkouts ?? []).map((checkout) => checkout.provider_checkout_id).filter(Boolean))
  if (checkoutIds.size === 0) {
    const access = await getBillingAccessByBarberId(barber.id)
    return NextResponse.json({ reconciled: 0, active: false, accessAllowed: access.allowed, accessReason: access.reason })
  }

  const { data: events } = await admin
    .from('billing_events')
    .select('id, payload, event_created_at, received_at')
    .eq('processing_status', 'ignored')
    .in('event_type', ['PAYMENT_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED'])
    .order('event_created_at', { ascending: true, nullsFirst: false })
    .limit(50)

  let reconciled = 0
  for (const event of events ?? []) {
    const payload = event.payload as AsaasWebhookPayload
    const resource = (payload.payment ?? payload.subscription) as Record<string, unknown> | undefined
    if (!resource || typeof resource.checkoutSession !== 'string' || !checkoutIds.has(resource.checkoutSession)) continue

    const result = await processAsaasWebhook(admin, payload)
    if (result.status !== 'processed' || result.barberId !== barber.id) continue
    await admin.from('billing_events').update({
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      processing_error: null,
      barber_id: result.barberId,
      subscription_id: result.subscriptionId ?? null,
      payment_id: result.paymentId ?? null,
    }).eq('id', event.id).eq('processing_status', 'ignored')
    reconciled += 1
  }

  const { data: subscription } = await admin.from('subscriptions').select('status').eq('barber_id', barber.id).maybeSingle()
  const access = await getBillingAccessByBarberId(barber.id)
  return NextResponse.json({
    reconciled,
    active: subscription?.status === 'active',
    accessAllowed: access.allowed,
    accessReason: access.reason,
  })
}
