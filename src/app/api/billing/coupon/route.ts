import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingPlan } from '@/lib/billing/plans'

const schema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  planCode: z.enum(['solo', 'team', 'studio']).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Informe um cupom válido.' }, { status: 400 })

  const plan = parsed.data.planCode ? getBillingPlan(parsed.data.planCode) : null

  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  if (!barber) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

  const { data: coupon, error } = await admin
    .from('billing_coupons')
    .select('id, code, description, discount_type, discount_value, plan_codes, valid_from, valid_until, max_redemptions, redemption_count, new_customers_only, is_active')
    .eq('code', parsed.data.code)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Instale a migration de cupons antes de continuar.' }, { status: 503 })
  const now = Date.now()
  if (
    !coupon
    || !coupon.is_active
    || (coupon.valid_from && new Date(coupon.valid_from).getTime() > now)
    || (coupon.valid_until && new Date(coupon.valid_until).getTime() <= now)
    || (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions)
  ) {
    return NextResponse.json({ error: 'Cupom inválido, expirado ou esgotado.' }, { status: 404 })
  }
  if (plan && !coupon.plan_codes.includes(plan.code)) {
    return NextResponse.json({ error: 'Este cupom não é válido para o plano selecionado.' }, { status: 400 })
  }

  const [{ data: previousUse }, { count: paidPayments }] = await Promise.all([
    admin.from('billing_coupon_redemptions').select('id').eq('coupon_id', coupon.id).eq('barber_id', barber.id).neq('status', 'released').maybeSingle(),
    coupon.new_customers_only
      ? admin.from('payments').select('id', { count: 'exact', head: true }).eq('barber_id', barber.id).in('status', ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'])
      : Promise.resolve({ count: 0 }),
  ])
  if (previousUse) return NextResponse.json({ error: 'Este cupom já foi utilizado nesta conta.' }, { status: 409 })
  if ((paidPayments ?? 0) > 0) return NextResponse.json({ error: 'Este cupom é exclusivo para novos clientes.' }, { status: 409 })

  const rawDiscount = plan
    ? coupon.discount_type === 'percentage'
      ? plan.price * Number(coupon.discount_value) / 100
      : Number(coupon.discount_value)
    : 0
  const discountAmount = plan ? Math.min(Math.round(rawDiscount * 100) / 100, plan.price - 1) : null

  return NextResponse.json({
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      planCodes: coupon.plan_codes,
      discountAmount,
      originalAmount: plan?.price ?? null,
      firstMonthAmount: plan && discountAmount !== null ? Math.round((plan.price - discountAmount) * 100) / 100 : null,
      firstPaymentOnly: true,
    },
  })
}
