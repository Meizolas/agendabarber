'use client'

import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Check, Eye, EyeOff, LinkIcon, Loader2, Mail, Phone, Scissors, UserRound } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const slugValue = watch('slug', '')

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      toast({ title: 'Erro ao criar conta', description: authError.message, variant: 'destructive' })
      setLoading(false)
      return
    }

    if (!authData.user) {
      toast({ title: 'Erro inesperado', description: 'Tente novamente.', variant: 'destructive' })
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('barbers').insert({
      user_id: authData.user.id,
      barbershop_name: data.barbershop_name,
      barber_name: data.barber_name,
      whatsapp: data.whatsapp,
      slug: data.slug.toLowerCase(),
    })

    if (profileError) {
      if (profileError.code === '23505') {
        toast({ title: 'Link já em uso', description: 'Escolha outro link público.', variant: 'destructive' })
      } else {
        toast({ title: 'Erro ao criar perfil', description: profileError.message, variant: 'destructive' })
      }
      setLoading(false)
      return
    }

    toast({ title: 'Conta criada!', description: 'Bem-vindo ao AgendBarber.' })
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <section className="relative flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0D0F] px-5 py-5 shadow-[0_22px_80px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between text-[11px] font-semibold text-white">
        <span>9:30</span>
        <span className="tracking-[0.18em]">•••</span>
      </div>

      <div className="mt-8">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-lg border border-[#F4B400]/30 bg-[#F4B400]/10 text-[#F4B400]">
          <Scissors className="h-5 w-5" />
        </div>
        <h1 className="text-[25px] font-semibold text-white">Criar conta</h1>
        <p className="mt-2 text-sm text-[#8F949D]">Crie sua conta admin para começar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3">
        <Field label="Nome completo" error={errors.barber_name?.message} icon={UserRound}>
          <Input placeholder="Digite seu nome" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('barber_name')} />
        </Field>

        <Field label="Barbearia" error={errors.barbershop_name?.message} icon={Building2}>
          <Input placeholder="Nome da barbearia" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('barbershop_name')} />
        </Field>

        <Field label="E-mail" error={errors.email?.message} icon={Mail}>
          <Input type="email" placeholder="Digite seu e-mail" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('email')} />
        </Field>

        <Field label="Telefone" error={errors.whatsapp?.message} icon={Phone}>
          <Input placeholder="(11) 99999-9999" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('whatsapp')} />
        </Field>

        <Field label="Link público" error={errors.slug?.message} icon={LinkIcon}>
          <Input placeholder="barber-house" className="premium-input border-white/5 bg-[#14171A] pl-10" {...register('slug')} />
          {slugValue && <p className="mt-1 text-xs text-[#8F949D]">Seu link: <span className="text-[#F4B400]">/agendar/{slugValue}</span></p>}
        </Field>

        <Field label="Senha" error={errors.password?.message}>
          <PasswordInput show={showPassword} toggle={() => setShowPassword((v) => !v)} register={register('password')} />
        </Field>

        <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
          <Input type={showPassword ? 'text' : 'password'} placeholder="Confirme sua senha" className="premium-input border-white/5 bg-[#14171A]" {...register('confirmPassword')} />
        </Field>

        <div className="flex items-start gap-2 py-1 text-xs leading-5 text-[#8F949D]">
          <span className="mt-0.5 grid h-4 w-4 place-items-center rounded border border-white/15 bg-[#111418]">
            <Check className="h-3 w-3 text-[#F4B400]" />
          </span>
          <span>Eu aceito os <span className="text-[#F4B400]">Termos de Uso</span> e <span className="text-[#F4B400]">Politica de Privacidade</span>.</span>
        </div>

        <Button type="submit" className="premium-button w-full rounded-md" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-auto pt-5 text-center text-sm text-[#8F949D]">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-semibold text-[#F4B400]">Entrar</Link>
      </p>
    </section>
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
    <div className="space-y-2">
      <Label className="text-xs font-medium text-[#B8BDC6]">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#5E646E]" />}
        {children}
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
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
      <Input type={show ? 'text' : 'password'} placeholder="Crie uma senha" className="premium-input border-white/5 bg-[#14171A] pr-10" {...register} />
      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F949D]" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
