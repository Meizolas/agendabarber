'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Heart,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Star,
  UserRound,
  Scissors,
} from 'lucide-react'
import { BrandMark } from '@/components/premium/BrandMark'
import { BottomNav } from '@/components/premium/BottomNav'
import { barberPhotos, featuredServices } from '@/lib/premium-data'
import { useClientProfile } from '@/hooks/useClientProfile'
import { useMemo, useState } from 'react'
import { nearbyBarbershops, useFavoriteBarbershops } from '@/hooks/useFavoriteBarbershops'

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

const categories = [
  { name: 'Corte', icon: Scissors },
  { name: 'Barba', icon: Shield },
  { name: 'Coloração', icon: Sparkles },
  { name: 'Tratamento', icon: BadgeCheck },
]

export default function HomePage() {
  const { profile } = useClientProfile()
  const { isFavorite, toggleFavorite } = useFavoriteBarbershops()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredBarbershops = useMemo(() => {
    if (!normalizedQuery) return nearbyBarbershops

    return nearbyBarbershops.filter((barber) =>
      [barber.name, barber.location, barber.price]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    )
  }, [normalizedQuery])

  const filteredServices = useMemo(() => {
    if (!normalizedQuery) return featuredServices

    return featuredServices.filter((service) =>
      [service.name, service.description, service.price]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    )
  }, [normalizedQuery])

  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto min-h-screen w-full max-w-xl px-4 pt-4 sm:px-5">
        <motion.header
          {...fadeUp}
          transition={{ duration: 0.45 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={profile.photo}
              alt={profile.name}
              className="h-11 w-11 rounded-lg object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <p className="truncate text-sm text-[#9CA3AF]">Olá, {profile.name.split(' ')[0]}</p>
              <h1 className="truncate text-[22px] font-semibold leading-tight text-white">Seu próximo visual</h1>
            </div>
          </div>
          <Link
            href="/cliente/perfil"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#101214]"
            aria-label="Abrir perfil"
          >
            <UserRound className="h-5 w-5 text-[#F4B400]" />
          </Link>
        </motion.header>

        <motion.label
          {...fadeUp}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="mt-5 flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-[#101214] px-4 text-[#9CA3AF]"
        >
          <Search className="h-5 w-5" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6B7280]"
            placeholder="Buscar barbearias ou serviços"
          />
        </motion.label>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.12 }} className="premium-card mt-5 overflow-hidden">
          <div className="relative min-h-[210px]">
            <img src={barberPhotos.chair} alt="Cadeira premium de barbearia" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/48 to-black/5" />
            <div className="relative flex min-h-[210px] flex-col justify-end p-5">
              <span className="w-fit rounded-full border border-[#F4B400]/30 bg-[#F4B400]/12 px-3 py-1 text-xs font-semibold text-[#F4B400]">
                Corte + Barba
              </span>
              <h2 className="mt-3 max-w-[250px] text-[24px] font-semibold leading-tight text-white">
                Agende hoje com acabamento premium
              </h2>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#F4B400]">R$ 70,00</p>
                <Link href="/agendar/demo" className="premium-button inline-flex h-10 items-center gap-2 px-4 text-sm">
                  Agendar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.18 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Barbearias próximas</h2>
            <Link href="/cliente/servicos" className="text-sm font-medium text-[#F4B400]">Ver todas</Link>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredBarbershops.map((barber) => (
              <div key={barber.slug} className="premium-card w-[236px] shrink-0 overflow-hidden">
                <Link href={`/agendar/${barber.slug}`}>
                  <img src={barber.photo} alt={barber.location} className="h-28 w-full object-cover" />
                </Link>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/agendar/${barber.slug}`} className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 font-semibold text-white">{barber.location.split(' - ')[0]}</h3>
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${barber.open ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#FCA5A5]'}`}>
                      {barber.open ? 'Aberta' : 'Fechada'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#9CA3AF]">{barber.name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#9CA3AF]"><MapPin className="h-3.5 w-3.5 text-[#F4B400]" />{barber.distance}</span>
                    <span className="flex items-center gap-1 font-semibold text-[#F4B400]"><Star className="h-3.5 w-3.5 fill-current" />{barber.rating}</span>
                  </div>
                  <button
                    onClick={() => toggleFavorite(barber.slug)}
                    className={`mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-xs font-semibold ${
                      isFavorite(barber.slug)
                        ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                        : 'border-white/10 bg-[#101214] text-[#9CA3AF]'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite(barber.slug) ? 'fill-current' : ''}`} />
                    {isFavorite(barber.slug) ? 'Desfavoritar' : 'Favoritar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.24 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Categorias</h2>
            <Link href="/cliente/servicos" className="text-sm font-medium text-[#F4B400]">Ver todas</Link>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {categories.map((category) => (
              <Link key={category.name} href="/cliente/servicos" className="premium-card flex aspect-square flex-col items-center justify-center gap-2 p-2 text-center">
                <category.icon className="h-5 w-5 text-[#F4B400]" />
                <span className="text-[11px] font-medium text-[#9CA3AF]">{category.name}</span>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.36 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Serviços em destaque</h2>
            <Link href="/cliente/favoritos" className="text-sm font-medium text-[#F4B400]">Favoritos</Link>
          </div>
          <div className="mt-3 space-y-3">
            {filteredServices.map((service) => (
              <Link key={service.slug} href={`/cliente/servicos/${service.slug}`} className="premium-card flex items-center gap-4 p-3">
                <img src={service.photo} alt={service.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{service.name}</h3>
                  <p className="line-clamp-1 text-sm text-[#9CA3AF]">{service.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-[#9CA3AF]"><Clock3 className="h-3.5 w-3.5" />{service.duration}</span>
                    <span className="font-semibold text-[#F4B400]">{service.price}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#F4B400]" />
              </Link>
            ))}
          </div>
        </motion.section>

        {filteredBarbershops.length === 0 && filteredServices.length === 0 && (
          <div className="premium-card mt-6 p-6 text-center text-sm text-[#9CA3AF]">
            Nenhum resultado encontrado.
          </div>
        )}

        <footer className="mt-9 flex items-center justify-between border-t border-white/10 py-6 text-xs text-[#6B7280]">
          <BrandMark compact />
          <span>AgendBarber 1.0</span>
          <CalendarDays className="h-4 w-4" />
        </footer>
      </div>
      <BottomNav />
    </main>
  )
}
