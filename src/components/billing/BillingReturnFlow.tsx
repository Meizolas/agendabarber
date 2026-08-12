'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw } from 'lucide-react'
import { BrandLogo } from '@/components/premium/BrandLogo'
import { Button } from '@/components/ui/button'

type ReturnStatus = 'success' | 'cancelled' | 'expired'
type ReconcileState = 'checking' | 'activated' | 'delayed' | 'error'

const MAX_ATTEMPTS = 24
const RETRY_INTERVAL_MS = 1_500

export function BillingReturnFlow({ status }: { status: ReturnStatus }) {
  const router = useRouter()
  const [state, setState] = useState<ReconcileState>('checking')
  const [attempt, setAttempt] = useState(0)
  const [trialScheduled, setTrialScheduled] = useState(false)
  const runId = useRef(0)

  const reconcile = useCallback(async () => {
    const currentRun = ++runId.current
    setState('checking')
    setAttempt(0)

    for (let index = 1; index <= MAX_ATTEMPTS; index += 1) {
      if (currentRun !== runId.current) return
      setAttempt(index)
      try {
        const response = await fetch('/api/billing/reconcile', {
          method: 'POST',
          cache: 'no-store',
        })
        const result = await response.json().catch(() => null)
        if (response.ok && (result?.active || (result?.accessAllowed && result?.accessReason === 'free_trial'))) {
          setTrialScheduled(!result?.active && result?.accessReason === 'free_trial')
          setState('activated')
          await new Promise((resolve) => window.setTimeout(resolve, 700))
          window.location.replace('/dashboard')
          return
        }
        if (response.status === 401) {
          setState('error')
          return
        }
      } catch {
        // Falhas transitórias são tentadas novamente durante a janela de conciliação.
      }
      await new Promise((resolve) => window.setTimeout(resolve, RETRY_INTERVAL_MS))
    }
    if (currentRun === runId.current) setState('delayed')
  }, [])

  useEffect(() => {
    if (status !== 'success') return
    void reconcile()
    return () => { runId.current += 1 }
  }, [reconcile, status])

  if (status !== 'success') {
    const expired = status === 'expired'
    const Icon = expired ? Clock3 : AlertCircle
    return (
      <ReturnShell>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#F5C400]/35 bg-[#F5C400]/[0.07]"><Icon className="h-9 w-9 text-[#F5C400]" /></span>
        <h1 className="mt-6 text-2xl font-semibold text-white">{expired ? 'Checkout expirado' : 'Pagamento cancelado'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9499A1]">{expired ? 'O tempo para concluir o pagamento terminou.' : 'Nenhuma cobrança foi confirmada.'} Você pode escolher um plano novamente.</p>
        <Button onClick={() => router.replace('/assinatura')} className="gold-action mt-7 w-full">Voltar para os planos</Button>
      </ReturnShell>
    )
  }

  return (
    <ReturnShell>
      {state === 'activated' ? (
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#22C55E]/50 bg-[#22C55E]/10 shadow-[0_0_30px_rgba(34,197,94,.16)]"><CheckCircle2 className="h-10 w-10 text-[#65D787]" /></span>
      ) : state === 'delayed' || state === 'error' ? (
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#F5C400]/35 bg-[#F5C400]/[0.07]"><Clock3 className="h-9 w-9 text-[#F5C400]" /></span>
      ) : (
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#F5C400]/45 bg-[#F5C400]/[0.08] shadow-[0_0_32px_rgba(245,196,0,.14)]"><Loader2 className="h-9 w-9 animate-spin text-[#F5C400]" /></span>
      )}

      <h1 className="mt-6 text-2xl font-semibold text-white">
        {state === 'activated' ? (trialScheduled ? 'Assinatura agendada!' : 'Plano ativado!') : state === 'checking' ? 'Confirmando seu pagamento' : state === 'error' ? 'Sessão expirada' : 'Confirmação em andamento'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#9499A1]">
        {state === 'activated'
          ? trialScheduled ? 'Cartão cadastrado. A primeira cobrança será feita após o teste gratuito.' : 'Tudo pronto. Estamos abrindo seu painel.'
          : state === 'checking'
            ? 'O Asaas já recebeu seus dados. Aguarde alguns segundos enquanto liberamos o acesso automaticamente.'
            : state === 'error'
              ? 'Entre novamente para confirmar sua assinatura.'
              : 'O Asaas ainda está finalizando a confirmação. Seu pagamento não será duplicado.'}
      </p>

      {state === 'checking' && (
        <div className="mt-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#F5C400] transition-all duration-500" style={{ width: `${Math.max(8, (attempt / MAX_ATTEMPTS) * 100)}%` }} /></div>
          <p className="mt-2 text-[10px] text-[#6F747C]">Você será redirecionado automaticamente.</p>
        </div>
      )}

      {(state === 'delayed' || state === 'error') && (
        <div className="mt-7 space-y-2.5">
          {state === 'delayed' && <Button onClick={() => void reconcile()} className="gold-action w-full"><RefreshCw className="mr-2 h-4 w-4" /> Verificar novamente</Button>}
          <Button variant="outline" onClick={() => router.replace(state === 'error' ? '/login' : '/assinatura')} className="h-12 w-full border-white/15 bg-transparent text-white hover:bg-white/5">{state === 'error' ? 'Fazer login' : 'Voltar para os planos'}</Button>
        </div>
      )}
    </ReturnShell>
  )
}

function ReturnShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100dvh-6rem)] items-center px-5 py-10">
      <section className="w-full rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,196,0,.09),transparent_40%),#101214] px-6 py-8 text-center shadow-[0_24px_70px_rgba(0,0,0,.38)]">
        <BrandLogo compact className="mb-8 justify-center" imageClassName="w-9" />
        {children}
      </section>
    </main>
  )
}
