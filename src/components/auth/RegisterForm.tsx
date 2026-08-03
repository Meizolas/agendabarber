'use client'

import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Eye, EyeOff, Globe2, LinkIcon, Loader2, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { AuthShell } from '@/components/auth/AuthShell'

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  })

  const slugValue = watch('slug', '')

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      toast({
        title: 'Erro ao criar conta',
        description: result.error ?? 'Nao foi possivel criar sua conta.',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    toast({ title: 'Conta criada!', description: 'Bem-vindo ao AgendBarber.' })
    router.replace('/assinatura')
    router.refresh()
  }

  return (
    <AuthShell backHref="/login">
      <div className="mt-4 text-center">
        <h1 className="text-[25px] font-semibold text-white">Crie sua barbearia</h1>
        <p className="mt-1.5 text-sm text-[#9A9EA6]">Vamos começar!</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-2.5">
        <Field label="Seu nome" error={errors.barber_name?.message} icon={UserRound}>
          <Input placeholder="Seu nome" autoComplete="name" className="auth-field pl-11" {...register('barber_name')} />
        </Field>

        <Field label="Nome da barbearia" error={errors.barbershop_name?.message} icon={Building2}>
          <Input placeholder="Nome da barbearia" className="auth-field pl-11" {...register('barbershop_name')} />
        </Field>

        <Field label="WhatsApp" error={errors.whatsapp?.message} icon={Phone}>
          <Input placeholder="WhatsApp (DDD + número)" autoComplete="tel" className="auth-field pl-11" {...register('whatsapp')} />
        </Field>

        <Field label="E-mail" error={errors.email?.message} icon={Mail}>
          <Input type="email" placeholder="E-mail" autoComplete="email" className="auth-field pl-11" {...register('email')} />
        </Field>

        <Field label="Link público" error={errors.slug?.message} icon={LinkIcon}>
          <Input placeholder="seu-nome" className="auth-field pl-11" {...register('slug')} />
        </Field>

        <Field label="Senha" error={errors.password?.message}>
          <PasswordInput show={showPassword} toggle={() => setShowPassword((v) => !v)} register={register('password')} />
        </Field>

        <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="Confirmar senha" autoComplete="new-password" className="auth-field pl-11" {...register('confirmPassword')} />
          </div>
        </Field>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-[11px] leading-4 text-[#9A9EA6]">
          <div className="mb-2 flex items-center gap-2 text-[10px]">
            <Globe2 className="h-3.5 w-3.5 text-[#B8BDC5]" />
            <span className="text-[#B8BDC5]">Seu link de agendamento</span>
          </div>
          <p className="truncate">agendbarber.vercel.app/agendar/<span className="text-[#F5C400]">{slugValue || 'sua-barbearia'}</span></p>
        </div>

        <div className="py-1 text-[11px] leading-4 text-[#9A9EA6]">
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-[#F5C400]" {...register('acceptTerms')} />
            <span>Li e concordo com os <span className="text-[#F5C400]">Termos de Uso</span> e <span className="text-[#F5C400]">Política de Privacidade</span>.</span>
          </label>
          {errors.acceptTerms && <p className="mt-1 text-xs text-[#EF4444]">{errors.acceptTerms.message}</p>}
        </div>

        <Button type="submit" className="gold-action w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-auto pt-5 text-center text-xs text-[#9A9EA6]">
        Já tenho uma conta{' '}
        <Link href="/login" className="ml-2 font-medium text-[#F5C400] hover:text-[#FFD21A]">Fazer login</Link>
      </p>
    </AuthShell>
  )
}

function Field({
  label,
  error,
  icon: Icon,
  children,
}: {
  label: string
  error?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="sr-only">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />}
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-[#F87171]">{error}</p>}
    </div>
  )
}

function PasswordInput({
  show,
  toggle,
  register,
}: {
  show: boolean
  toggle: () => void
  register: UseFormRegisterReturn
}) {
  return (
    <div className="relative">
      <LockKeyhole className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#A5A9B0]" />
      <Input type={show ? 'text' : 'password'} placeholder="Senha" autoComplete="new-password" className="auth-field pl-11 pr-11" {...register} />
      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F949D]" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}
