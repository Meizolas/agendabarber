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
import { barberPhotos, featuredBarbers, featuredServices } from '@/lib/premium-data'

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

const categories = [
  { name: 'Corte', icon: Scissors },
  { name: 'Barba', icon: Shield },
  { name: 'Coloracao', icon: Sparkles },
  { name: 'Tratamento', icon: BadgeCheck },
]

export default function HomePage() {
  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto min-h-screen w-full max-w-xl px-5 pt-5">
        <motion.header
          {...fadeUp}
          transition={{ duration: 0.45 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <img
              src={barberPhotos.barber}
              alt="Cliente"
              className="h-11 w-11 rounded-lg object-cover ring-1 ring-white/10"
            />
            <div>
              <p className="text-sm text-[#9CA3AF]">Ola, Lucas</p>
              <h1 className="text-[24px] font-semibold leading-tight text-white">Seu proximo visual</h1>
            </div>
          </div>
          <Link
            href="/cliente/perfil"
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]"
            aria-label="Abrir perfil"
          >
            <UserRound className="h-5 w-5 text-[#F4B400]" />
          </Link>
        </motion.header>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.45, delay: 0.06 }}
          className="mt-5 flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-[#101214] px-4 text-[#9CA3AF]"
        >
          <Search className="h-5 w-5" />
          <span className="text-sm">Buscar servicos ou barbeiros</span>
        </motion.div>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="premium-card mt-5 overflow-hidden"
        >
          <div className="relative min-h-[210px]">
            <img
              src={barberPhotos.chair}
              alt="Cadeira premium de barbearia"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/48 to-black/5" />
            <div className="relative flex min-h-[210px] flex-col justify-end p-5">
              <span className="w-fit rounded-full border border-[#F4B400]/30 bg-[#F4B400]/12 px-3 py-1 text-xs font-semibold text-[#F4B400]">
                Corte + Barba
              </span>
              <h2 className="mt-3 max-w-[250px] text-[24px] font-semibold leading-tight text-white">
                Agende hoje com acabamento premium
              </h2>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#F4B400]">R$ 70,00</p>
                <Link href="/cliente/servicos" className="premium-button inline-flex h-10 items-center gap-2 px-4 text-sm">
                  Agendar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.18 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Proximo agendamento</h2>
            <Link href="/cliente/agenda" className="text-sm font-medium text-[#F4B400]">Ver agenda</Link>
          </div>
          <div className="premium-card mt-3 flex items-center gap-4 p-4">
            <img src={barberPhotos.cut} alt="Barbeiro cortando cabelo" className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">Terca, 23 Mai - 15:00</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">Corte Masculino com Fernando Almeida</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#9CA3AF]">
                <MapPin className="h-3.5 w-3.5 text-[#F4B400]" />
                Barber House - Moema
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.24 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Categorias</h2>
            <Link href="/cliente/servicos" className="text-sm font-medium text-[#F4B400]">Ver todas</Link>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {categories.map((category) => (
              <Link
                key={category.name}
                href="/cliente/servicos"
                className="premium-card flex aspect-square flex-col items-center justify-center gap-2 p-2 text-center"
              >
                <category.icon className="h-5 w-5 text-[#F4B400]" />
                <span className="text-[12px] font-medium text-[#9CA3AF]">{category.name}</span>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.3 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Servicos populares</h2>
            <Link href="/cliente/servicos" className="text-sm font-medium text-[#F4B400]">Explorar</Link>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredServices.map((service) => (
              <Link
                key={service.slug}
                href={`/cliente/servicos/${service.slug}`}
                className="premium-card w-[210px] shrink-0 overflow-hidden"
              >
                <img src={service.photo} alt={service.name} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <h3 className="font-semibold text-white">{service.name}</h3>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-[#9CA3AF]"><Clock3 className="h-3.5 w-3.5" />{service.duration}</span>
                    <span className="font-semibold text-[#F4B400]">{service.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section {...fadeUp} transition={{ duration: 0.45, delay: 0.36 }} className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-white">Barbeiros em destaque</h2>
            <Link href="/cliente/favoritos" className="text-sm font-medium text-[#F4B400]">Favoritos</Link>
          </div>
          <div className="mt-3 space-y-3">
            {featuredBarbers.map((barber) => (
              <div key={barber.name} className="premium-card flex items-center gap-4 p-3">
                <img src={barber.photo} alt={barber.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{barber.name}</h3>
                  <p className="truncate text-sm text-[#9CA3AF]">{barber.location}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-semibold text-[#F4B400]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {barber.rating}
                    </span>
                    <span className="text-[#9CA3AF]">({barber.reviews})</span>
                    <span className="text-[#9CA3AF]">{barber.price}</span>
                  </div>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-[#EF4444]" aria-label="Favoritar barbeiro">
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </motion.section>

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
