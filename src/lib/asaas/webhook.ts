import type { SupabaseClient } from '@supabase/supabase-js'
import { getBillingPlan } from '@/lib/billing/plans'
import { updateRecurringSubscription } from '@/lib/asaas/client'

type JsonObject = Record<string, unknown>

export interface AsaasWebhookPayload extends JsonObject {
  id: string
  event: string
  dateCreated?: string
  checkout?: JsonObject
  subscription?: JsonObject
  payment?: JsonObject
}

export interface WebhookProcessResult {
  status: 'processed' | 'ignored'
  barberId?: string
  subscriptionId?: string
  paymentId?: string
}

const SENSITIVE_KEYS = new Set([
  'access_token',
  'creditCardToken',
  'number',
  'ccv',
])

export function sanitizeAsaasPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAsaasPayload)
  const object = asObject(value)
  if (!object) return value

  return Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => !SENSITIVE_KEYS.has(key))
      .map(([key, child]) => [key, sanitizeAsaasPayload(child)]),
  )
}

function text(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

export function asaasDate(value: unknown) {
  const raw = text(value)
  if (!raw) return null

  let normalized = raw
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) normalized = `${raw}T12:00:00-03:00`
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    normalized = `${raw.replace(' ', 'T')}-03:00`
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function nextMonthlyPeriod(value: string) {
  const periodEnd = new Date(value)
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
  return periodEnd.toISOString()
}

async function findCheckout(admin: SupabaseClient, providerId?: string | null, externalReference?: string | null) {
  if (providerId) {
    const { data } = await admin
      .from('billing_checkouts')
      .select('id, barber_id, subscription_id, plan_code, amount, coupon_redemption_id, recurring_price_restored_at')
      .eq('provider_checkout_id', providerId)
      .maybeSingle()
    if (data) return data
  }

  if (externalReference) {
    const { data } = await admin
      .from('billing_checkouts')
      .select('id, barber_id, subscription_id, plan_code, amount, coupon_redemption_id, recurring_price_restored_at')
      .eq('external_reference', externalReference)
      .maybeSingle()
    if (data) return data
  }

  return null
}

async function restoreRecurringPriceAfterCoupon(
  admin: SupabaseClient,
  checkout: Awaited<ReturnType<typeof findCheckout>>,
  providerSubscriptionId: string | null,
  localSubscriptionId: string,
) {
  if (!checkout?.coupon_redemption_id || checkout.recurring_price_restored_at || !providerSubscriptionId) return
  const plan = getBillingPlan(checkout.plan_code)
  if (!plan) throw new Error('COUPON_PLAN_NOT_FOUND')

  await updateRecurringSubscription({
    subscriptionId: providerSubscriptionId,
    externalReference: `subscription:${localSubscriptionId}`,
    planName: plan.name,
    price: plan.price,
  })

  const restoredAt = new Date().toISOString()
  const [{ error: checkoutError }, { error: redemptionError }] = await Promise.all([
    admin.from('billing_checkouts').update({ recurring_price_restored_at: restoredAt }).eq('id', checkout.id).is('recurring_price_restored_at', null),
    admin.from('billing_coupon_redemptions').update({ status: 'applied', redeemed_at: restoredAt }).eq('id', checkout.coupon_redemption_id).eq('status', 'reserved'),
  ])
  if (checkoutError || redemptionError) throw checkoutError || redemptionError
}

async function findSubscription(admin: SupabaseClient, providerId?: string | null, localId?: string | null) {
  if (providerId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, barber_id, status, last_event_at')
      .eq('provider_subscription_id', providerId)
      .maybeSingle()
    if (data) return data
  }

  if (localId) {
    const { data } = await admin
      .from('subscriptions')
      .select('id, barber_id, status, last_event_at')
      .eq('id', localId)
      .maybeSingle()
    if (data) return data
  }

  return null
}

function eventIsNewEnough(lastEventAt: string | null, eventAt: string) {
  return !lastEventAt || new Date(eventAt).getTime() >= new Date(lastEventAt).getTime()
}

async function processCheckoutEvent(
  admin: SupabaseClient,
  payload: AsaasWebhookPayload,
  eventAt: string,
): Promise<WebhookProcessResult> {
  const checkoutPayload = asObject(payload.checkout)
  if (!checkoutPayload) return { status: 'ignored' }

  const checkout = await findCheckout(
    admin,
    text(checkoutPayload.id),
    text(checkoutPayload.externalReference),
  )
  if (!checkout) return { status: 'ignored' }

  const statusByEvent: Record<string, string> = {
    CHECKOUT_CREATED: 'active',
    CHECKOUT_CANCELED: 'canceled',
    CHECKOUT_EXPIRED: 'expired',
    CHECKOUT_PAID: 'paid',
  }
  const status = statusByEvent[payload.event]
  if (!status) return { status: 'ignored' }

  const changes: Record<string, unknown> = { status }
  if (status === 'paid') changes.paid_at = eventAt

  const { error } = await admin.from('billing_checkouts').update(changes).eq('id', checkout.id)
  if (error) throw error

  if (checkout.subscription_id && text(checkoutPayload.customer)) {
    const { error: customerError } = await admin
      .from('subscriptions')
      .update({ provider_customer_id: text(checkoutPayload.customer) })
      .eq('id', checkout.subscription_id)
    if (customerError) throw customerError
  }

  // CHECKOUT_PAID confirma o Checkout, mas o acesso depende do evento financeiro da cobranca.
  return {
    status: 'processed',
    barberId: checkout.barber_id,
    subscriptionId: checkout.subscription_id ?? undefined,
  }
}

async function processSubscriptionEvent(
  admin: SupabaseClient,
  payload: AsaasWebhookPayload,
  eventAt: string,
): Promise<WebhookProcessResult> {
  const providerSubscription = asObject(payload.subscription)
  if (!providerSubscription) return { status: 'ignored' }

  const providerId = text(providerSubscription.id)
  const checkout = await findCheckout(
    admin,
    text(providerSubscription.checkoutSession),
    text(providerSubscription.externalReference),
  )
  const subscription = await findSubscription(admin, providerId, checkout?.subscription_id)
  if (!providerId || !subscription) return { status: 'ignored' }
  if (!eventIsNewEnough(subscription.last_event_at, eventAt)) return { status: 'ignored' }

  const canceled = [
    'SUBSCRIPTION_INACTIVATED',
    'SUBSCRIPTION_DELETED',
  ].includes(payload.event) || providerSubscription.status === 'INACTIVE' || providerSubscription.deleted === true

  const changes: Record<string, unknown> = {
    provider_subscription_id: providerId,
    provider_customer_id: text(providerSubscription.customer),
    billing_cycle: text(providerSubscription.cycle) || 'MONTHLY',
    last_event_at: eventAt,
  }
  const value = number(providerSubscription.value)
  if (value !== null && !checkout?.coupon_redemption_id) {
    changes.amount = value
    const checkoutPlan = getBillingPlan(checkout?.plan_code)
    if (checkoutPlan) {
      changes.plan_code = checkoutPlan.code
      changes.staff_limit = checkoutPlan.staffLimit
    }
  }
  if (canceled) {
    changes.status = 'canceled'
    changes.canceled_at = eventAt
  }

  const { error } = await admin.from('subscriptions').update(changes).eq('id', subscription.id)
  if (error) throw error
  await restoreRecurringPriceAfterCoupon(admin, checkout, providerId, subscription.id)

  return {
    status: 'processed',
    barberId: subscription.barber_id,
    subscriptionId: subscription.id,
  }
}

async function processPaymentEvent(
  admin: SupabaseClient,
  payload: AsaasWebhookPayload,
  eventAt: string,
): Promise<WebhookProcessResult> {
  const payment = asObject(payload.payment)
  if (!payment) return { status: 'ignored' }

  const providerPaymentId = text(payment.id)
  const providerSubscriptionId = text(payment.subscription)
  const checkout = await findCheckout(
    admin,
    text(payment.checkoutSession),
    text(payment.externalReference),
  )
  const subscription = await findSubscription(admin, providerSubscriptionId, checkout?.subscription_id)
  if (!providerPaymentId || !subscription) return { status: 'ignored' }

  // O Checkout recorrente do Asaas pode deixar externalReference nulo nos
  // objetos payment/subscription. checkoutSession e o identificador estavel
  // que liga esses eventos ao billing_checkout criado pela aplicacao.
  if (providerSubscriptionId) {
    const { error: bindingError } = await admin
      .from('subscriptions')
      .update({
        provider_subscription_id: providerSubscriptionId,
        provider_customer_id: text(payment.customer),
      })
      .eq('id', subscription.id)
    if (bindingError) throw bindingError
  }
  await restoreRecurringPriceAfterCoupon(admin, checkout, providerSubscriptionId, subscription.id)

  const confirmedAt = asaasDate(payment.confirmedDate)
  const receivedAt = asaasDate(payment.paymentDate) || asaasDate(payment.clientPaymentDate)
  const dueDate = text(payment.dueDate)
  const refunded = [
    'PAYMENT_REFUNDED',
    'PAYMENT_PARTIALLY_REFUNDED',
    'PAYMENT_REFUND_IN_PROGRESS',
  ].includes(payload.event)

  const paymentValues = {
    barber_id: subscription.barber_id,
    subscription_id: subscription.id,
    provider_payment_id: providerPaymentId,
    provider_subscription_id: providerSubscriptionId,
    billing_type: text(payment.billingType),
    status: text(payment.status) || payload.event,
    amount: number(payment.value) ?? 0,
    net_amount: number(payment.netValue),
    due_date: dueDate,
    confirmed_at: confirmedAt,
    received_at: receivedAt,
    refunded_at: refunded ? eventAt : null,
  }

  const { data: storedPayment, error: paymentError } = await admin
    .from('payments')
    .upsert(paymentValues, { onConflict: 'provider_payment_id' })
    .select('id')
    .single()
  if (paymentError || !storedPayment) throw paymentError || new Error('PAYMENT_NOT_STORED')

  if (eventIsNewEnough(subscription.last_event_at, eventAt)) {
    const successfulEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_RECEIVED_IN_CASH',
      'PAYMENT_DUNNING_RECEIVED',
    ]
    const overdueEvents = ['PAYMENT_OVERDUE']
    const chargebackEvents = [
      'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
    ]

    const changes: Record<string, unknown> = { last_event_at: eventAt }
    if (successfulEvents.includes(payload.event)) {
      const periodStart = receivedAt || confirmedAt || asaasDate(dueDate) || eventAt
      changes.status = 'active'
      changes.current_period_start = periodStart
      changes.current_period_end = nextMonthlyPeriod(periodStart)
      changes.grace_until = null
      changes.canceled_at = null
    } else if (overdueEvents.includes(payload.event)) {
      changes.status = 'past_due'
      changes.grace_until = null
    } else if (chargebackEvents.includes(payload.event)) {
      changes.status = 'chargeback'
      changes.grace_until = null
    } else if (refunded) {
      changes.status = 'refunded'
      changes.grace_until = null
    }

    const { error: subscriptionError } = await admin
      .from('subscriptions')
      .update(changes)
      .eq('id', subscription.id)
    if (subscriptionError) throw subscriptionError

    if (successfulEvents.includes(payload.event)) {
      const { error: trialError } = await admin
        .from('barbers')
        .update({ trial_converted_at: eventAt })
        .eq('id', subscription.barber_id)
        .is('trial_converted_at', null)
      if (trialError) throw trialError
    }
  }

  return {
    status: 'processed',
    barberId: subscription.barber_id,
    subscriptionId: subscription.id,
    paymentId: storedPayment.id,
  }
}

export async function processAsaasWebhook(
  admin: SupabaseClient,
  payload: AsaasWebhookPayload,
): Promise<WebhookProcessResult> {
  const eventAt = asaasDate(payload.dateCreated) || new Date().toISOString()

  if (payload.event.startsWith('CHECKOUT_')) {
    return processCheckoutEvent(admin, payload, eventAt)
  }
  if (payload.event.startsWith('SUBSCRIPTION_')) {
    return processSubscriptionEvent(admin, payload, eventAt)
  }
  if (payload.event.startsWith('PAYMENT_')) {
    return processPaymentEvent(admin, payload, eventAt)
  }
  return { status: 'ignored' }
}
