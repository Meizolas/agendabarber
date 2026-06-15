'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock3, Search } from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { featuredServices } from '@/lib/premium-data'

export default function ClientServicesPage() {
  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-5 pt-5">
        <header className="flex items-center gap-4">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#101214]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm text-[#9CA3AF]">Escolha seu ritual</p>
            <h1 className="text-[24px] font-semibold text-white">Servicos</h1>
          </div>
        </header>

        <div className="mt-5 flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-[#101214] px-4 text-[#9CA3AF]">
          <Search className="h-5 w-5" />
          <span className="text-sm">Buscar servico</span>
        </div>

        <section className="mt-6 space-y-3">
          {featuredServices.map((service, index) => (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Link href={`/cliente/servicos/${service.slug}`} className="premium-card flex items-center gap-4 p-3">
                <img src={service.photo} alt={service.name} className="h-20 w-20 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-white">{service.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-[#9CA3AF]">{service.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="font-semibold text-[#F4B400]">{service.price}</span>
                    <span className="flex items-center gap-1 text-[#9CA3AF]"><Clock3 className="h-3.5 w-3.5" />{service.duration}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  )
}
