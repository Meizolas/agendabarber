'use client'

import { useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ActiveSubscriptionRedirect() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace('/dashboard')
    }, 500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="flex min-h-[calc(100dvh-6rem)] items-center px-5 py-10">
      <section className="w-full rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,196,0,.09),transparent_40%),#101214] px-6 py-8 text-center shadow-[0_24px_70px_rgba(0,0,0,.38)]">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#22C55E]/50 bg-[#22C55E]/10 shadow-[0_0_30px_rgba(34,197,94,.16)]">
          <CheckCircle2 className="h-10 w-10 text-[#65D787]" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-white">Plano ativo!</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9499A1]">
          Tudo certo com sua assinatura. Estamos abrindo seu painel agora.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#F5C400]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecionando...
        </div>
        <Button type="button" onClick={() => window.location.replace('/dashboard')} className="gold-action mt-7 w-full">
          Ir para o painel
        </Button>
      </section>
    </main>
  )
}
