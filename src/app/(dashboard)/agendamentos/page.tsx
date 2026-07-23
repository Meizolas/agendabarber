'use client'

import { useState, useEffect, useCallback } from 'react'
import { Appointment, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { CalendarCheck, Filter } from 'lucide-react'
import { getSaoPauloDate } from '@/lib/utils/timezone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'
import { demoBarber, demoServices } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'

export default function AgendamentosPage() {
  const [barber, setBarber] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getSaoPauloDate()
    if (typeof window === 'undefined') return today
    return new URLSearchParams(window.location.search).get('date') ?? today
  })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionDialog, setActionDialog] = useState<{
    open: boolean; id: string | null; action: 'cancelled' | 'completed' | null
  }>({ open: false, id: null, action: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (false && window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
      setDemoMode(true)
      setBarber(demoBarber)
      const demoAppointments: Appointment[] = [
        {
          id: 'demo-appointment-1',
          barber_id: demoBarber.id,
          service_id: demoServices[0].id,
          client_name: 'Cliente Teste',
          client_whatsapp: '11988887777',
          appointment_date: selectedDate,
          appointment_time: '10:30:00',
          notes: 'Corte social com acabamento.',
          status: 'confirmed',
          created_at: '',
          updated_at: '',
          service: demoServices[0],
        },
      ]
      setAppointments(statusFilter === 'all'
        ? demoAppointments
        : demoAppointments.filter((appointment) => appointment.status === statusFilter))
      setLoading(false)
      return
    }

    const params = new URLSearchParams({ date: selectedDate, status: statusFilter })
    const response = await fetch(`/api/appointments?${params.toString()}`)
    const payload = await response.json()

    if (!response.ok) {
      toast({
        title: 'Erro ao carregar agendamentos',
        description: payload.error ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } else {
      setBarber(payload.barber)
      setAppointments((payload.appointments as Appointment[]) ?? [])
    }
    setLoading(false)
  }, [selectedDate, statusFilter, toast])

  useEffect(() => { loadData() }, [loadData])

  const handleAction = async () => {
    if (!actionDialog.id || !actionDialog.action) return
    setActionLoading(true)

    if (demoMode) {
      setAppointments((current) => current.map((appointment) => (
        appointment.id === actionDialog.id && actionDialog.action
          ? { ...appointment, status: actionDialog.action }
          : appointment
      )))
      toast({
        title: actionDialog.action === 'cancelled' ? 'Agendamento demo cancelado' : 'Agendamento demo concluído',
      })
      setActionDialog({ open: false, id: null, action: null })
      setActionLoading(false)
      return
    }

    const response = await fetch(`/api/appointments/${actionDialog.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: actionDialog.action }),
    })
    const payload = await response.json()

    if (!response.ok) {
      toast({ title: 'Erro', description: payload.error ?? 'Tente novamente.', variant: 'destructive' })
    } else {
      toast({
        title: actionDialog.action === 'cancelled' ? 'Agendamento cancelado' : 'Agendamento concluído',
      })
      setActionDialog({ open: false, id: null, action: null })
      loadData()
    }
    setActionLoading(false)
  }

  if (loading) return <PageLoading />

  return (
    <>
      <Header barber={barber} title="Agendamentos" />
      <div className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sm:max-w-[200px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:max-w-[200px]">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <span
                key={key}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  STATUS_COLORS[key as keyof typeof STATUS_COLORS],
                )}
              >
                {label}: {appointments.filter((a) => a.status === key).length}
              </span>
            ))}
          </div>
        </div>

        {/* List */}
        {appointments.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center sm:p-12">
            <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-500">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {appointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onAction={(id, action) => setActionDialog({ open: true, id, action })}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={actionDialog.open}
        onOpenChange={(o) => setActionDialog({ open: o, id: actionDialog.id, action: actionDialog.action })}
        title={actionDialog.action === 'cancelled' ? 'Cancelar agendamento' : 'Concluir agendamento'}
        description={
          actionDialog.action === 'cancelled'
            ? 'Deseja cancelar este agendamento?'
            : 'Marcar este agendamento como concluído?'
        }
        confirmLabel={actionDialog.action === 'cancelled' ? 'Cancelar agendamento' : 'Concluir'}
        onConfirm={handleAction}
        loading={actionLoading}
        variant={actionDialog.action === 'cancelled' ? 'destructive' : 'default'}
      />
    </>
  )
}
