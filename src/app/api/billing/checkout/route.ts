import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cancelCheckout, createRecurringCheckout, getAsaasConfig, updateRecurringSubscription } from '@/lib/asaas/client'
import { getCurrentUser } from '@/lib/auth/session'
import { enforceRateLimit, requestFingerprint } from '@/lib/security/request'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'
import { getBillingPlan } from '@/lib/billing/plans'

const checkoutSchema = z.object({
  planCode: z.enum(['solo', 'team', 'studio']),
  couponCode: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()).optional(),
})

function dateInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function asSaoPauloDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
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
    .select('id, trial_ends_at')
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
  const { data: expiredCheckouts } = await admin
    .from('billing_checkouts')
    .select('id, coupon_redemption_id')
    .eq('barber_id', barber.id)
    .in('status', ['creating', 'active'])
    .lt('expires_at', now.toISOString())
  if (expiredCheckouts?.length) {
    await admin.from('billing_checkouts').update({ status: 'expired' }).in('id', expiredCheckouts.map((checkout) => checkout.id))
    await Promise.all(expiredCheckouts
      .filter((checkout) => checkout.coupon_redemption_id)
      .map((checkout) => admin.rpc('release_billing_coupon', { p_redemption_id: checkout.coupon_redemption_id })))
  }

  const { data: openCheckout } = await admin
    .from('billing_checkouts')
    .select('id, provider_checkout_id, checkout_url, status, expires_at, plan_code, coupon_code, coupon_redemption_id')
    .eq('barber_id', barber.id)
    .in('status', ['creating', 'active'])
    .maybeSingle()

  const requestedCoupon = parsed.success ? parsed.data.couponCode ?? null : null
  if (openCheckout?.status === 'active' && openCheckout.checkout_url && openCheckout.plan_code === plan.code && openCheckout.coupon_code === requestedCoupon) {
    return NextResponse.json({ checkoutUrl: openCheckout.checkout_url, reused: true })
  }
  if (openCheckout) {
    if (openCheckout.status === 'creating') {
      return NextResponse.json({ error: 'Seu checkout ja esta sendo preparado. Tente novamente em instantes.' }, { status: 409 })
    }
    try {
      if (openCheckout.provider_checkout_id) await cancelCheckout(openCheckout.provider_checkout_id)
      await admin.from('billing_checkouts').update({ status: 'canceled' }).eq('id', openCheckout.id)
      if (openCheckout.coupon_redemption_id) {
        await admin.rpc('release_billing_coupon', { p_redemption_id: openCheckout.coupon_redemption_id })
      }
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
    original_amount: plan.price,
    checkout_amount: plan.price,
    expires_at: expiresAt.toISOString(),
  })

  if (intentError) {
    return NextResponse.json(
      { error: intentError.code === '23505' ? 'Ja existe um checkout em andamento.' : 'Nao foi possivel preparar o checkout.' },
      { status: intentError.code === '23505' ? 409 : 500 },
    )
  }

  let checkoutAmount: number = plan.price
  let couponRedemptionId: string | null = null
  let couponCode: string | null = null
  if (requestedCoupon) {
    const { data: reservation, error: couponError } = await admin
      .rpc('reserve_billing_coupon', {
        p_code: requestedCoupon,
        p_barber_id: barber.id,
        p_subscription_id: subscriptionId,
        p_checkout_id: checkoutId,
        p_plan_code: plan.code,
        p_original_amount: plan.price,
      })
      .single()

    if (couponError || !reservation) {
      await admin.from('billing_checkouts').update({ status: 'failed' }).eq('id', checkoutId)
      const couponErrors: Record<string, string> = {
        COUPON_INVALID: 'Cupom inválido.',
        COUPON_NOT_STARTED: 'Este cupom ainda não está disponível.',
        COUPON_EXPIRED: 'Este cupom expirou.',
        COUPON_PLAN_NOT_ALLOWED: 'Este cupom não vale para o plano escolhido.',
        COUPON_LIMIT_REACHED: 'Este cupom atingiu o limite de utilizações.',
        COUPON_ALREADY_USED: 'Este cupom já foi utilizado nesta conta.',
        COUPON_NEW_CUSTOMERS_ONLY: 'Este cupom é exclusivo para novos clientes.',
      }
      const known = Object.entries(couponErrors).find(([code]) => couponError?.message.includes(code))?.[1]
      return NextResponse.json({ error: known ?? 'Não foi possível aplicar o cupom.' }, { status: 400 })
    }

    const reservedCoupon = reservation as {
      redemption_id: string
      coupon_code: string
      final_amount: number | string
    }
    couponRedemptionId = reservedCoupon.redemption_id
    couponCode = reservedCoupon.coupon_code
    checkoutAmount = Number(reservedCoupon.final_amount)
    await admin.from('billing_checkouts').update({
      coupon_redemption_id: couponRedemptionId,
      coupon_code: couponCode,
      checkout_amount: checkoutAmount,
    }).eq('id', checkoutId)
  }

  try {
    const today = dateInSaoPaulo()
    const trialDueDate = barber.trial_ends_at && new Date(barber.trial_ends_at).getTime() > Date.now()
      ? asSaoPauloDate(barber.trial_ends_at)
      : today
    const checkout = await createRecurringCheckout({
      externalReference,
      appUrl,
      nextDueDate: trialDueDate,
      planName: plan.name,
      planCode: plan.code,
      price: checkoutAmount,
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

    return NextResponse.json({
      checkoutUrl: checkout.link,
      reused: false,
      trialEndsAt: trialDueDate !== today ? barber.trial_ends_at : null,
      coupon: couponCode ? { code: couponCode, firstMonthAmount: checkoutAmount, recurringAmount: plan.price } : null,
    })
  } catch (error) {
    console.error('[Billing] Asaas checkout failed:', error instanceof Error ? error.name : 'unknown')
    await admin.from('billing_checkouts').update({ status: 'failed' }).eq('id', checkoutId)
    if (couponRedemptionId) await admin.rpc('release_billing_coupon', { p_redemption_id: couponRedemptionId })
    return NextResponse.json({ error: 'Nao foi possivel abrir o pagamento agora.' }, { status: 502 })
  }
}
