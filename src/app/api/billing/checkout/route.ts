import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cancelCheckout, createRecurringCheckout, getAsaasConfig, updateRecurringSubscription } from '@/lib/asaas/client'
import { getCurrentUser } from '@/lib/auth/session'
import { enforceRateLimit, requestFingerprint } from '@/lib/security/request'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'
import { getBillingPlan } from '@/lib/billing/plans'

const checkoutSchema = z.object({ planCode: z.enum(['solo', 'team', 'studio']) })

function dateInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function publicAppUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  const value = configured || (process.env.NODE_ENV !== 'production' ? request.nextUrl.origin : '')

  try {
    const url = new URL(value)
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })

  const appUrl = publicAppUrl(request)
  if (!appUrl) {
    return NextResponse.json({ error: 'URL publica do app nao configurada.' }, { status: 503 })
  }

  try {
    getAsaasConfig()
  } catch {
    return NextResponse.json({ error: 'Cobranca ainda nao configurada.' }, { status: 503 })
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
  const plan = parsed.success ? getBillingPlan(parsed.data.planCode) : null
  if (!plan) return NextResponse.json({ error: 'Selecione um plano valido.' }, { status: 400 })

  const admin = createServiceClient()
  try {
    const allowed = await enforceRateLimit({
      supabase: admin,
      key: requestFingerprint(request, `billing-checkout:${user.id}`),
      limit: 5,
      windowSeconds: 60 * 60,
    })
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Cobranca temporariamente indisponivel.' }, { status: 503 })
  }

  const { data: barber, error: barberError } = await admin
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (barberError || !barber) {
    return NextResponse.json({ error: 'Perfil da barbearia nao encontrado.' }, { status: 404 })
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, status, plan_code, provider_subscription_id')
    .eq('barber_id', barber.id)
    .maybeSingle()

  const billingAccess = await getBillingAccessByBarberId(barber.id)
  const { count: activeStaff } = await admin
    .from('staff_members')
    .select('id', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .eq('is_active', true)

  if ((activeStaff ?? 1) > plan.staffLimit) {
    return NextResponse.json(
      { error: `Este plano permite ate ${plan.staffLimit} barbeiro${plan.staffLimit === 1 ? '' : 's'}. Desative profissionais antes de trocar.` },
      { status: 409 },
    )
  }

  if (billingAccess.reason === 'active_subscription') {
    if (subscription?.plan_code === plan.code) return NextResponse.json({ status: 'active' })
    if (!subscription?.provider_subscription_id) {
      return NextResponse.json({ error: 'Assinatura ainda esta sendo conciliada. Tente novamente em instantes.' }, { status: 409 })
    }

    try {
      await updateRecurringSubscription({
        subscriptionId: subscription.provider_subscription_id,
        externalReference: `subscription:${subscription.id}`,
        planName: plan.name,
        price: plan.price,
      })
      const { error } = await admin.from('subscriptions').update({
        plan_code: plan.code,
        staff_limit: plan.staffLimit,
        amount: plan.price,
      }).eq('id', subscription.id)
      if (error) throw error
      return NextResponse.json({ status: 'plan_updated' })
    } catch {
      return NextResponse.json({ error: 'Nao foi possivel alterar o plano no Asaas.' }, { status: 502 })
    }
  }

  const now = new Date()
  await admin
    .from('billing_checkouts')
    .update({ status: 'expired' })
    .eq('barber_id', barber.id)
    .in('status', ['creating', 'active'])
    .lt('expires_at', now.toISOString())

  const { data: openCheckout } = await admin
    .from('billing_checkouts')
    .select('id, provider_checkout_id, checkout_url, status, expires_at, plan_code')
    .eq('barber_id', barber.id)
    .in('status', ['creating', 'active'])
    .maybeSingle()

  if (openCheckout?.status === 'active' && openCheckout.checkout_url && openCheckout.plan_code === plan.code) {
    return NextResponse.json({ checkoutUrl: openCheckout.checkout_url, reused: true })
  }
  if (openCheckout) {
    if (openCheckout.status === 'creating') {
      return NextResponse.json({ error: 'Seu checkout ja esta sendo preparado. Tente novamente em instantes.' }, { status: 409 })
    }
    try {
      if (openCheckout.provider_checkout_id) await cancelCheckout(openCheckout.provider_checkout_id)
      await admin.from('billing_checkouts').update({ status: 'canceled' }).eq('id', openCheckout.id)
    } catch {
      return NextResponse.json({ error: 'Nao foi possivel trocar o checkout anterior agora.' }, { status: 502 })
    }
  }

  let subscriptionId = subscription?.id as string | undefined
  if (!subscriptionId) {
    const { data: createdSubscription, error: subscriptionError } = await admin
      .from('subscriptions')
      .insert({ barber_id: barber.id, amount: plan.price, plan_code: plan.code, staff_limit: plan.staffLimit })
      .select('id')
      .single()

    if (subscriptionError || !createdSubscription) {
      return NextResponse.json({ error: 'Nao foi possivel preparar a assinatura.' }, { status: 500 })
    }
    subscriptionId = createdSubscription.id
  } else {
    await admin.from('subscriptions').update({ amount: plan.price, plan_code: plan.code, staff_limit: plan.staffLimit }).eq('id', subscriptionId)
  }

  const checkoutId = randomUUID()
  const externalReference = `checkout:${checkoutId}`
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
  const { error: intentError } = await admin.from('billing_checkouts').insert({
    id: checkoutId,
    barber_id: barber.id,
    subscription_id: subscriptionId,
    external_reference: externalReference,
    plan_code: plan.code,
    amount: plan.price,
    expires_at: expiresAt.toISOString(),
  })

  if (intentError) {
    return NextResponse.json(
      { error: intentError.code === '23505' ? 'Ja existe um checkout em andamento.' : 'Nao foi possivel preparar o checkout.' },
      { status: intentError.code === '23505' ? 409 : 500 },
    )
  }

  try {
    const checkout = await createRecurringCheckout({
      externalReference,
      appUrl,
      nextDueDate: dateInSaoPaulo(),
      planName: plan.name,
      planCode: plan.code,
      price: plan.price,
      staffLimit: plan.staffLimit,
    })

    const { error: updateError } = await admin
      .from('billing_checkouts')
      .update({
        provider_checkout_id: checkout.id,
        checkout_url: checkout.link,
        status: 'active',
      })
      .eq('id', checkoutId)

    if (updateError) throw new Error('CHECKOUT_PERSIST_FAILED')

    return NextResponse.json({ checkoutUrl: checkout.link, reused: false })
  } catch (error) {
    console.error('[Billing] Asaas checkout failed:', error instanceof Error ? error.name : 'unknown')
    await admin.from('billing_checkouts').update({ status: 'failed' }).eq('id', checkoutId)
    return NextResponse.json({ error: 'Nao foi possivel abrir o pagamento agora.' }, { status: 502 })
  }
}
