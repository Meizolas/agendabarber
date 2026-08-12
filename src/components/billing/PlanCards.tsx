'use client'

import { useState } from 'react'
import { Check, Crown, Loader2, Scissors, Star, Tag, UserRound, UsersRound, X } from 'lucide-react'
import { SubscriptionCheckoutButton } from '@/components/billing/SubscriptionCheckoutButton'
import { BILLING_PLANS, type BillingPlan } from '@/lib/billing/plans'
import { useToast } from '@/components/ui/use-toast'

const planDetails = {
  solo: { label: 'SOLO', description: 'Tudo para organizar sua agenda', icon: Scissors },
  team: { label: 'EQUIPE', description: 'Cresça com sua equipe organizada', icon: UsersRound },
  studio: { label: 'PRO', description: 'Gestão para equipes maiores', icon: Crown },
} as const

type AppliedCoupon = {
  code: string
  description: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  planCodes: string[]
}

export function PlanCards({
  currentPlan,
  subscriptionActive,
  staffCount,
}: {
  currentPlan: string
  subscriptionActive: boolean
  staffCount: number
}) {
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [validating, setValidating] = useState(false)
  const { toast } = useToast()

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (code.length < 3) {
      toast({ title: 'Informe um cupom válido', variant: 'destructive' })
      return
    }
    setValidating(true)
    const response = await fetch('/api/billing/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setCoupon(null)
      toast({ title: 'Cupom não aplicado', description: payload?.error ?? 'Verifique o código.', variant: 'destructive' })
    } else {
      setCoupon(payload.coupon)
      setCouponInput(payload.coupon.code)
      toast({ title: 'Cupom aplicado', description: 'O desconto será usado somente na primeira mensalidade.' })
    }
    setValidating(false)
  }

  return (
    <div className="space-y-3.5">
      {!subscriptionActive && (
        <section className="rounded-2xl border border-[#F5C400]/25 bg-[#101214] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white"><Tag className="h-4 w-4 text-[#F5C400]" /> Possui um cupom?</div>
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(event) => {
                setCouponInput(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                if (coupon) setCoupon(null)
              }}
              placeholder="DIGITE O CÓDIGO"
              maxLength={40}
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#080A0C] px-3 text-xs font-semibold uppercase tracking-wide text-white outline-none placeholder:text-[#555A61] focus:border-[#F5C400]/60"
            />
            <button type="button" onClick={applyCoupon} disabled={validating} className="h-10 rounded-lg bg-[#F5C400] px-4 text-[11px] font-bold text-black disabled:opacity-60">
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
            </button>
          </div>
          {coupon && (
            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#22C55E]/10 px-3 py-2 text-[10px] text-[#65D787]">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> {coupon.code} aplicado</span>
              <button type="button" onClick={() => { setCoupon(null); setCouponInput('') }} aria-label="Remover cupom"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </section>
      )}

      {BILLING_PLANS.map((plan) => (
        <div key={plan.code}>
          <PlanCard
            plan={plan}
            current={currentPlan === plan.code}
            subscriptionActive={subscriptionActive}
            unavailable={staffCount > plan.staffLimit}
            coupon={coupon?.planCodes.includes(plan.code) ? coupon : null}
            couponCode={coupon?.planCodes.includes(plan.code) ? coupon.code : null}
            validatingCoupon={validating}
          />
        </div>
      ))}
    </div>
  )
}

function PlanCard({ plan, current, subscriptionActive, unavailable, coupon, couponCode, validatingCoupon }: {
  plan: BillingPlan
  current: boolean
  subscriptionActive: boolean
  unavailable: boolean
  coupon: AppliedCoupon | null
  couponCode: string | null
  validatingCoupon: boolean
}) {
  const detail = planDetails[plan.code]
  const Icon = detail.icon
  const featured = plan.code === 'team'
  const [wholePrice, cents] = plan.price.toFixed(2).split('.')
  const couponDiscount = coupon
    ? coupon.discountType === 'percentage' ? plan.price * coupon.discountValue / 100 : coupon.discountValue
    : 0
  const firstMonthAmount = Math.max(1, Math.round((plan.price - Math.min(couponDiscount, plan.price - 1)) * 100) / 100)

  return (
    <article className={`relative isolate min-h-[150px] overflow-hidden rounded-[18px] border bg-[#101214] px-3 pb-3 pt-4 ${featured ? 'border-[#F5C400] shadow-[0_0_9px_rgba(245,196,0,.75),0_0_32px_rgba(245,196,0,.16)]' : 'border-white/25 shadow-[inset_0_0_24px_rgba(255,255,255,.025)]'}`}>
      <div className={`absolute inset-y-0 left-0 -z-10 w-[103px] border-r ${featured ? 'border-[#F5C400]/80 bg-[radial-gradient(circle_at_45%_38%,#FFE15B_0,#F5C400_27%,#A96E00_70%,#17191B_71%)]' : 'border-white/20 bg-[linear-gradient(135deg,#292C2F,#151719_62%,#0D0F10)]'}`} style={{ clipPath: 'polygon(0 0,100% 0,67% 67%,0 89%)' }} />
      {featured && <div className="pointer-events-none absolute left-2 top-6 -z-[5] h-24 w-24 rounded-full border border-[#FFE033]/55 shadow-[0_0_18px_rgba(245,196,0,.4)]" />}
      <div className="flex min-h-[91px]">
        <div className="flex w-[84px] shrink-0 flex-col items-center pt-2 text-[#F5C400]">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${featured ? 'bg-[#F5C400] text-black shadow-[0_5px_18px_rgba(0,0,0,.35)]' : ''}`}><Icon className="h-8 w-8" strokeWidth={1.8} /></span>
          <span className={`mt-2 text-[9px] font-bold tracking-[.2em] ${featured ? 'text-black' : 'text-[#F5C400]'}`}>{detail.label}</span>
        </div>
        <div className="min-w-0 flex-1 pl-3">
          <div className="flex min-h-12 items-start justify-between gap-2">
            <div>
              {featured && <span className="mb-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#F5C400] px-2 py-1 text-[7px] font-extrabold tracking-[.03em] text-black"><Star className="h-2.5 w-2.5 shrink-0 fill-black" /> MAIS ESCOLHIDO</span>}
              <h2 className={`${featured ? 'text-[27px]' : 'text-[21px]'} font-semibold leading-none tracking-[-.03em] text-white`}>{plan.name}</h2>
            </div>
            <div className="shrink-0 text-right">
              {current && <span className="mb-2 inline-block rounded-md border border-[#F5C400] px-2.5 py-1 text-[8px] font-bold text-[#F5C400]">SEU PLANO</span>}
              <p className="whitespace-nowrap leading-none text-white"><span className="mr-1 text-[12px] font-medium text-[#A8A8A8]">R$</span><strong className={`${featured ? 'text-[45px]' : 'text-[36px]'} font-bold tracking-[-.05em]`}>{wholePrice}</strong><span className={`${featured ? 'text-[18px]' : 'text-[15px]'} font-semibold`}>,{cents}</span><span className="ml-1 text-[10px] text-[#A8A8A8]">/mês</span></p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-2 text-[11px] text-[#D4D4D4]"><UserRound className="h-4 w-4 text-[#F5C400]" /> {plan.staffLimit === 1 ? '1 barbeiro' : `Até ${plan.staffLimit} barbeiros`}</p>
          <p className="mt-2 truncate text-[10px] text-[#989898]">{detail.description}</p>
        </div>
      </div>
      <div className="ml-[96px] mt-1">
        {coupon && <p className="mb-2 rounded-md bg-[#22C55E]/10 px-2 py-1.5 text-center text-[9px] text-[#65D787]">1º mês por <strong>{firstMonthAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>; depois {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
        <SubscriptionCheckoutButton planCode={plan.code} couponCode={couponCode} disabled={unavailable || validatingCoupon || (current && subscriptionActive)} label={current && subscriptionActive ? 'Plano atual' : subscriptionActive ? `Trocar para ${plan.name}` : `Escolher ${plan.name}`} featured={featured} />
        {unavailable && <p className="mt-1.5 text-center text-[8px] text-[#FCA5A5]">Desative profissionais para escolher este plano.</p>}
      </div>
    </article>
  )
}
