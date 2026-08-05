'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Clock3, Loader2, UserRound } from 'lucide-react'
import type { Barber, Service, StaffMember } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getSaoPauloDate } from '@/lib/utils/timezone'

interface ManualAppointmentDialogProps {
  open: boolean
  barber: Barber | null
  initialDate: string
  onOpenChange: (open: boolean) => void
  onCreated: (date: string) => void
}

const fieldClass = 'h-11 w-full rounded-lg border border-white/10 bg-[#111315] px-3 text-sm text-white outline-none transition focus:border-[#F5C400]/70 disabled:cursor-not-allowed disabled:opacity-50'

export function ManualAppointmentDialog({
  open,
  barber,
  initialDate,
  onOpenChange,
  onCreated,
}: ManualAppointmentDialogProps) {
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [clientName, setClientName] = useState('')
  const [clientWhatsapp, setClientWhatsapp] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [staffMemberId, setStaffMemberId] = useState('')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    setDate(initialDate < getSaoPauloDate() ? getSaoPauloDate() : initialDate)
    setTime('')
    setLoadingData(true)
    Promise.all([fetch('/api/services'), fetch('/api/staff')])
      .then(async ([servicesResponse, staffResponse]) => {
        const [servicesPayload, staffPayload] = await Promise.all([
          servicesResponse.json().catch(() => null),
          staffResponse.json().catch(() => null),
        ])
        if (!servicesResponse.ok || !staffResponse.ok) throw new Error('Não foi possível carregar os dados.')
        const activeServices = (servicesPayload?.services ?? []).filter((service: Service) => service.is_active)
        const activeStaff = (staffPayload?.staff ?? []).filter((member: StaffMember) => member.is_active)
        setServices(activeServices)
        setStaff(activeStaff)
        setServiceId((current) => activeServices.some((service: Service) => service.id === current) ? current : activeServices[0]?.id ?? '')
        setStaffMemberId((current) => activeStaff.some((member: StaffMember) => member.id === current) ? current : activeStaff[0]?.id ?? '')
      })
      .catch((error) => toast({ title: 'Erro ao abrir agenda', description: error.message, variant: 'destructive' }))
      .finally(() => setLoadingData(false))
  }, [initialDate, open, toast])

  useEffect(() => {
    if (!open || !barber?.id || !date || !serviceId || !staffMemberId) {
      setSlots([])
      return
    }
    const controller = new AbortController()
    const params = new URLSearchParams({
      barber_id: barber.id,
      staff_member_id: staffMemberId,
      service_id: serviceId,
      date,
    })
    setLoadingSlots(true)
    setTime('')
    fetch(`/api/available-slots?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? 'Não foi possível buscar os horários.')
        setSlots(payload?.slots ?? [])
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setSlots([])
          toast({ title: 'Erro ao buscar horários', description: error.message, variant: 'destructive' })
        }
      })
      .finally(() => setLoadingSlots(false))
    return () => controller.abort()
  }, [barber?.id, date, open, serviceId, staffMemberId, toast])

  const ready = useMemo(
    () => clientName.trim().length >= 2
      && clientWhatsapp.replace(/\D/g, '').length >= 10
      && Boolean(serviceId && staffMemberId && date && time),
    [clientName, clientWhatsapp, date, serviceId, staffMemberId, time],
  )

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready || submitting) return
    setSubmitting(true)
    const response = await fetch('/api/appointments/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: clientName,
        client_whatsapp: clientWhatsapp,
        service_id: serviceId,
        staff_member_id: staffMemberId,
        appointment_date: date,
        appointment_time: time,
        notes,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      toast({ title: 'Não foi possível agendar', description: payload?.error ?? 'Tente novamente.', variant: 'destructive' })
      setSubmitting(false)
      return
    }

    toast({ title: 'Agendamento adicionado', description: 'O horário já está indisponível no link compartilhado.' })
    setClientName('')
    setClientWhatsapp('')
    setNotes('')
    setTime('')
    setSubmitting(false)
    onOpenChange(false)
    onCreated(date)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-24px)] max-w-md overflow-y-auto rounded-2xl border-white/10 bg-[#080A0C] p-4 text-white shadow-2xl">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5C400]/10 text-[#F5C400]"><CalendarPlus className="h-5 w-5" /></span>
            Novo agendamento
          </DialogTitle>
          <DialogDescription className="text-xs text-[#858A93]">
            Registre um cliente atendido por telefone ou presencialmente.
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="grid min-h-52 place-items-center text-[#F5C400]"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#B8BDC5]">Cliente</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#737881]" />
                <input className={`${fieldClass} pl-9`} value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome do cliente" maxLength={100} autoFocus />
              </div>
              <input className={fieldClass} type="tel" inputMode="tel" value={clientWhatsapp} onChange={(event) => setClientWhatsapp(event.target.value)} placeholder="WhatsApp com DDD" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-[11px] font-medium text-[#B8BDC5]">
                <span>Profissional</span>
                <select className={fieldClass} value={staffMemberId} onChange={(event) => setStaffMemberId(event.target.value)}>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-[11px] font-medium text-[#B8BDC5]">
                <span>Serviço</span>
                <select className={fieldClass} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </label>
            </div>

            <label className="block space-y-1.5 text-[11px] font-medium text-[#B8BDC5]">
              <span>Data</span>
              <input className={fieldClass} type="date" min={getSaoPauloDate()} value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#B8BDC5]">Horário disponível</span>
                {loadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F5C400]" />}
              </div>
              {!loadingSlots && slots.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#111315] px-3 py-4 text-center text-xs text-[#737881]">
                  Nenhum horário disponível nesta data.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button key={slot} type="button" onClick={() => setTime(slot)} className={`h-10 rounded-lg border text-xs font-semibold transition ${time === slot ? 'border-[#F5C400] bg-[#F5C400] text-black' : 'border-white/10 bg-[#111315] text-[#D7DADE]'}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-[#111315] p-3 text-sm text-white outline-none placeholder:text-[#60656D] focus:border-[#F5C400]/70" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observação (opcional)" maxLength={500} />

            <div className="rounded-lg border border-[#F5C400]/15 bg-[#F5C400]/[0.05] p-3 text-[10px] leading-relaxed text-[#A2A6AD]">
              <Clock3 className="mr-1.5 inline h-3.5 w-3.5 text-[#F5C400]" />
              O pagamento ficará marcado para ser feito na barbearia.
            </div>

            <button type="submit" disabled={!ready || submitting || loadingSlots} className="gold-action flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Salvando...' : 'Adicionar à agenda'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
