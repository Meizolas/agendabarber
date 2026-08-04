import Image from 'next/image'
import Link from 'next/link'
import { Bell, CalendarDays, Check, Infinity, Link2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { PlanCards } from '@/components/billing/PlanCards'
import { BillingReconciler } from '@/components/billing/BillingReconciler'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'
import { planForAmount } from '@/lib/billing/plans'

export default async function AssinaturaPage() {
  const user = await getCurrentUser()
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('*').eq('user_id', user!.id).maybeSingle()
  const { data: subscription } = barber
    ? await admin.from('subscriptions').select('status, amount, current_period_end, plan_code, staff_limit').eq('barber_id', barber.id).maybeSingle()
    : { data: null }
  const { count: staffCount } = barber
    ? await admin.from('staff_members').select('id', { count: 'exact', head: true }).eq('barber_id', barber.id).eq('is_active', true)
    : { count: 0 }

  const access = barber ? await getBillingAccessByBarberId(barber.id) : null
  const isActive = access?.reason === 'active_subscription'
  const inferredPlan = planForAmount(Number(subscription?.amount ?? 39))
  const currentPlan = subscription?.plan_code ?? inferredPlan.code
  const initials = barber?.barber_name?.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase() || 'AB'

  return (
    <div className="plans-screen relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_82%_3%,rgba(245,196,0,.07),transparent_25%),linear-gradient(180deg,#050607_0%,#080A0C_100%)] px-4 pb-7 pt-5">
      <BillingReconciler enabled={subscription?.status === 'pending_payment'} />
      <Image src="/brand/agendbarber-mark.png" alt="" width={360} height={360} className="pointer-events-none absolute -right-24 top-4 w-[290px] opacity-[0.045]" />

      <header className="relative z-10 flex items-center justify-between">
        <Image src="/brand/agendbarber-mark.png" alt="AgendBarber" width={62} height={62} priority className="h-12 w-12 object-contain drop-shadow-[0_0_10px_rgba(245,196,0,.22)]" />
        <Link href="/perfil" aria-label="Abrir perfil" className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#F5C400] bg-[#111315] text-sm font-semibold text-white shadow-[0_0_18px_rgba(245,196,0,.12)]">
          {barber?.logo_url ? <img src={barber.logo_url} alt="Logo da barbearia" className="h-full w-full object-cover" /> : initials}
        </Link>
      </header>

      <section className="relative z-10 mt-7">
        <p className="text-[10px] font-bold uppercase tracking-[.32em] text-[#F5C400]">Planos AgendBarber</p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.02] tracking-[-.045em] text-white">Escale sua barbearia.<br /><span className="text-[#F5C400]">Sem complicação.</span></h1>
        <p className="mt-3 text-[14px] leading-[1.45] text-[#A7A7A7]">Escolha pelo tamanho da equipe.<br />Todos os recursos já estão inclusos.</p>
      </section>

      <CapacityScale />
      <Benefits />

      <section className="relative z-10 mt-4">
        <PlanCards currentPlan={currentPlan} subscriptionActive={isActive} staffCount={staffCount ?? 0} />
      </section>

      <section className="relative z-10 mt-5 rounded-2xl border border-white/10 bg-[#101214] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
        <div className="flex items-start gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F5C400]/[0.08]"><ShieldCheck className="h-8 w-8 text-[#F5C400]" strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1 border-l border-white/10 pl-3.5">
            <p className="text-[12px] font-semibold leading-snug text-white">Mesmos recursos em todos os planos</p>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] text-[#B4B4B4]">{['Agenda online', 'Lembretes', 'Link próprio', 'Ilimitado'].map((item) => <span key={item} className="flex min-w-0 items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#F5C400] p-0.5 text-black" /><span className="truncate">{item}</span></span>)}</div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mt-4 px-2 text-center text-[10px] leading-relaxed text-[#858585]">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1"><LockKeyhole className="h-4 w-4 shrink-0 text-[#F5C400]" /><span>Cancele quando quiser</span><span className="text-[#F5C400]/60">•</span><span>Pagamento seguro pelo Asaas</span></p>
        {subscription?.current_period_end && <p className="mt-1.5">Próxima renovação: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>}
      </footer>
    </div>
  )
}

function CapacityScale() {
  return <section className="relative z-10 mt-7 px-4"><div className="absolute left-[17%] right-[17%] top-[23px] h-px bg-gradient-to-r from-[#F5C400]/40 via-[#F5C400] to-[#F5C400]/40" /><div className="relative flex items-start justify-between">{[1, 3, 6].map((value) => <div key={value} className="w-[82px] text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#F5C400] bg-[#090A0B] text-[22px] font-medium text-[#F5C400] shadow-[0_0_14px_rgba(245,196,0,.42)]">{value}</span><span className="mt-2.5 block text-[11px] leading-none text-[#B2B2B2]">profissionais</span></div>)}</div></section>
}

function Benefits() {
  const items = [{ icon: CalendarDays, label: 'Agenda\nonline' }, { icon: Bell, label: 'Lembretes' }, { icon: Link2, label: 'Link\npróprio' }, { icon: Infinity, label: 'Ilimitado' }]
  return <section className="relative z-10 mt-5 grid grid-cols-2 gap-2.5">{items.map(({ icon: Icon, label }) => <div key={label} className="flex min-h-[62px] items-center gap-3 rounded-xl border border-white/15 bg-[#111315]/95 px-4 text-[11px] font-medium leading-tight text-[#E1E1E1] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]"><Icon className="h-6 w-6 shrink-0 text-[#F5C400]" strokeWidth={1.8} /> <span className="whitespace-pre-line">{label}</span></div>)}</section>
}
