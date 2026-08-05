import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, ChevronRight, CircleDollarSign, Share2 } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { Header } from '@/components/dashboard/Header'
import { formatTime } from '@/lib/utils/format'
import { addCalendarDays, getSaoPauloDate } from '@/lib/utils/timezone'
import { getPublicAppUrl } from '@/lib/utils/app-url'
import type { Metadata } from 'next'
import type { Appointment } from '@/types'

export const metadata: Metadata = { title: 'Dashboard | AgendBarber' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('*').eq('user_id', user.id).single()
  if (!barber) redirect('/perfil')

  const today = getSaoPauloDate()
  const weekEnd = addCalendarDays(today, 6)
  const [{ data: upcomingAppointments }, { count: completedToday }, { count: totalMonth }] = await Promise.all([
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
      .eq('barber_id', barber.id).gte('appointment_date', `${today.slice(0, 7)}-01`).neq('status', 'cancelled'),
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

  return (
    <>
      <Header barber={barber} title={`Olá, ${firstName}`} subtitle={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} notifications={appointments} />
      <div className="flex-1 space-y-4 px-4 pb-5">
        <div className="flex justify-end">
          <Link href={`${appUrl}/agendar/${barber.slug}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#F5C400]/70 px-3 text-xs font-medium text-[#F5C400] hover:bg-[#F5C400]/10">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar link
          </Link>
        </div>

        <section className="dashboard-card overflow-hidden">
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

        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat label="Hoje" value={todayAppointments.length} />
          <MiniStat label="Próximos 7 dias" value={appointments.length} />
          <MiniStat label="Concluídos" value={completedToday ?? 0} />
          <MiniStat label="No mês" value={totalMonth ?? 0} />
        </div>

        <section>
          <h2 className="mb-3 border-l-2 border-[#F5C400] pl-2 text-sm font-medium text-white">Agenda de hoje</h2>
          <div className="dashboard-card px-3 pb-3 pt-4">
            <div className="grid grid-cols-[30px_1fr] gap-2">
              <div className="flex h-28 flex-col justify-between text-[9px] text-[#737881]"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
              <div className="relative flex h-28 items-end justify-around border-b border-white/10">
                <span className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/[0.06]" />
                <span className="absolute inset-x-0 top-2/3 border-t border-dashed border-white/[0.06]" />
                {[40, 67, 52, 35, 61, 82, 48, 70, 45].map((height, index) => (
                  <span key={index} className={`relative w-3 rounded-t-sm ${index === 5 ? 'bg-[#F5C400]' : 'bg-[#5B6068]'}`} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="dashboard-card px-3 py-3 text-center">
      <p className="text-[11px] text-[#858A93]">{label}</p>
      <p className="mt-1 text-[25px] font-semibold leading-none text-white">{value}</p>
    </div>
  )
}
