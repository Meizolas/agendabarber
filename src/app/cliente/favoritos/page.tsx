import Link from 'next/link'
import { ArrowLeft, Heart, Star } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { featuredBarbers } from '@/lib/premium-data'

export default function ClientFavoritesPage() {
  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-5 pt-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <p className="text-sm text-[#9CA3AF]">Acesso rapido</p>
            <h1 className="text-[24px] font-semibold text-white">Favoritos</h1>
          </div>
        </header>
        <section className="mt-6 space-y-3">
          {featuredBarbers.map((barber) => (
            <div key={barber.name} className="premium-card flex items-center gap-4 p-3">
              <img src={barber.photo} alt={barber.name} className="h-16 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-white">{barber.name}</h2>
                <p className="truncate text-sm text-[#9CA3AF]">{barber.location}</p>
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#F4B400]">
                  <Star className="h-4 w-4 fill-current" /> {barber.rating} ({barber.reviews})
                </p>
              </div>
              <Heart className="h-5 w-5 fill-[#EF4444] text-[#EF4444]" />
            </div>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  )
}
