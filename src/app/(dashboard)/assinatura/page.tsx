import { Check, LockKeyhole } from 'lucide-react'
import { Header } from '@/components/dashboard/Header'
import { SubscriptionCheckoutButton } from '@/components/billing/SubscriptionCheckoutButton'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'

const statusLabel: Record<string, string> = {
  pending_payment: 'Aguardando pagamento', active: 'Ativa', past_due: 'Pagamento pendente',
  canceled: 'Cancelada', refunded: 'Reembolsada', chargeback: 'Contestada', suspended: 'Suspensa',
}

export default async function AssinaturaPage() {
  const user = await getCurrentUser()
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('*').eq('user_id', user!.id).maybeSingle()
  const { data: subscription } = barber
    ? await admin.from('subscriptions').select('status, amount, current_period_end').eq('barber_id', barber.id).maybeSingle()
    : { data: null }

  const configuredPrice = Number(process.env.ASAAS_MONTHLY_PRICE)
  const amount = Number(subscription?.amount || configuredPrice || 0)
  const whole = amount > 0 ? Math.floor(amount) : 0
  const cents = amount > 0 ? Math.round((amount - whole) * 100).toString().padStart(2, '0') : '00'
  const billingAccess = barber ? await getBillingAccessByBarberId(barber.id) : null
  const isActive = billingAccess?.reason === 'active_subscription'

  return (
    <>
      <Header barber={barber} title="Assinatura" />
      <div className="flex flex-1 flex-col px-4 pb-5">
        <section className="rounded-xl border border-[#F5C400]/70 bg-[#111315] px-4 py-5 shadow-[0_0_30px_rgba(245,196,0,0.08)]">
          <div className="text-center">
            <p className="text-xs text-[#D7DADE]">Agend<span className="text-[#F5C400]">Barber</span> Mensal</p>
            <p className="mt-4 text-[15px] text-white"><span className="align-top text-sm">R$</span> <strong className="text-[38px] font-semibold leading-none">{whole}</strong><span className="text-[24px]">,{cents}</span></p>
            <p className="mt-1 text-[10px] text-[#858A93]">por mês</p>
            <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[9px] font-medium ${isActive ? 'border-[#22C55E]/50 bg-[#22C55E]/10 text-[#65D787]' : 'border-[#F5C400]/60 bg-[#F5C400]/10 text-[#F5C400]'}`}>
              {subscription?.status ? statusLabel[subscription.status] ?? subscription.status : 'Período de transição'}
            </span>
            {subscription?.current_period_end && <p className="mt-3 text-[9px] text-[#858A93]">Seu plano atual termina em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>}
          </div>

          <ul className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
            {['Agendamentos ilimitados', 'Link público personalizado', 'Lembretes automáticos', 'Relatórios e métricas', 'Suporte prioritário'].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-[11px] text-[#D7DADE]"><span className="grid h-4 w-4 place-items-center rounded-full bg-[#F5C400] text-black"><Check className="h-3 w-3 stroke-[3]" /></span>{feature}</li>
            ))}
          </ul>
        </section>

        <div className="mt-5 text-center text-[10px] text-[#858A93]"><p className="flex items-center justify-center gap-2"><LockKeyhole className="h-4 w-4" /> Pagamento 100% seguro</p><p className="mt-1">Seus dados são criptografados.</p></div>

        <div className="mt-auto pt-6">
          {isActive ? (
            <div className="rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-center text-xs text-[#65D787]">Sua assinatura está ativa.</div>
          ) : (
            <SubscriptionCheckoutButton disabled={amount <= 0} />
          )}
        </div>
      </div>
    </>
  )
}
