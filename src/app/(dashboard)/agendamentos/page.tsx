'use client'

import { useCallback, useEffect, useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Appointment, Barber } from '@/types'
import { Header } from '@/components/dashboard/Header'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { getSaoPauloDate } from '@/lib/utils/timezone'
import { demoBarber, demoServices } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'
import { ManualAppointmentDialog } from '@/components/dashboard/ManualAppointmentDialog'

export default function AgendamentosPage() {
  const [barber, setBarber] = useState<Barber | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getSaoPauloDate()
    if (typeof window === 'undefined') return today
    return new URLSearchParams(window.location.search).get('date') ?? today
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [demoMode, setDemoMode] = useState(false)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; id: string | null; action: 'cancelled' | 'completed' | null }>({ open: false, id: null, action: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null)
  const [manualAppointmentOpen, setManualAppointmentOpen] = useState(false)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    const selected = parseISO(selectedDate)
    const firstDay = startOfWeek(selected, { weekStartsOn: 0 })
    const params = new URLSearchParams({ status: statusFilter })

    if (viewMode === 'week') {
      params.set('from', format(firstDay, 'yyyy-MM-dd'))
      params.set('to', format(addDays(firstDay, 6), 'yyyy-MM-dd'))
    } else {
      params.set('date', selectedDate)
    }

    const response = await fetch(`/api/appointments?${params.toString()}`)
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      if (window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
        const demoAppointments: Appointment[] = [
          {
            id: 'demo-appointment-1', barber_id: demoBarber.id, service_id: demoServices[0].id,
            client_name: 'Cliente Teste', client_whatsapp: '11988887777', appointment_date: selectedDate,
            appointment_time: '10:30:00', notes: 'Corte social com acabamento.', status: 'confirmed',
            created_at: '', updated_at: '', service: demoServices[0],
          },
          {
            id: 'demo-appointment-2', barber_id: demoBarber.id, service_id: demoServices[1].id,
            client_name: 'Lucas Almeida', client_whatsapp: '11977776666', appointment_date: format(addDays(selected, 1), 'yyyy-MM-dd'),
            appointment_time: '14:30:00', notes: null, status: 'completed',
            created_at: '', updated_at: '', service: demoServices[1],
          },
        ]
        const visibleDemoAppointments = viewMode === 'week'
          ? demoAppointments
          : demoAppointments.filter((item) => item.appointment_date === selectedDate)
        setDemoMode(true)
        setBarber(demoBarber)
        setAppointments(statusFilter === 'all' ? visibleDemoAppointments : visibleDemoAppointments.filter((item) => item.status === statusFilter))
      } else {
        toast({ title: 'Erro ao carregar agendamentos', description: payload?.error ?? 'Tente novamente.', variant: 'destructive' })
      }
    } else {
      setBarber(payload.barber)
      setAppointments(payload.appointments ?? [])
    }
    setLoading(false)
  }, [selectedDate, statusFilter, toast, viewMode])

  useEffect(() => { loadData() }, [loadData])

  const handleAction = async () => {
    if (!actionDialog.id || !actionDialog.action) return
    setActionLoading(true)
    if (demoMode) {
      setAppointments((current) => current.map((item) => item.id === actionDialog.id && actionDialog.action ? { ...item, status: actionDialog.action } : item))
      setActionDialog({ open: false, id: null, action: null })
      setActionLoading(false)
      return
    }
    const response = await fetch(`/api/appointments/${actionDialog.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: actionDialog.action }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) toast({ title: 'Erro', description: payload?.error ?? 'Tente novamente.', variant: 'destructive' })
    else {
      toast({ title: actionDialog.action === 'cancelled' ? 'Agendamento cancelado' : 'Agendamento concluído' })
      setActionDialog({ open: false, id: null, action: null })
      loadData()
    }
    setActionLoading(false)
  }

  const confirmPayment = async (id: string) => {
    setPaymentLoadingId(id)
    if (demoMode) {
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, payment_status: 'paid', payment_confirmed_at: new Date().toISOString() } : item))
      setPaymentLoadingId(null)
      return
    }
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid' }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) toast({ title: 'Erro', description: payload?.error ?? 'Nao foi possivel confirmar o pagamento.', variant: 'destructive' })
    else {
      toast({ title: 'Pagamento confirmado' })
      loadData()
    }
    setPaymentLoadingId(null)
  }

  if (loading) return <PageLoading />
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const appointmentsByDate = appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    groups[appointment.appointment_date] = [...(groups[appointment.appointment_date] ?? []), appointment]
    return groups
  }, {})

  return (
    <>
      <Header barber={barber} title="Agendamentos" />
      <div className="flex-1 space-y-3 px-4 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-white/10 bg-[#101214] p-0.5 text-[10px]">
            <button type="button" aria-pressed={viewMode === 'day'} onClick={() => setViewMode('day')} className={`rounded px-4 py-1.5 ${viewMode === 'day' ? 'bg-[#F5C400] text-black' : 'text-[#858A93]'}`}>Dia</button>
            <button type="button" aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')} className={`rounded px-4 py-1.5 ${viewMode === 'week' ? 'bg-[#F5C400] text-black' : 'text-[#858A93]'}`}>Semana</button>
          </div>
          <button type="button" onClick={() => setManualAppointmentOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#F5C400] px-3 text-[10px] font-semibold text-black shadow-[0_8px_20px_rgba(245,196,0,0.16)]">
            <CalendarPlus className="h-4 w-4" />
            Novo
          </button>
        </div>

        <div className="dashboard-card p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setSelectedDate(format(addDays(weekStart, -7), 'yyyy-MM-dd'))} className="text-[#858A93]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-medium capitalize text-white">{format(parseISO(selectedDate), 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setSelectedDate(format(addDays(weekStart, 7), 'yyyy-MM-dd'))} className="text-[#858A93]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => {
              const value = format(day, 'yyyy-MM-dd')
              const active = value === selectedDate
              return <button key={value} onClick={() => setSelectedDate(value)} className={`rounded-md py-1.5 ${active ? 'bg-[#F5C400] text-black' : 'text-[#A2A6AD]'}`}><span className="block text-[8px] uppercase">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span><span className="mt-0.5 block text-xs font-semibold">{format(day, 'dd')}</span></button>
            })}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([['all', 'Todos'], ['confirmed', 'Confirmados'], ['completed', 'Concluídos'], ['cancelled', 'Cancelados']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setStatusFilter(value)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] ${statusFilter === value ? 'border-[#F5C400] bg-[#F5C400]/10 text-[#F5C400]' : 'border-white/10 text-[#858A93]'}`}>{label}</button>
          ))}
        </div>

        {appointments.length === 0 ? (
          <div className="dashboard-card p-8 text-center"><CalendarCheck className="mx-auto mb-3 h-10 w-10 text-[#F5C400]" /><p className="text-xs font-medium text-[#858A93]">Nenhum agendamento encontrado</p></div>
        ) : (
          viewMode === 'week' ? (
            <div className="space-y-4">
              {Object.entries(appointmentsByDate).map(([date, dayAppointments]) => (
                <section key={date}>
                  <h2 className="mb-2 border-l-2 border-[#F5C400] pl-2 text-[11px] font-medium capitalize text-[#D7DADE]">
                    {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <div className="space-y-2.5">
                    {dayAppointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onAction={(id, action) => setActionDialog({ open: true, id, action })} onPaymentConfirm={confirmPayment} paymentLoading={paymentLoadingId === appointment.id} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {appointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onAction={(id, action) => setActionDialog({ open: true, id, action })} onPaymentConfirm={confirmPayment} paymentLoading={paymentLoadingId === appointment.id} />)}
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((current) => ({ ...current, open }))}
        title={actionDialog.action === 'cancelled' ? 'Cancelar agendamento' : 'Concluir agendamento'}
        description={actionDialog.action === 'cancelled' ? 'Deseja cancelar este agendamento?' : 'Marcar este agendamento como concluído?'}
        confirmLabel={actionDialog.action === 'cancelled' ? 'Cancelar agendamento' : 'Concluir'}
        onConfirm={handleAction}
        loading={actionLoading}
        variant={actionDialog.action === 'cancelled' ? 'destructive' : 'default'}
      />
      <ManualAppointmentDialog
        open={manualAppointmentOpen}
        barber={barber}
        initialDate={selectedDate}
        onOpenChange={setManualAppointmentOpen}
        onCreated={(date) => {
          setSelectedDate(date)
          loadData()
        }}
      />
    </>
  )
}
