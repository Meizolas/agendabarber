'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { AuthShell } from '@/components/auth/AuthShell'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      toast({
        title: 'Erro ao entrar',
        description: result?.error ?? 'Nao foi possivel entrar.',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    if (result?.migrated) {
      toast({ title: 'Conta atualizada', description: 'Sua conta agora usa a autenticacao segura do AgendBarber.' })
    }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell>
      <div className="mt-9 text-center">
        <h1 className="text-[25px] font-semibold leading-tight text-white">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-sm text-[#9A9EA6]">Faça login para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-3.5">
        <Field error={errors.email?.message}>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />
            <Input id="email" type="email" autoComplete="email" placeholder="E-mail" aria-label="E-mail" className="auth-field pl-11" {...register('email')} />
          </div>
        </Field>

        <Field error={errors.password?.message}>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />
            <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Senha" aria-label="Senha" className="auth-field pl-11 pr-11" {...register('password')} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F949D] transition hover:text-white" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </Field>

        <Link href="/esqueci-senha" className="block py-1 text-center text-xs font-medium text-[#F5C400] transition hover:text-[#FFD21A]">Esqueci minha senha</Link>

        <Button type="submit" className="gold-action w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
        </Button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-[#9A9EA6]">
        Não tem uma conta?{' '}
        <Link href="/cadastro" className="font-medium text-[#F5C400] hover:text-[#FFD21A]">Criar conta</Link>
      </p>
    </AuthShell>
  )
}

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return <div>{children}{error && <p className="mt-1.5 text-xs text-[#F87171]">{error}</p>}</div>
}
