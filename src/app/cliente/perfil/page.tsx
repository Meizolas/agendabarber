import Link from 'next/link'
import { ArrowLeft, Bell, ChevronRight, CreditCard, Headphones, LogOut, MapPin, Settings, UserRound } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { barberPhotos } from '@/lib/premium-data'

const items = [
  { label: 'Dados pessoais', icon: UserRound },
  { label: 'Enderecos', icon: MapPin },
  { label: 'Formas de pagamento', icon: CreditCard },
  { label: 'Notificacoes', icon: Bell },
  { label: 'Configuracoes', icon: Settings },
  { label: 'Ajuda e suporte', icon: Headphones },
]

export default function ClientProfilePage() {
  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-5 pt-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-[24px] font-semibold text-white">Perfil</h1>
        </header>
        <section className="mt-7 flex items-center gap-4">
          <img src={barberPhotos.barber} alt="Lucas Oliveira" className="h-20 w-20 rounded-[22px] object-cover ring-1 ring-white/10" />
          <div>
            <h2 className="text-[20px] font-semibold text-white">Lucas Oliveira</h2>
            <p className="text-sm text-[#9CA3AF]">Ver perfil publico</p>
          </div>
        </section>
        <section className="premium-card mt-7 divide-y divide-white/10 overflow-hidden">
          {items.map((item) => (
            <button key={item.label} className="flex h-14 w-full items-center gap-3 px-4 text-left">
              <item.icon className="h-5 w-5 text-[#F4B400]" />
              <span className="flex-1 text-sm font-medium text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-[#6B7280]" />
            </button>
          ))}
        </section>
        <button className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 py-3 text-sm font-semibold text-[#EF4444]">
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
      <BottomNav />
    </main>
  )
}
