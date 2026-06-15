'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { serviceSchema, type ServiceInput } from '@/lib/validations/service'
import { Service } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface ServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ServiceInput) => Promise<void>
  service?: Service | null
  loading?: boolean
}

export function ServiceForm({ open, onOpenChange, onSubmit, service, loading }: ServiceFormProps) {
  const isEditing = !!service

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceInput>({ resolver: zodResolver(serviceSchema) })

  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        image_url: service.image_url ?? '',
        price: service.price,
        duration_minutes: service.duration_minutes,
      })
    } else {
      reset({ name: '', image_url: '', price: 0, duration_minutes: 30 })
    }
  }, [service, open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do serviço</Label>
            <Input id="name" placeholder="ex: Corte + Barba" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Imagem do serviço</Label>
            <Input id="image_url" placeholder="https://..." {...register('image_url')} />
            <p className="text-xs text-muted-foreground">Cole uma URL de imagem para aparecer no card e no link público.</p>
            {errors.image_url && <p className="text-sm text-red-500">{errors.image_url.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" placeholder="35,00" inputMode="decimal" {...register('price')} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duração (min)</Label>
              <Input
                id="duration_minutes"
                placeholder="30"
                inputMode="numeric"
                {...register('duration_minutes')}
              />
              {errors.duration_minutes && (
                <p className="text-sm text-red-500">{errors.duration_minutes.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
