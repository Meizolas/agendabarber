import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

const clientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  client_whatsapp: z
    .string()
    .min(10, 'WhatsApp invalido')
    .transform((v) => v.replace(/\D/g, '')),
  notes: z.string().max(300).optional(),
})

export type ClientFormValues = z.infer<typeof clientSchema>

interface ClientFormProps {
  onSubmit: (data: ClientFormValues) => Promise<void>
  loading?: boolean
}

export function ClientForm({ onSubmit, loading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nome completo" error={errors.client_name?.message}>
        <Input id="client_name" placeholder="Lucas Oliveira" className="premium-input" {...register('client_name')} />
      </Field>

      <Field label="Telefone" error={errors.client_whatsapp?.message}>
        <Input id="client_whatsapp" placeholder="(11) 99999-9999" inputMode="tel" className="premium-input" {...register('client_whatsapp')} />
      </Field>

      <Field label="Observacao opcional">
        <Textarea
          id="notes"
          placeholder="Alguma observacao?"
          className="min-h-32 rounded-lg border-white/10 bg-[#101214] text-white placeholder:text-[#6B7280] focus-visible:ring-[#F4B400] focus-visible:ring-offset-0"
          {...register('notes')}
        />
      </Field>

      <Button type="submit" className="premium-button w-full" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuar'}
      </Button>
    </form>
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
