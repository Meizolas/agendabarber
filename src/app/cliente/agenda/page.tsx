import Link from 'next/link'
import { ArrowLeft, CalendarCheck, Clock3, MapPin } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { barberPhotos } from '@/lib/premium-data'

export default function ClientAgendaPage() {
  const appointments = [
    ['Terca, 23 Mai - 15:00', 'Corte + Barba', 'Fernando Almeida'],
    ['Quinta, 01 Jun - 10:00', 'Corte Masculino', 'Rafael Souza'],
  ]

  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-5 pt-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <p className="text-sm text-[#9CA3AF]">Sua rotina organizada</p>
            <h1 className="text-[24px] font-semibold text-white">Meus agendamentos</h1>
          </div>
        </header>
        <div className="mt-6 flex rounded-lg bg-[#101214] p-1">
          <button className="h-10 flex-1 rounded-md bg-[#F4B400] text-sm font-semibold text-[#08090A]">Proximos</button>
          <button className="h-10 flex-1 rounded-md text-sm font-semibold text-[#9CA3AF]">Historico</button>
        </div>
        <section className="mt-5 space-y-3">
          {appointments.map(([date, service, barber]) => (
            <div key={date} className="premium-card flex gap-4 p-4">
              <img src={barberPhotos.cut} alt={service} className="h-20 w-20 rounded-lg object-cover" />
              <div>
                <p className="font-semibold text-white">{date}</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">{service}</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">com {barber}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-[#9CA3AF]">
                  <Clock3 className="h-3.5 w-3.5 text-[#F4B400]" /> 60 min
                  <MapPin className="h-3.5 w-3.5 text-[#F4B400]" /> Moema
                </div>
              </div>
            </div>
          ))}
        </section>
        <div className="premium-card mt-5 flex items-center gap-3 p-4 text-[#9CA3AF]">
          <CalendarCheck className="h-5 w-5 text-[#22C55E]" />
          <span className="text-sm">Voce recebera lembretes antes do horario.</span>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
