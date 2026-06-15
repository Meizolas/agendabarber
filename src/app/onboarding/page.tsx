'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { BrandMark } from '@/components/premium/BrandMark'
import { barberPhotos } from '@/lib/premium-data'

const slides = [
  {
    title: 'Seu estilo, nossa arte.',
    text: 'Encontre os melhores barbeiros e agende seu horario em poucos toques.',
    image: barberPhotos.chair,
  },
  {
    title: 'Agende em segundos.',
    text: 'Escolha servico, barbeiro, data e horario sem troca de mensagens.',
    image: barberPhotos.barber,
  },
  {
    title: 'Experiencia premium.',
    text: 'Ambiente moderno, atendimento organizado e resultado impecavel.',
    image: barberPhotos.cut,
  },
]

export default function OnboardingPage() {
  return (
    <main className="premium-screen min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-5">
        <BrandMark />
        <div className="mt-8 flex flex-1 gap-4 overflow-x-auto pb-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slides.map((slide, index) => (
            <motion.section
              key={slide.title}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative min-w-full snap-center overflow-hidden rounded-[30px] border border-white/10 bg-[#101214]"
            >
              <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
              <div className="relative flex h-full min-h-[640px] flex-col justify-end p-7">
                <p className="text-sm font-semibold text-[#F4B400]">0{index + 1}</p>
                <h1 className="mt-3 max-w-[310px] text-[32px] font-semibold leading-tight text-white">{slide.title}</h1>
                <p className="mt-4 max-w-[280px] text-[16px] leading-7 text-[#D1D5DB]">{slide.text}</p>
                <div className="mt-8 flex items-center justify-between">
                  <Link href="/" className="text-sm font-medium text-white/80">Pular</Link>
                  <Link href="/login" className="grid h-14 w-14 place-items-center rounded-full bg-[#F4B400] text-[#08090A] shadow-[0_18px_36px_rgba(244,180,0,0.3)]">
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </main>
  )
}
