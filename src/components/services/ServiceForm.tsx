'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
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

interface ServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ServiceInput, imageFile?: File | null) => Promise<void>
  service?: Service | null
  loading?: boolean
}

export function ServiceForm({ open, onOpenChange, onSubmit, service, loading }: ServiceFormProps) {
  const isEditing = !!service
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
      setPreviewUrl(service.image_url)
    } else {
      reset({ name: '', image_url: '', price: 0, duration_minutes: 30 })
      setPreviewUrl(null)
    }

    setImageFile(null)
  }, [service, open, reset])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const clearSelectedImage = () => {
    setImageFile(null)
    setPreviewUrl(service?.image_url ?? null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar servico' : 'Novo servico'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => onSubmit(data, imageFile))} className="space-y-4">
          <input type="hidden" {...register('image_url')} />

          <div className="space-y-2">
            <Label htmlFor="name">Nome do servico</Label>
            <Input id="name" placeholder="ex: Corte + Barba" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-image">Imagem do servico</Label>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#101214]">
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview do servico" className="h-40 w-full object-cover" />
                  {imageFile && (
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"
                      aria-label="Remover imagem selecionada"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid h-36 place-items-center text-[#9CA3AF]">
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <ImageIcon className="h-7 w-7 text-[#F4B400]" />
                    <span>Nenhuma imagem selecionada</span>
                  </div>
                </div>
              )}

              <Label
                htmlFor="service-image"
                className="flex cursor-pointer items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-semibold text-[#F4B400] transition hover:bg-white/5"
              >
                <UploadCloud className="h-4 w-4" />
                {previewUrl ? 'Trocar imagem' : 'Selecionar da galeria'}
              </Label>
              <Input
                id="service-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preco (R$)</Label>
              <Input id="price" placeholder="35,00" inputMode="decimal" {...register('price')} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duracao (min)</Label>
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
