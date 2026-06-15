'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, CalendarCheck, Clock3, MapPin } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { barberPhotos } from '@/lib/premium-data'

type AgendaTab = 'upcoming' | 'history'

const appointments = {
  upcoming: [
    {
      date: 'Terça, 23 Mai - 15:00',
      service: 'Corte + Barba',
      barber: 'Fernando Almeida',
      place: 'Barber House - Moema',
      duration: '60 min',
      photo: barberPhotos.cut,
      status: 'Confirmado',
    },
    {
      date: 'Quinta, 01 Jun - 10:00',
      service: 'Degradê',
      barber: 'Rafael Souza',
      place: 'The Black Shop - Brooklyn',
      duration: '45 min',
      photo: barberPhotos.barber,
      status: 'Confirmado',
    },
  ],
  history: [
    {
      date: 'Sexta, 12 Mai - 18:00',
      service: 'Barba',
      barber: 'Bruno Martins',
      place: 'Old Naval - Vila Madalena',
      duration: '30 min',
      photo: barberPhotos.beard,
      status: 'Concluído',
    },
    {
      date: 'Sábado, 06 Mai - 11:30',
      service: 'Tratamento',
      barber: 'Fernando Almeida',
      place: 'Barber House - Moema',
      duration: '45 min',
      photo: barberPhotos.tools,
      status: 'Concluído',
    },
  ],
}

export default function ClientAgendaPage() {
  const [tab, setTab] = useState<AgendaTab>('upcoming')
  const list = appointments[tab]

  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-4 pt-4 sm:px-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-[#9CA3AF]">Sua rotina organizada</p>
            <h1 className="truncate text-[24px] font-semibold text-white">Meus agendamentos</h1>
          </div>
        </header>

        <div className="mt-6 flex rounded-lg bg-[#101214] p-1">
          <button
            onClick={() => setTab('upcoming')}
            className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
              tab === 'upcoming' ? 'bg-[#F4B400] text-[#08090A]' : 'text-[#9CA3AF]'
            }`}
          >
            Próximos
          </button>
          <button
            onClick={() => setTab('history')}
            className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
              tab === 'history' ? 'bg-[#F4B400] text-[#08090A]' : 'text-[#9CA3AF]'
            }`}
          >
            Histórico
          </button>
        </div>

        <section className="mt-5 space-y-3">
          {list.map((appointment) => (
            <div key={`${appointment.date}-${appointment.service}`} className="premium-card flex gap-4 p-4">
              <img src={appointment.photo} alt={appointment.service} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white">{appointment.date}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    tab === 'history' ? 'bg-sky-500/15 text-sky-300' : 'bg-[#22C55E]/15 text-[#22C55E]'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#9CA3AF]">{appointment.service}</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">com {appointment.barber}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[#F4B400]" /> {appointment.duration}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#F4B400]" /> {appointment.place}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="premium-card mt-5 flex items-center gap-3 p-4 text-[#9CA3AF]">
          <CalendarCheck className="h-5 w-5 text-[#22C55E]" />
          <span className="text-sm">
            {tab === 'history'
              ? 'Aqui ficam seus atendimentos anteriores.'
              : 'Você receberá lembretes antes do horário.'}
          </span>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
