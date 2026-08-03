'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Clock3, MessageCircle, Scissors, Tag } from 'lucide-react'
import type { AvailabilityRule, Barber, Service } from '@/types'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { DateSelector } from '@/components/booking/DateSelector'
import { TimeSelector } from '@/components/booking/TimeSelector'
import { ClientForm, type ClientFormValues } from '@/components/booking/ClientForm'
import { SuccessScreen } from '@/components/booking/SuccessScreen'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BrandLogo } from '@/components/premium/BrandLogo'
import { Button } from '@/components/ui/button'
import { formatDate, formatDuration, formatPrice, formatTime, formatWhatsApp } from '@/lib/utils/format'
import { getOpenStatus } from '@/lib/utils/open-status'
import { getStoredDemoServices } from '@/lib/demo-store'
import { useToast } from '@/components/ui/use-toast'

type Step = 'service' | 'date' | 'time' | 'client' | 'success'

interface BookingState {
  service: Service | null
  date: string | null
  time: string | null
  clientName: string
}

const demoBarber: Barber = {
  id: 'demo', user_id: 'demo', barbershop_name: 'Barber House', barber_name: 'Fernando Almeida',
  whatsapp: '11999999999', slug: 'demo', logo_url: null, created_at: '', updated_at: '',
}
const demoRules: AvailabilityRule[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  id: `demo-${day}`, barber_id: 'demo', day_of_week: day, start_time: '09:00:00', end_time: '18:00:00',
  interval_minutes: 30, is_active: true, created_at: '',
}))
const demoSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '14:00', '14:30', '15:00', '16:00', '17:00', '18:00']
const orderedSteps: Exclude<Step, 'success'>[] = ['service', 'date', 'time', 'client']

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [barber, setBarber] = useState<Barber | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [step, setStep] = useState<Step>('service')
  const [booking, setBooking] = useState<BookingState>({ service: null, date: null, time: null, clientName: '' })
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      if (slug === 'demo') {
        setBarber(demoBarber)
        setServices(getStoredDemoServices().filter((service) => service.is_active))
        setRules(demoRules)
        setLoading(false)
        return
      }

      const response = await fetch(`/api/public/barbers/${encodeURIComponent(slug)}`)
      const payload = await response.json().catch(() => null)
      const barberData = response.ok ? payload?.barber : null
      if (!barberData) {
        if (response.status === 402) { setUnavailable(true); setLoading(false); return }
        setNotFound(true)
        setLoading(false)
        return
      }
      setBarber(barberData)
      setServices(payload.services ?? [])
      setRules(payload.rules ?? [])
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!booking.date || !booking.service || !barber) return
    const loadSlots = async () => {
      setSlotsLoading(true)
      if (barber.id === 'demo') { setSlots(demoSlots); setSlotsLoading(false); return }
      const response = await fetch(`/api/available-slots?barber_id=${barber.id}&date=${booking.date}&service_id=${booking.service!.id}`)
      const data = await response.json().catch(() => null)
      setSlots(data?.slots ?? [])
      setSlotsLoading(false)
    }
    loadSlots()
  }, [booking.date, booking.service, barber])

  const selectService = (service: Service) => setBooking((current) => ({ ...current, service, date: current.service?.id === service.id ? current.date : null, time: current.service?.id === service.id ? current.time : null }))
  const selectDate = (date: string) => setBooking((current) => ({ ...current, date, time: current.date === date ? current.time : null }))
  const selectTime = (time: string) => setBooking((current) => ({ ...current, time }))

  const continueFlow = () => {
    if (step === 'service' && booking.service) setStep('date')
    else if (step === 'date' && booking.date) setStep('time')
    else if (step === 'time' && booking.time) setStep('client')
  }

  const handleSubmit = async (clientData: ClientFormValues) => {
    if (!barber || !booking.service || !booking.date || !booking.time) return
    setSubmitting(true)
    if (barber.id === 'demo') {
      toast({ title: 'Modo demo', description: 'Este link é demonstrativo e não grava dados reais.', variant: 'destructive' })
      setBooking((current) => ({ ...current, clientName: clientData.client_name }))
      setStep('success')
      setSubmitting(false)
      return
    }

    const response = await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barber.id, service_id: booking.service.id, client_name: clientData.client_name,
        client_whatsapp: clientData.client_whatsapp, appointment_date: booking.date,
        appointment_time: booking.time, notes: clientData.notes,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setBooking((current) => ({ ...current, clientName: clientData.client_name }))
      setStep('success')
      if (payload?.notificationError) toast({ title: 'Agendamento criado', description: `Não foi possível enviar WhatsApp: ${payload.notificationError}`, variant: 'destructive' })
    } else toast({ title: 'Erro ao agendar', description: payload?.error ?? 'Não foi possível registrar o agendamento.', variant: 'destructive' })
    setSubmitting(false)
  }

  const resetBooking = () => { setBooking({ service: null, date: null, time: null, clientName: '' }); setStep('service') }
  const availableDays = rules.filter((rule) => rule.is_active).map((rule) => rule.day_of_week)
  const openStatus = getOpenStatus(rules)
  const currentIndex = step === 'success' ? 3 : orderedSteps.indexOf(step)

  if (loading) return <div className="min-h-screen bg-[#080A0C] grid place-items-center"><LoadingSpinner size="lg" text="Carregando..." /></div>
  if (notFound || unavailable) return <div className="min-h-screen bg-[#080A0C] grid place-items-center px-6 text-center"><div><Scissors className="mx-auto mb-4 h-11 w-11 text-[#F5C400]" /><h1 className="text-xl font-semibold text-white">{notFound ? 'Barbearia não encontrada' : 'Agenda temporariamente indisponível'}</h1><p className="mt-2 text-sm text-[#858A93]">{notFound ? 'Verifique o link e tente novamente.' : 'Entre em contato com a barbearia.'}</p></div></div>

  return (
    <main className="min-h-screen bg-[#030405] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] border-x border-white/[0.06] bg-[#080A0C] pb-5 shadow-[0_0_80px_rgba(0,0,0,0.7)]">
        {step === 'success' && booking.service && booking.date && booking.time && barber ? (
          <div className="p-3"><SuccessScreen clientName={booking.clientName} barbershopName={barber.barbershop_name} barbershopLogo={barber.logo_url} barbershopWhatsApp={barber.whatsapp} serviceName={booking.service.name} servicePrice={booking.service.price} serviceDuration={booking.service.duration_minutes} date={booking.date} time={booking.time} onNewBooking={resetBooking} /></div>
        ) : barber && (
          <>
            <BookingHeader barber={barber} openLabel={openStatus.isOpen ? openStatus.label : openStatus.nextLabel || openStatus.label} isOpen={openStatus.isOpen} />
            <div className="px-4">
              <StepProgress current={currentIndex} />
              <motion.section key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }} className="pt-4">
                <p className="text-[10px] font-semibold text-[#F5C400]">{currentIndex + 1} • {['Serviço', 'Data', 'Horário', 'Confirmar'][currentIndex]}</p>
                <h1 className="mb-3 mt-1 text-[22px] font-semibold leading-tight">{['Escolha o serviço', 'Escolha a data', 'Escolha o horário', 'Confirme seu agendamento'][currentIndex]}</h1>

                {step === 'service' && <ServiceSelector services={services} selectedId={booking.service?.id ?? null} onSelect={selectService} />}
                {step === 'date' && booking.service && <><ServiceSummary service={booking.service} /><DateSelector availableDays={availableDays} selectedDate={booking.date} onSelect={selectDate} /></>}
                {step === 'time' && booking.service && booking.date && <><ChoiceSummary service={booking.service} date={booking.date} /><TimeSelector slots={slots} selectedTime={booking.time} onSelect={selectTime} loading={slotsLoading} /></>}
                {step === 'client' && booking.service && booking.date && booking.time && <><ConfirmationSummary service={booking.service} date={booking.date} time={booking.time} /><ClientForm onSubmit={handleSubmit} loading={submitting} /></>}

                {step !== 'client' && (
                  <Button type="button" onClick={continueFlow} disabled={(step === 'service' && !booking.service) || (step === 'date' && !booking.date) || (step === 'time' && !booking.time)} className="gold-action mt-4 w-full justify-between px-5">
                    {step === 'date' ? 'Ver horários' : 'Continuar'} <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </motion.section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function BookingHeader({ barber, openLabel, isOpen }: { barber: Barber; openLabel: string; isOpen: boolean }) {
  return (
    <header className="flex items-center gap-3 px-4 pb-3 pt-5">
      <div className="grid h-[66px] w-[66px] shrink-0 place-items-center overflow-hidden rounded-full border border-[#F5C400]/55 bg-[#111315] p-1">
        {barber.logo_url ? <img src={barber.logo_url} alt={`Logo ${barber.barbershop_name}`} className="h-full w-full rounded-full object-cover" /> : <BrandLogo compact className="[&>div]:hidden" imageClassName="w-10" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{barber.barbershop_name}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#D7DADE]"><MessageCircle className="h-3.5 w-3.5" /> {formatWhatsApp(barber.whatsapp)}</p>
        <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] ${isOpen ? 'bg-[#22C55E]/15 text-[#65D787]' : 'bg-[#EF4444]/15 text-[#FCA5A5]'}`}><span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} /> {openLabel}</span>
      </div>
    </header>
  )
}

function StepProgress({ current }: { current: number }) {
  return <div className="relative mt-1 flex items-center justify-between"><span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-white/20" /><span className="absolute left-4 top-1/2 h-px -translate-y-1/2 bg-[#F5C400] transition-all" style={{ width: `calc((100% - 2rem) * ${current / 3})` }} />{[1, 2, 3, 4].map((number, index) => <span key={number} className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border text-[10px] ${index <= current ? 'border-[#F5C400] bg-[#F5C400] text-black' : 'border-white/25 bg-[#17191C] text-[#A2A6AD]'}`}>{number}</span>)}</div>
}

function ServiceSummary({ service }: { service: Service }) {
  return <div className="mb-3 flex items-center gap-3 rounded-lg border border-white/10 bg-[#17191C] px-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#101214] text-[#F5C400]"><Scissors className="h-4 w-4" /></span><p className="text-xs text-[#D7DADE]"><strong className="text-white">{service.name}</strong> · {formatDuration(service.duration_minutes)} · {formatPrice(service.price)}</p></div>
}

function ChoiceSummary({ service, date }: { service: Service; date: string }) {
  return <div className="mb-4 grid grid-cols-2 divide-x divide-white/10 rounded-lg border border-white/10 bg-[#17191C] p-3 text-[11px]"><span className="flex items-center gap-2"><Scissors className="h-4 w-4 text-[#F5C400]" /> {service.name}</span><span className="flex items-center gap-2 pl-3"><CalendarDays className="h-4 w-4 text-[#A2A6AD]" /> {formatDate(date)}</span></div>
}

function ConfirmationSummary({ service, date, time }: { service: Service; date: string; time: string }) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-[#17191C] p-4 text-xs">
      <p className="flex items-center gap-3"><Scissors className="h-4 w-4 text-[#F5C400]" /> {service.name}</p>
      <p className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-[#D7DADE]" /> {formatDate(date)}</p>
      <p className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-[#D7DADE]" /> {formatTime(time)}</p>
      <p className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-[#D7DADE]" /> {formatDuration(service.duration_minutes)}</p>
      <p className="flex items-center gap-3 font-semibold text-[#F5C400]"><Tag className="h-4 w-4" /> {formatPrice(service.price)}</p>
    </div>
  )
}
