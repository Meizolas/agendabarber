'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { barberPhotos } from '@/lib/premium-data'

export default function OnboardingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070809] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4">

        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex min-h-[calc(100vh-2rem)] flex-1 overflow-hidden rounded-[28px] border border-[#A8791A]/45 bg-[#101214] shadow-[0_22px_80px_rgba(0,0,0,0.55)]"
        >
          <img
            src={barberPhotos.barber}
            alt="Barbeiro em retrato preto e branco"
            className="absolute inset-0 h-full w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
          <div className="absolute left-5 right-5 top-4 flex items-center justify-between text-[11px] font-semibold text-white">
            <span>9:30</span>
            <span className="tracking-[0.2em]">•••</span>
          </div>

          <div className="relative flex w-full flex-col justify-end px-6 pb-8 pt-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
            >
              <h1 className="max-w-[280px] text-[40px] font-semibold leading-[1.05] tracking-normal text-white">
                Seu estilo, nossa arte.
              </h1>
              <p className="mt-4 max-w-[260px] text-[15px] leading-6 text-[#D1D5DB]">
                Agende com os melhores barbeiros perto de voce.
              </p>
            </motion.div>

            <Link
              href="/login"
              className="mt-10 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F4B400] px-6 text-sm font-bold text-[#08090A] shadow-[0_18px_40px_rgba(244,180,0,0.28)] transition hover:bg-[#FFCC33]"
            >
              Comecar
              <ChevronRight className="h-4 w-4" />
            </Link>

            <div className="mt-6 flex justify-center gap-1.5">
              <span className="h-1.5 w-7 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
