import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, Phone, UserRound } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDate, formatTime, formatWhatsApp } from '@/lib/utils/format'
import { CustomerNotesForm } from '@/components/customers/CustomerNotesForm'
import { CustomerContactActions } from '@/components/customers/CustomerContactActions'
import { getSaoPauloDate } from '@/lib/utils/timezone'
import { STATUS_LABELS, type AppointmentStatus } from '@/types'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()
  const supabase = createServiceClient()
  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) notFound()
  const { data: customer } = await supabase.from('customers').select('id, name, whatsapp, notes, appointments(id, appointment_date, appointment_time, status, service:services(name), staff_member:staff_members(name))').eq('id', id).eq('barber_id', barber.id).maybeSingle()
  if (!customer) notFound()

  const appointments = [...(customer.appointments ?? [])].sort((a, b) => `${b.appointment_date}${b.appointment_time}`.localeCompare(`${a.appointment_date}${a.appointment_time}`))
  const now = new Date()
  const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  const nowKey = `${getSaoPauloDate(now)}${currentTime}`
  const next = appointments.filter((item) => item.status === 'confirmed' && `${item.appointment_date}${item.appointment_time}` >= nowKey).at(-1)

  return <div className="flex-1 px-4 pb-8 pt-7">
    <Link href="/clientes" className="mb-6 inline-flex items-center gap-2 text-xs text-[#A6AAB1] hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar para clientes</Link>
    <header><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#F5C400]/10 text-[#F5C400]"><UserRound className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">{customer.name}</h1><p className="mt-1 flex items-center gap-1.5 text-xs text-[#A6AAB1]"><Phone className="h-3.5 w-3.5" /> {formatWhatsApp(customer.whatsapp)}</p></div></div></header>
    <CustomerContactActions name={customer.name} whatsapp={customer.whatsapp} />
    <div className="mt-6 grid grid-cols-2 gap-3"><Summary label="Agendamentos" value={String(appointments.length)} /><Summary label="Próximo horário" value={next ? formatDate(next.appointment_date) : 'Nenhum'} /></div>
    <section className="mt-6"><h2 className="mb-3 text-sm font-semibold text-white">Histórico de agendamentos</h2><div className="space-y-3">{appointments.map((appointment) => { const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service; const staff = Array.isArray(appointment.staff_member) ? appointment.staff_member[0] : appointment.staff_member; return <article key={appointment.id} className="rounded-2xl border border-white/10 bg-[#111315] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{service?.name ?? 'Serviço'}</p><p className="mt-1 text-xs text-[#A6AAB1]">{staff?.name ?? 'Profissional'}</p></div><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-[#A6AAB1]">{STATUS_LABELS[appointment.status as AppointmentStatus]}</span></div><div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-3 text-xs text-[#A6AAB1]"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-[#F5C400]" /> {formatDate(appointment.appointment_date)}</span><span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-[#F5C400]" /> {formatTime(appointment.appointment_time)}</span></div></article> })}{!appointments.length && <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-[#858A93]">Nenhum agendamento encontrado.</p>}</div></section>
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#111315] p-4"><h2 className="mb-3 text-sm font-semibold">Observações internas</h2><CustomerNotesForm customerId={customer.id} initialNotes={customer.notes} /></section>
  </div>
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-[#111315] p-3"><p className="text-[10px] uppercase tracking-wider text-[#858A93]">{label}</p><p className="mt-2 truncate text-sm font-semibold text-[#F5C400]">{value}</p></div> }
