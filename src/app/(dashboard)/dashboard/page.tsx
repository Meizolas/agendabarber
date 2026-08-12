import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, ChevronRight, CircleDollarSign, Hourglass, Share2 } from 'lucide-react'
import type { Metadata } from 'next'
import type { Appointment } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { Header } from '@/components/dashboard/Header'
import { DashboardInsights } from '@/components/dashboard/DashboardInsights'
import { formatTime } from '@/lib/utils/format'
import { addCalendarDays, calendarDaysBetween, getSaoPauloDate } from '@/lib/utils/timezone'
import { getPublicAppUrl } from '@/lib/utils/app-url'
import { calculateFinancialSummary, monthBounds, type FinancialAppointment } from '@/lib/finance/summary'
import { getBillingAccessByBarberId } from '@/lib/billing/access'
import { DashboardAutoRefresh } from '@/components/dashboard/DashboardAutoRefresh'

export const metadata: Metadata = { title: 'Dashboard | AgendBarber' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('*').eq('user_id', user.id).single()
  if (!barber) redirect('/perfil')

  const today = getSaoPauloDate()
  const weekEnd = addCalendarDays(today, 6)
  const { currentStart, previousStart } = monthBounds(today)
  const [
    { data: upcomingAppointments },
    { count: completedToday },
    { count: totalMonth },
    financialResult,
    pendingResult,
    goalResult,
  ] = await Promise.all([
    admin
      .from('appointments')
      .select('*, service:services(*)')
      .eq('barber_id', barber.id)
      .eq('status', 'confirmed')
      .gte('appointment_date', today)
      .lte('appointment_date', weekEnd)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true }),
    admin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('barber_id', barber.id).eq('appointment_date', today).eq('status', 'completed'),
    admin.from('appointments').select('*', { count: 'exact', head: true })
      .eq('barber_id', barber.id).gte('appointment_date', currentStart).neq('status', 'cancelled'),
    admin.from('appointments')
      .select('appointment_date, status, payment_status, service:services(price)')
      .eq('barber_id', barber.id)
      .gte('appointment_date', previousStart)
      .lte('appointment_date', today),
    admin.from('appointments')
      .select('appointment_date, status, payment_status, service:services(price)')
      .eq('barber_id', barber.id)
      .in('status', ['confirmed', 'completed'])
      .neq('payment_status', 'paid')
      .order('appointment_date', { ascending: false }),
    admin.from('financial_goals')
      .select('target_amount')
      .eq('barber_id', barber.id)
      .eq('month_start', currentStart)
      .maybeSingle(),
  ])

  const appointments = (upcomingAppointments ?? []) as Appointment[]
  const todayAppointments = appointments.filter((item) => item.appointment_date === today)
  const next = appointments[0]
  const nextPaymentPending = next?.payment_status !== 'paid'
  const nextPaymentLabel = nextPaymentPending
    ? next?.payment_method === 'pix' ? 'Pix a confirmar' : 'Pagar na barbearia'
    : 'Pagamento confirmado'
  const firstName = barber.barber_name.split(' ')[0]
  const dateLabel = format(parseISO(today), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const appUrl = getPublicAppUrl()
  const financialSummary = calculateFinancialSummary({
    appointments: (financialResult.data ?? []) as unknown as FinancialAppointment[],
    pendingAppointments: (pendingResult.data ?? []) as unknown as FinancialAppointment[],
    today,
  })
  const financialDataAvailable = !financialResult.error && !pendingResult.error
  const goalAmount = goalResult.data ? Number(goalResult.data.target_amount) : null
  const billingAccess = await getBillingAccessByBarberId(barber.id)
  const trialDaysLeft = billingAccess.reason === 'free_trial' && billingAccess.trialEndsAt
    ? Math.max(1, calendarDaysBetween(today, getSaoPauloDate(new Date(billingAccess.trialEndsAt))))
    : null

  return (
    <>
      <DashboardAutoRefresh />
      <Header
        barber={barber}
        title={`Olá, ${firstName}`}
        subtitle={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        notifications={appointments}
      />
      <div className="flex-1 space-y-4 px-4 pb-5">
        {trialDaysLeft && (
          <Link href="/assinatura" className="flex items-center gap-3 rounded-xl border border-[#F5C400]/30 bg-[#F5C400]/[0.07] px-3.5 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5C400]/10 text-[#F5C400]"><Hourglass className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-xs text-white">Teste gratuito: {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}</strong><span className="text-[10px] text-[#A2A6AD]">Escolha um plano antes do término para continuar usando.</span></span>
            <ChevronRight className="h-4 w-4 text-[#F5C400]" />
          </Link>
        )}
        <div className="flex justify-end">
          <Link data-tour="share-link" href={`${appUrl}/agendar/${barber.slug}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#F5C400]/70 px-3 text-xs font-medium text-[#F5C400] hover:bg-[#F5C400]/10">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar link
          </Link>
        </div>

        <section data-tour="next-appointment" className="dashboard-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2.5">
            <p className="flex items-center gap-2 text-xs text-[#D7DADE]"><CalendarClock className="h-4 w-4 text-[#F5C400]" /> Próximo atendimento</p>
            <Link href="/agendamentos" aria-label="Ver agenda"><ChevronRight className="h-4 w-4 text-[#858A93]" /></Link>
          </div>
          {next ? (
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-[58px] border-r border-white/10 pr-3 text-center text-[20px] font-semibold text-[#F5C400]">{formatTime(next.appointment_time)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{next.client_name}</p>
                <p className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium ${nextPaymentPending ? 'bg-[#F5C400]/15 text-[#F5C400]' : 'bg-[#22C55E]/15 text-[#65D787]'}`}>
                  <CircleDollarSign className="h-3 w-3" /> {nextPaymentLabel}
                </p>
                <p className="truncate text-[11px] text-[#858A93]">{next.service?.name ?? 'Serviço'}</p>
              </div>
              <span className="rounded-full bg-[#22C55E]/15 px-2 py-1 text-[9px] font-medium text-[#65D787]">Confirmado</span>
            </div>
          ) : (
            <p className="px-4 py-5 text-center text-xs text-[#858A93]">Nenhum atendimento próximo.</p>
          )}
        </section>

        <div data-tour="dashboard-insights">
        <DashboardInsights
          summary={financialSummary}
          goalAmount={goalAmount}
          financialDataAvailable={financialDataAvailable}
          counts={{
            today: todayAppointments.length,
            nextSevenDays: appointments.length,
            completedToday: completedToday ?? 0,
            month: totalMonth ?? 0,
          }}
          todayAppointmentTimes={todayAppointments.map((appointment) => appointment.appointment_time)}
        />
        </div>
      </div>
    </>
  )
}
