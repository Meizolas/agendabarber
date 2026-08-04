import { createServiceClient } from '@/lib/supabase/server'

export type BillingAccessReason =
  | 'active_subscription'
  | 'grace_period'
  | 'manual_override'
  | 'payment_required'
  | 'barber_not_found'

export interface BillingAccess {
  allowed: boolean
  reason: BillingAccessReason
  barberId: string | null
  subscriptionStatus: string | null
}

type AccessBarber = {
  id: string
  access_override_until: string | null
}

type AccessSubscription = {
  status: string
  current_period_end: string | null
  grace_until: string | null
}

function future(value?: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now())
}

function evaluate(barber: AccessBarber, subscription: AccessSubscription | null): BillingAccess {
  if (future(barber.access_override_until)) {
    return {
      allowed: true,
      reason: 'manual_override',
      barberId: barber.id,
      subscriptionStatus: subscription?.status ?? null,
    }
  }

  if (
    subscription?.status === 'active'
    && (!subscription.current_period_end || future(subscription.current_period_end))
  ) {
    return {
      allowed: true,
      reason: 'active_subscription',
      barberId: barber.id,
      subscriptionStatus: subscription.status,
    }
  }

  if (future(subscription?.grace_until)) {
    return {
      allowed: true,
      reason: 'grace_period',
      barberId: barber.id,
      subscriptionStatus: subscription?.status ?? null,
    }
  }

  return {
    allowed: false,
    reason: 'payment_required',
    barberId: barber.id,
    subscriptionStatus: subscription?.status ?? null,
  }
}

export async function getBillingAccessByUserId(userId: string): Promise<BillingAccess> {
  const { data: barber } = await createServiceClient()
    .from('barbers')
    .select('id, access_override_until, subscriptions(status, current_period_end, grace_until)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!barber) {
    return { allowed: false, reason: 'barber_not_found', barberId: null, subscriptionStatus: null }
  }

  const relation = (barber as unknown as { subscriptions?: AccessSubscription | AccessSubscription[] | null }).subscriptions
  const subscription = Array.isArray(relation) ? relation[0] ?? null : relation ?? null
  return evaluate(barber as AccessBarber, subscription)
}

export async function getBillingAccessByBarberId(barberId: string): Promise<BillingAccess> {
  const { data: barber } = await createServiceClient()
    .from('barbers')
    .select('id, access_override_until, subscriptions(status, current_period_end, grace_until)')
    .eq('id', barberId)
    .maybeSingle()

  if (!barber) {
    return { allowed: false, reason: 'barber_not_found', barberId: null, subscriptionStatus: null }
  }

  const relation = (barber as unknown as { subscriptions?: AccessSubscription | AccessSubscription[] | null }).subscriptions
  const subscription = Array.isArray(relation) ? relation[0] ?? null : relation ?? null
  return evaluate(barber as AccessBarber, subscription)
}
