'use client'

import Link from 'next/link'
import { ArrowLeft, Heart, MapPin, Star } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { useFavoriteBarbershops } from '@/hooks/useFavoriteBarbershops'

export default function ClientFavoritesPage() {
  const { favorites, toggleFavorite } = useFavoriteBarbershops()

  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-4 pt-4 sm:px-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm text-[#9CA3AF]">Acesso rápido</p>
            <h1 className="text-[24px] font-semibold text-white">Favoritos</h1>
          </div>
        </header>

        <section className="mt-6 space-y-3">
          {favorites.map((barber) => (
            <div key={barber.slug} className="premium-card flex items-center gap-4 p-3">
              <Link href={`/agendar/${barber.slug}`} className="shrink-0">
                <img src={barber.photo} alt={barber.name} className="h-16 w-16 rounded-lg object-cover" />
              </Link>
              <Link href={`/agendar/${barber.slug}`} className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-white">{barber.location.split(' - ')[0]}</h2>
                <p className="truncate text-sm text-[#9CA3AF]">{barber.name}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[#F4B400]">
                    <Star className="h-3.5 w-3.5 fill-current" /> {barber.rating}
                  </span>
                  <span className="flex items-center gap-1 text-[#9CA3AF]">
                    <MapPin className="h-3.5 w-3.5 text-[#F4B400]" /> {barber.distance}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => toggleFavorite(barber.slug)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 text-[#EF4444]"
                aria-label="Desfavoritar barbearia"
              >
                <Heart className="h-5 w-5 fill-current" />
              </button>
            </div>
          ))}
        </section>

        {favorites.length === 0 && (
          <div className="premium-card mt-6 p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#F4B400]" />
            <h2 className="mt-3 font-semibold text-white">Nenhuma barbearia favorita</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">Favorite uma barbearia na tela inicial para encontrá-la aqui.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
