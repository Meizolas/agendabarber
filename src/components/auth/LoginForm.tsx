'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Chrome, Eye, EyeOff, Loader2, LockKeyhole, Mail, Scissors } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)

    const demoResponse = await fetch('/api/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (demoResponse.ok) {
      const demo = await demoResponse.json()
      window.localStorage.setItem(DEMO_STORAGE_KEY, demo.role)
      toast({ title: 'Login de teste ativo', description: demo.role === 'admin' ? 'Entrando no painel admin.' : 'Entrando como cliente.' })
      router.replace(demo.redirectTo)
      router.refresh()
      return
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    router.replace(barber ? '/dashboard' : '/')
    router.refresh()
  }

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      toast({ title: 'Erro no Google Login', description: error.message, variant: 'destructive' })
      setGoogleLoading(false)
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0D0F] px-5 py-5 shadow-[0_22px_80px_rgba(0,0,0,0.55)]">
      <PhoneStatus />

      <div className="mt-10 flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-lg text-[#F4B400]">
          <Scissors className="h-9 w-9" />
        </div>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-white">Barber</p>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#F4B400]">House</p>
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-[24px] font-semibold leading-tight text-white">Bem-vindo de volta</h1>
        <p className="mt-2 text-sm text-[#8F949D]">Faça login para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="E-mail" error={errors.email?.message}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E646E]" />
            <Input id="email" type="email" placeholder="Digite seu e-mail" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('email')} />
          </div>
        </Field>

        <Field label="Senha" error={errors.password?.message}>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E646E]" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              className="premium-input border-white/5 bg-[#14171A] pl-10 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F949D] transition hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link href="/login" className="text-xs font-medium text-[#D99A12]">Esqueci minha senha</Link>
        </div>

        <Button type="submit" className="premium-button w-full rounded-md" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-[#6B7280]">ou continue com</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <Button type="button" variant="outline" className="h-11 w-full border-white/10 bg-[#101214] text-white hover:bg-white/5" onClick={signInWithGoogle} disabled={googleLoading}>
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
        Google
      </Button>

      <p className="mt-auto pt-6 text-center text-sm text-[#8F949D]">
        Não tem uma conta?{' '}
        <Link href="/cadastro" className="font-semibold text-[#F4B400]">Criar conta</Link>
      </p>
    </section>
  )
}

function PhoneStatus() {
  return (
    <div className="flex items-center justify-between text-[11px] font-semibold text-white">
      <span>9:30</span>
      <span className="tracking-[0.18em]">•••</span>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-[#B8BDC6]">{label}</Label>
      {children}
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  )
}
