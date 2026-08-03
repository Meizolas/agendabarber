'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword }),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setLoading(false)
      setError(result?.error ?? 'Nao foi possivel redefinir sua senha.')
      return
    }
    router.replace('/login?password_reset=1')
  }

  if (!token) {
    return <section className="mt-16 rounded-[28px] border border-white/10 bg-[#0B0D0F] p-6 text-center"><h1 className="text-xl font-semibold">Link invalido</h1><Link href="/esqueci-senha" className="mt-4 block text-[#F4B400]">Solicitar um novo link</Link></section>
  }

  return (
    <section className="mt-16 rounded-[28px] border border-white/10 bg-[#0B0D0F] p-6">
      <h1 className="text-2xl font-semibold">Definir nova senha</h1>
      <p className="mt-2 text-sm text-[#8F949D]">Use no minimo 8 caracteres.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha" className="premium-input border-white/5 bg-[#14171A]" />
        <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirme a nova senha" className="premium-input border-white/5 bg-[#14171A]" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="premium-button w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar nova senha'}
        </Button>
      </form>
    </section>
  )
}
