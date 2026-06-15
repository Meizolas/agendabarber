import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { featuredServices } from '@/lib/premium-data'

export default function ClientServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = featuredServices.find((item) => item.slug === params.slug)
  if (!service) notFound()

  return (
    <main className="premium-screen min-h-screen pb-8">
      <div className="mx-auto max-w-xl">
        <div className="relative min-h-[430px] overflow-hidden">
          <img src={service.photo} alt={service.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090A] via-black/45 to-black/20" />
          <Link href="/cliente/servicos" className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/35 backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-sm font-semibold text-[#F4B400]">Servico premium</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-white">{service.name}</h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-full bg-[#F4B400] px-4 py-2 text-sm font-semibold text-[#08090A]">{service.price}</span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white">
                <Clock3 className="h-4 w-4 text-[#F4B400]" />
                {service.duration}
              </span>
            </div>
          </div>
        </div>

        <section className="px-5">
          <p className="mt-5 text-[16px] leading-7 text-[#D1D5DB]">{service.description}</p>
          <div className="mt-6 space-y-3">
            {['Consultoria de estilo', 'Finalizacao premium', 'Confirmacao por WhatsApp'].map((item) => (
              <div key={item} className="premium-card flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                <span className="text-sm font-medium text-white">{item}</span>
              </div>
            ))}
          </div>

          <Link href="/agendar/demo" className="premium-button mt-7 flex w-full items-center justify-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Agendar Agora
          </Link>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
            <ShieldCheck className="h-4 w-4 text-[#F4B400]" />
            Pagamento e confirmacao combinados com a barbearia
          </div>
        </section>
      </div>
    </main>
  )
}
