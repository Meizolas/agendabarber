'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarCheck, ChevronRight, Loader2, MessageCircle, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const clientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  client_whatsapp: z.string().min(10, 'WhatsApp inválido').transform((value) => value.replace(/\D/g, '')).refine((value) => value.length >= 10 && value.length <= 13, 'WhatsApp inválido'),
  notes: z.string().max(300).optional(),
})

export type ClientFormValues = z.infer<typeof clientSchema>

export function ClientForm({ onSubmit, loading }: { onSubmit: (data: ClientFormValues) => Promise<void>; loading?: boolean }) {
  const [confirmation, setConfirmation] = useState(true)
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

      <label className="flex cursor-pointer items-center gap-2 text-[10px] text-[#A2A6AD]">
        <input type="checkbox" checked={confirmation} onChange={(event) => setConfirmation(event.target.checked)} className="h-4 w-4 accent-[#F5C400]" />
        Receber confirmação pelo WhatsApp
      </label>

      <Button type="submit" className="gold-action w-full justify-between px-4" disabled={loading}>
        <span className="flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-5 w-5" />} {loading ? 'Confirmando...' : 'Confirmar agendamento'}</span>
        {!loading && <ChevronRight className="h-5 w-5" />}
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#15171A] px-3 py-2.5 text-[9px] leading-4 text-[#858A93]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Seus dados estão protegidos.<br />Cancelamento ou reagendamento grátis até 2h antes.</p>
      </div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-[10px] text-[#A2A6AD]">{label}</label><div className="relative">{children}</div>{error && <p className="mt-1 text-[10px] text-[#F87171]">{error}</p>}</div>
}
