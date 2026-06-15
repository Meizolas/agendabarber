import Link from 'next/link'
import { BrandMark } from '@/components/premium/BrandMark'
import { barberPhotos } from '@/lib/premium-data'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="premium-screen min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden min-h-[720px] overflow-hidden rounded-[34px] border border-white/10 lg:block">
          <div className="relative h-full">
            <img src={barberPhotos.chair} alt="Barbearia premium" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-10">
              <BrandMark />
              <div className="max-w-md">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F4B400]">Barber booking app</p>
                <h1 className="mt-4 text-[44px] font-semibold leading-tight text-white">
                  Organize sua barbearia com uma experiencia premium.
                </h1>
                <p className="mt-5 text-[16px] leading-7 text-[#D1D5DB]">
                  Agenda, servicos, horarios e clientes em uma interface feita para parecer moderna desde o primeiro toque.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex justify-center">
              <BrandMark />
            </Link>
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
