import Link from 'next/link'
import { Users, Search, CalendarDays, Phone, ChevronRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDateShort, formatTime, formatWhatsApp } from '@/lib/utils/format'
import { getSaoPauloDate } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = '' } = await searchParams
  const user = await getCurrentUser()
  const supabase = createServiceClient()
  const { data: barber } = user ? await supabase.from('barbers').select('id').eq('user_id', user.id).single() : { data: null }
  let customersQuery = barber ? supabase.from('customers').select('id, name, whatsapp, appointments(id, appointment_date, appointment_time, status)').eq('barber_id', barber.id).order('name') : null
  if (customersQuery && search.trim()) customersQuery = customersQuery.or(`name.ilike.%${search.trim()}%,whatsapp.ilike.%${search.trim()}%`)
  const { data: customers } = customersQuery ? await customersQuery : { data: [] }
  const today = getSaoPauloDate()

  return <div className="flex-1 px-4 pb-8 pt-7">
    <header className="mb-6"><p className="text-xs uppercase tracking-[0.18em] text-[#F5C400]">Relacionamento</p><h1 className="mt-2 text-2xl font-semibold">Clientes</h1><p className="mt-1 text-sm text-[#858A93]">{customers?.length ?? 0} clientes cadastrados automaticamente</p></header>
    <form method="get" className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#111315] px-4 py-3"><Search className="h-4 w-4 text-[#858A93]" /><input name="search" defaultValue={search} placeholder="Buscar nome ou WhatsApp" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#858A93]" /></form>
    <div className="space-y-3">
      {(customers ?? []).map((customer) => {
        const appointments = customer.appointments ?? []
        const upcoming = appointments.filter((item) => item.status === 'confirmed' && item.appointment_date >= today).sort((a, b) => `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`))[0]
        const latest = appointments.filter((item) => item.status === 'completed').sort((a, b) => `${b.appointment_date}${b.appointment_time}`.localeCompare(`${a.appointment_date}${a.appointment_time}`))[0]
        const highlighted = upcoming ?? latest
        return <Link href={`/clientes/${customer.id}`} key={customer.id} className="block rounded-2xl border border-white/10 bg-[#111315] p-4 transition hover:border-[#F5C400]/50">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-white">{customer.name}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-[#A6AAB1]"><Phone className="h-3.5 w-3.5" /> {formatWhatsApp(customer.whatsapp)}</p></div><span className="rounded-full bg-[#F5C400]/10 px-2.5 py-1 text-[10px] text-[#F5C400]">{appointments.length} {appointments.length === 1 ? 'agendamento' : 'agendamentos'}</span></div>
          {highlighted && <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-[#A6AAB1]"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#F5C400]" /> {upcoming ? 'Próximo' : 'Último atendimento'}: {formatDateShort(highlighted.appointment_date)} às {formatTime(highlighted.appointment_time)}</span><ChevronRight className="h-4 w-4" /></div>}
        </Link>
      })}
      {!customers?.length && <div className="rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center"><Users className="mx-auto h-9 w-9 text-[#F5C400]" /><p className="mt-3 font-medium">Ainda não há clientes cadastrados</p><p className="mt-1 text-xs text-[#858A93]">Eles aparecerão aqui após o próximo agendamento.</p></div>}
    </div>
  </div>
}
