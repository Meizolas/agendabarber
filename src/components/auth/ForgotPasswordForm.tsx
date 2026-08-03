'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/auth/AuthShell'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const result = await response.json().catch(() => null)
    setLoading(false)

    if (!response.ok) {
      setError(result?.error ?? 'Nao foi possivel enviar as instrucoes.')
      return
    }
    setMessage(result?.message ?? 'Verifique seu e-mail.')
  }

  return (
    <AuthShell backHref="/login" brand={false}>
      <div className="mx-auto mt-14 grid h-32 w-40 place-items-center text-[#F5C400]">
        <div className="relative">
          <Mail className="h-24 w-24 stroke-[1.35] drop-shadow-[0_8px_14px_rgba(245,196,0,0.24)]" />
          <span className="absolute left-1/2 top-1/2 grid h-12 w-10 -translate-x-1/2 -translate-y-[78%] place-items-center rounded-t-xl border-2 border-[#F5C400] bg-[#0A0B0D]">
            <LockKeyhole className="h-6 w-6 fill-[#F5C400]/20" />
          </span>
          <Sparkles className="absolute -right-9 -top-5 h-5 w-5" />
          <Sparkles className="absolute -left-8 top-3 h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 text-center">
        <h1 className="text-[25px] font-semibold">Recuperar senha</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-5 text-[#9A9EA6]">Informe seu e-mail para receber as instruções de acesso.</p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />
          <Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" aria-label="E-mail" className="auth-field pl-11" />
        </div>
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="gold-action w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar instruções'}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-4 text-xs text-[#858A93] before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">ou</div>
      <Link href="/login" className="block text-center text-sm font-medium text-[#F5C400] hover:text-[#FFD21A]">Voltar para o login</Link>
    </AuthShell>
  )
}
