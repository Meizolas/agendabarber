'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Barber, Service, AvailabilityRule } from '@/types'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { DateSelector } from '@/components/booking/DateSelector'
import { TimeSelector } from '@/components/booking/TimeSelector'
import { ClientForm, type ClientFormValues } from '@/components/booking/ClientForm'
import { SuccessScreen } from '@/components/booking/SuccessScreen'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BrandMark } from '@/components/premium/BrandMark'
import { barberPhotos } from '@/lib/premium-data'
import { ChevronLeft, Clock3, MapPin, Scissors, ShieldCheck } from 'lucide-react'
import { formatDate, formatPrice, formatTime } from '@/lib/utils/format'
import { getOpenStatus } from '@/lib/utils/open-status'

type Step = 'service' | 'date' | 'time' | 'client' | 'success'

interface BookingState {
  service: Service | null
  date: string | null
  time: string | null
  clientName: string
}

const demoBarber: Barber = {
  id: 'demo',
  user_id: 'demo',
  barbershop_name: 'Barber House',
  barber_name: 'Fernando Almeida',
  whatsapp: '11999999999',
  slug: 'demo',
  logo_url: null,
  created_at: '',
  updated_at: '',
}

const demoServices: Service[] = [
  { id: 'demo-1', barber_id: 'demo', name: 'Corte + Barba', price: 80, duration_minutes: 60, image_url: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'demo-2', barber_id: 'demo', name: 'Degradê', price: 60, duration_minutes: 45, image_url: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'demo-3', barber_id: 'demo', name: 'Barba', price: 40, duration_minutes: 30, image_url: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'demo-4', barber_id: 'demo', name: 'Tratamento', price: 90, duration_minutes: 45, image_url: null, is_active: true, created_at: '', updated_at: '' },
]

const demoRules: AvailabilityRule[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  id: `demo-${day}`,
  barber_id: 'demo',
  day_of_week: day,
  start_time: '09:00:00',
  end_time: '18:00:00',
  interval_minutes: 30,
  is_active: true,
  created_at: '',
}))

const demoSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [barber, setBarber] = useState<Barber | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('service')
  const [booking, setBooking] = useState<BookingState>({
    service: null,
    date: null,
    time: null,
    clientName: '',
  })
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      if (slug === 'demo') {
        setBarber(demoBarber)
        setServices(demoServices)
        setRules(demoRules)
        setLoading(false)
        return
      }

      const { data: barberData } = await supabase
        .from('barbers')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!barberData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setBarber(barberData)

      const [{ data: svcs }, { data: rulesData }] = await Promise.all([
        supabase.from('services').select('*').eq('barber_id', barberData.id).eq('is_active', true),
        supabase.from('availability_rules').select('*').eq('barber_id', barberData.id).eq('is_active', true),
      ])

      setServices(svcs ?? [])
      setRules(rulesData ?? [])
      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!booking.date || !booking.service || !barber) return

    const loadSlots = async () => {
      setSlotsLoading(true)

      if (barber.id === 'demo') {
        setSlots(demoSlots)
        setSlotsLoading(false)
        return
      }

      const res = await fetch(
        `/api/available-slots?barber_id=${barber.id}&date=${booking.date}&service_id=${booking.service!.id}`,
      )
      const data = await res.json()
      setSlots(data.slots ?? [])
      setSlotsLoading(false)
    }

    loadSlots()
  }, [booking.date, booking.service, barber])

  const handleSelectService = (service: Service) => {
    setBooking((current) => ({ ...current, service, date: null, time: null }))
    setStep('date')
  }

  const handleSelectDate = (date: string) => {
    setBooking((current) => ({ ...current, date, time: null }))
    setStep('time')
  }

  const handleSelectTime = (time: string) => {
    setBooking((current) => ({ ...current, time }))
    setStep('client')
  }

  const handleSubmit = async (clientData: ClientFormValues) => {
    if (!barber || !booking.service || !booking.date || !booking.time) return
    setSubmitting(true)

    if (barber.id === 'demo') {
      setBooking((current) => ({ ...current, clientName: clientData.client_name }))
      setStep('success')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barber_id: barber.id,
        service_id: booking.service.id,
        client_name: clientData.client_name,
        client_whatsapp: clientData.client_whatsapp,
        appointment_date: booking.date,
        appointment_time: booking.time,
        notes: clientData.notes,
      }),
    })

    if (res.ok) {
      setBooking((current) => ({ ...current, clientName: clientData.client_name }))
      setStep('success')
    }

    setSubmitting(false)
  }

  const resetBooking = () => {
    setBooking({ service: null, date: null, time: null, clientName: '' })
    setStep('service')
  }

  const stepBack = () => {
    if (step === 'date') setStep('service')
    else if (step === 'time') setStep('date')
    else if (step === 'client') setStep('time')
  }

  const availableDays = rules.length > 0 ? rules.map((rule) => rule.day_of_week) : [1, 2, 3, 4, 5, 6]
  const openStatus = getOpenStatus(rules)
  const steps: Step[] = ['service', 'date', 'time', 'client']
  const currentStepIndex = Math.max(steps.indexOf(step), 0)
  const stepTitle: Record<Step, string> = {
    service: 'Escolha o serviço',
    date: 'Escolha a data',
    time: 'Escolha o horário',
    client: 'Seus dados',
    success: 'Confirmacao',
  }

  if (loading) {
    return (
      <div className="premium-screen flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="premium-screen flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <Scissors className="mx-auto mb-4 h-12 w-12 text-[#F4B400]" />
          <h1 className="text-[24px] font-semibold text-white">Barbearia nao encontrada</h1>
          <p className="mt-2 text-[#9CA3AF]">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="premium-screen min-h-screen">
      <div className="mx-auto max-w-xl pb-8">
        {step !== 'success' && (
          <section className="relative min-h-[245px] overflow-hidden">
            <img src={barber?.logo_url || barberPhotos.chair} alt={barber?.barbershop_name || 'Barbearia'} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090A] via-black/55 to-black/20" />
            <div className="relative flex min-h-[245px] flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                {step !== 'service' ? (
                  <button onClick={stepBack} className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/35 backdrop-blur">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <BrandMark compact />
                )}
                <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  Etapa {currentStepIndex + 1} de 4
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#F4B400]">{barber?.barber_name}</p>
                <h1 className="mt-2 text-[32px] font-semibold leading-tight text-white">{barber?.barbershop_name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#D1D5DB]">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-[#F4B400]" /> Unidade premium</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-[#22C55E]" /> Confirmacao rapida</span>
                  <span className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                    openStatus.isOpen
                      ? 'border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]'
                      : 'border-[#EF4444]/35 bg-[#EF4444]/12 text-[#FCA5A5]'
                  }`}>
                    {openStatus.label}
                  </span>
                </div>
                {!openStatus.isOpen && openStatus.nextLabel && (
                  <p className="mt-2 text-sm text-[#D1D5DB]">{openStatus.nextLabel}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {step !== 'success' && (
          <div className="px-5">
            <div className="mt-2 grid grid-cols-4 gap-2">
              {steps.map((item, index) => (
                <div key={item} className={`h-1.5 rounded-full ${index <= currentStepIndex ? 'bg-[#F4B400]' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        )}

        <motion.section
          key={step}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-5 pt-6"
        >
          {step !== 'success' && (
            <div className="mb-5">
              <p className="text-sm text-[#9CA3AF]">Agendamento</p>
              <h2 className="text-[24px] font-semibold text-white">{stepTitle[step]}</h2>
            </div>
          )}

          {step !== 'service' && step !== 'success' && (
            <div className="premium-card mb-5 space-y-3 p-4 text-sm">
              {booking.service && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#9CA3AF]">Serviço</span>
                  <span className="text-right font-semibold text-white">{booking.service.name} - {formatPrice(booking.service.price)}</span>
                </div>
              )}
              {booking.date && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#9CA3AF]">Data</span>
                  <span className="text-right font-semibold text-white">{formatDate(booking.date)}</span>
                </div>
              )}
              {booking.time && step === 'client' && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#9CA3AF]">Horário</span>
                  <span className="text-right font-semibold text-white">{formatTime(booking.time)}</span>
                </div>
              )}
            </div>
          )}

          {step === 'service' && (
            services.length > 0 ? (
              <ServiceSelector services={services} selectedId={booking.service?.id ?? null} onSelect={handleSelectService} />
            ) : (
              <div className="premium-card p-6 text-center text-[#9CA3AF]">Nenhum serviço disponível.</div>
            )
          )}

          {step === 'date' && (
            <DateSelector availableDays={availableDays} selectedDate={booking.date} onSelect={handleSelectDate} />
          )}

          {step === 'time' && (
            <TimeSelector slots={slots} selectedTime={booking.time} onSelect={handleSelectTime} loading={slotsLoading} />
          )}

          {step === 'client' && (
            <ClientForm onSubmit={handleSubmit} loading={submitting} />
          )}

          {step === 'success' && booking.service && booking.date && booking.time && barber && (
            <SuccessScreen
              clientName={booking.clientName}
              barbershopName={barber.barbershop_name}
              serviceName={booking.service.name}
              date={booking.date}
              time={booking.time}
              onNewBooking={resetBooking}
            />
          )}
        </motion.section>
      </div>
    </main>
  )
}
