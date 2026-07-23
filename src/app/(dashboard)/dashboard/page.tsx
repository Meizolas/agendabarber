import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { CalendarCheck, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'
import { addCalendarDays, getSaoPauloDate } from '@/lib/utils/timezone'
import type { Metadata } from 'next'
import type { Appointment } from '@/types'

export const metadata: Metadata = { title: 'Dashboard | AgendBarber' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createServiceClient()

  const { data: barber } = await adminClient
    .from('barbers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!barber) redirect('/perfil')

  const today = getSaoPauloDate()
  const weekEnd = addCalendarDays(today, 6)

  const { data: upcomingAppointments } = await adminClient
    .from('appointments')
    .select('*, service:services(*)')
    .eq('barber_id', barber.id)
    .eq('status', 'confirmed')
    .gte('appointment_date', today)
    .lte('appointment_date', weekEnd)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  const { count: completedToday } = await adminClient
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .eq('appointment_date', today)
    .eq('status', 'completed')

  const { count: totalMonth } = await adminClient
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .gte('appointment_date', `${today.slice(0, 7)}-01`)
    .neq('status', 'cancelled')

  const appointments = (upcomingAppointments ?? []) as Appointment[]
  const todayAppointmentsCount = appointments.filter((appointment) => appointment.appointment_date === today).length

  return (
    <>
      <Header barber={barber} title="Dashboard" notifications={appointments} />
      <div className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatsCard
            title="Agendamentos hoje"
            value={todayAppointmentsCount}
            description={formatDateShort(today)}
            icon={CalendarCheck}
            color="amber"
          />
          <StatsCard
            title="Proximos 7 dias"
            value={appointments.length}
            description={`${formatDateShort(today)} ate ${formatDateShort(weekEnd)}`}
            icon={Clock}
            color="blue"
          />
          <StatsCard
            title="Concluidos hoje"
            value={completedToday ?? 0}
            description="atendimentos realizados"
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="Total no mes"
            value={totalMonth ?? 0}
            description="agendamentos no mes"
            icon={TrendingUp}
            color="amber"
          />
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-700 sm:mb-4 sm:text-lg">
            Proximos 7 dias
          </h2>

          {appointments.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center sm:p-10">
              <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum agendamento confirmado na semana</p>
              <p className="text-sm text-slate-400 mt-1">
                Compartilhe seu link e comece a receber clientes.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-[#9CA3AF]">
                    {formatDateShort(apt.appointment_date)}
                  </p>
                  <AppointmentCard appointment={apt} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
