import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Header } from '@/components/dashboard/Header'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { CalendarCheck, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import { demoBarber, demoServices } from '@/lib/demo-data'
import { DEMO_ROLE_COOKIE } from '@/lib/demo-session'

export const metadata: Metadata = { title: 'Dashboard | AgendBarber' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demoRole = cookies().get(DEMO_ROLE_COOKIE)?.value

  if (!user && demoRole !== 'admin') redirect('/login')

  if (!user && demoRole === 'admin') {
    const today = format(new Date(), 'yyyy-MM-dd')
    const demoAppointments = [
      {
        id: 'demo-appointment-1',
        barber_id: demoBarber.id,
        service_id: demoServices[0].id,
        client_name: 'Cliente Teste',
        client_whatsapp: '11988887777',
        appointment_date: today,
        appointment_time: '10:30:00',
        notes: 'Corte social com acabamento.',
        status: 'confirmed' as const,
        created_at: '',
        updated_at: '',
        service: demoServices[0],
      },
    ]

    return (
      <>
        <Header barber={demoBarber} title="Dashboard" />
        <div className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatsCard title="Agendamentos hoje" value={demoAppointments.length} description={formatDateShort(today)} icon={CalendarCheck} color="amber" />
            <StatsCard title="Confirmados" value={1} description="aguardando atendimento" icon={Clock} color="blue" />
            <StatsCard title="Concluídos hoje" value={0} description="atendimentos realizados" icon={CheckCircle2} color="green" />
            <StatsCard title="Total no mês" value={8} description="agendamentos no mês" icon={TrendingUp} color="amber" />
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-700 sm:mb-4 sm:text-lg">
              Agenda de hoje — {formatDateShort(today)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {demoAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user) redirect('/login')

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!barber) redirect('/perfil')

  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('*, service:services(*)')
    .eq('barber_id', barber.id)
    .eq('appointment_date', today)
    .order('appointment_time', { ascending: true })

  const { count: confirmedToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .eq('appointment_date', today)
    .eq('status', 'confirmed')

  const { count: completedToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .eq('appointment_date', today)
    .eq('status', 'completed')

  const { count: totalMonth } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .gte('appointment_date', format(new Date(), 'yyyy-MM-01'))
    .neq('status', 'cancelled')

  const appointments = todayAppointments ?? []

  return (
    <>
      <Header barber={barber} title="Dashboard" />
      <div className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatsCard
            title="Agendamentos hoje"
            value={appointments.length}
            description={formatDateShort(today)}
            icon={CalendarCheck}
            color="amber"
          />
          <StatsCard
            title="Confirmados"
            value={confirmedToday ?? 0}
            description="aguardando atendimento"
            icon={Clock}
            color="blue"
          />
          <StatsCard
            title="Concluídos hoje"
            value={completedToday ?? 0}
            description="atendimentos realizados"
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="Total no mês"
            value={totalMonth ?? 0}
            description="agendamentos no mês"
            icon={TrendingUp}
            color="amber"
          />
        </div>

        {/* Today's appointments */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-700 sm:mb-4 sm:text-lg">
            Agenda de hoje — {formatDateShort(today)}
          </h2>

          {appointments.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center sm:p-10">
              <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum agendamento para hoje</p>
              <p className="text-sm text-slate-400 mt-1">
                Compartilhe seu link e comece a receber clientes!
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {appointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
