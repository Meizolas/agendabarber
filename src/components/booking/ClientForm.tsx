'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Banknote, CalendarCheck, ChevronRight, Loader2, MessageCircle, QrCode, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppointmentPaymentMethod } from '@/types'

const clientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  client_whatsapp: z.string().min(10, 'WhatsApp invalido').transform((value) => value.replace(/\D/g, '')).refine((value) => value.length >= 10 && value.length <= 13, 'WhatsApp invalido'),
  notes: z.string().max(300).optional(),
})

export type ClientFormValues = z.infer<typeof clientSchema>

export function ClientForm({
  onSubmit,
  loading,
  paymentMethod,
  onPaymentMethodChange,
  pixAvailable,
}: {
  onSubmit: (data: ClientFormValues) => Promise<void>
  loading?: boolean
  paymentMethod: AppointmentPaymentMethod
  onPaymentMethodChange: (method: AppointmentPaymentMethod) => void
  pixAvailable: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <Field label="Seu nome" error={errors.client_name?.message}>
        <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A2A6AD]" />
        <Input id="client_name" autoComplete="name" placeholder="Digite seu nome completo" className="dashboard-field pl-10" {...register('client_name')} />
      </Field>

      <Field label="WhatsApp" error={errors.client_whatsapp?.message}>
        <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A2A6AD]" />
        <Input id="client_whatsapp" autoComplete="tel" inputMode="tel" placeholder="(xx) xxxxx-xxxx" className="dashboard-field pl-10" {...register('client_whatsapp')} />
      </Field>

      <div className="space-y-2">
        <p className="text-[10px] font-medium text-[#A2A6AD]">Forma de pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          <PaymentOption
            active={paymentMethod === 'pix'}
            disabled={!pixAvailable}
            icon={QrCode}
            title="Pix agora"
            subtitle={pixAvailable ? 'QR Code no final' : 'Indisponivel'}
            onClick={() => pixAvailable && onPaymentMethodChange('pix')}
          />
          <PaymentOption
            active={paymentMethod === 'at_barbershop'}
            icon={Banknote}
            title="Na barbearia"
            subtitle="Pague no local"
            onClick={() => onPaymentMethodChange('at_barbershop')}
          />
        </div>
        <p className="rounded-lg border border-[#F5C400]/20 bg-[#F5C400]/10 px-3 py-2 text-[10px] leading-4 text-[#E8D281]">
          A confirmacao do pagamento e feita pela barbearia apos verificar o Pix ou receber no local.
        </p>
      </div>

      <Button type="submit" className="gold-action w-full justify-between px-4" disabled={loading}>
        <span className="flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-5 w-5" />} {loading ? 'Confirmando...' : 'Confirmar agendamento'}</span>
        {!loading && <ChevronRight className="h-5 w-5" />}
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#15171A] px-3 py-2.5 text-[9px] leading-4 text-[#858A93]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Seus dados estao protegidos.<br />Cancelamento ou reagendamento gratis ate 2h antes.</p>
      </div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-[10px] text-[#A2A6AD]">{label}</label><div className="relative">{children}</div>{error && <p className="mt-1 text-[10px] text-[#F87171]">{error}</p>}</div>
}

function PaymentOption({
  active,
  disabled,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-20 flex-col items-start justify-between rounded-lg border p-3 text-left transition ${
        active ? 'border-[#F5C400] bg-[#F5C400]/10 text-white' : 'border-white/10 bg-[#111315] text-[#D7DADE]'
      } ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:border-[#F5C400]/50'}`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-[#F5C400]' : 'text-[#A2A6AD]'}`} />
      <span>
        <strong className="block text-xs">{title}</strong>
        <span className="text-[9px] text-[#858A93]">{subtitle}</span>
      </span>
    </button>
  )
}
