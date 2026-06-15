'use client'

import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
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
        toast({ title: 'Link ja em uso', description: 'Escolha outro link publico.', variant: 'destructive' })
      } else {
        toast({ title: 'Erro ao criar perfil', description: profileError.message, variant: 'destructive' })
      }
      setLoading(false)
      return
    }

    toast({ title: 'Conta criada!', description: 'Bem-vindo ao AgendBarber.' })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="premium-card p-6">
      <div>
        <h1 className="text-[24px] font-semibold text-white">Criar conta</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Crie sua conta para comecar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" error={errors.barber_name?.message}>
            <Input placeholder="Digite seu nome" className="premium-input" {...register('barber_name')} />
          </Field>
          <Field label="Barbearia" error={errors.barbershop_name?.message}>
            <Input placeholder="Nome da barbearia" className="premium-input" {...register('barbershop_name')} />
          </Field>
        </div>

        <Field label="Telefone" error={errors.whatsapp?.message}>
          <Input placeholder="(11) 99999-9999" className="premium-input" {...register('whatsapp')} />
        </Field>

        <Field label="Link publico" error={errors.slug?.message}>
          <div className="flex">
            <span className="flex h-12 items-center rounded-l-lg border border-r-0 border-white/10 bg-[#101214] px-3 text-sm text-[#9CA3AF]">
              /agendar/
            </span>
            <Input className="premium-input rounded-l-none" placeholder="barber-house" {...register('slug')} />
          </div>
          {slugValue && <p className="mt-1 text-xs text-[#9CA3AF]">Seu link: <span className="text-[#F4B400]">/agendar/{slugValue}</span></p>}
        </Field>

        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" placeholder="Digite seu e-mail" className="premium-input" {...register('email')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" error={errors.password?.message}>
            <PasswordInput show={showPassword} toggle={() => setShowPassword((v) => !v)} register={register('password')} />
          </Field>
          <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
            <Input type={showPassword ? 'text' : 'password'} placeholder="Confirme sua senha" className="premium-input" {...register('confirmPassword')} />
          </Field>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#101214] p-3 text-xs leading-5 text-[#9CA3AF]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F4B400]" />
          <span>Eu aceito os Termos de Uso e a Politica de Privacidade.</span>
        </div>

        <Button type="submit" className="premium-button w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#9CA3AF]">
        Ja tem uma conta?{' '}
        <Link href="/login" className="font-semibold text-[#F4B400]">Entrar</Link>
      </p>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-[#D1D5DB]">{label}</Label>
      {children}
      {error && <p className="text-sm text-[#EF4444]">{error}</p>}
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
      <Input type={show ? 'text' : 'password'} placeholder="Crie uma senha" className="premium-input pr-10" {...register} />
      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
