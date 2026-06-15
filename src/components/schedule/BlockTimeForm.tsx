'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { blockTimeSchema, type BlockTimeInput } from '@/lib/validations/availability'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface BlockTimeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BlockTimeInput) => Promise<void>
  loading?: boolean
}

export function BlockTimeForm({ open, onOpenChange, onSubmit, loading }: BlockTimeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BlockTimeInput>({ resolver: zodResolver(blockTimeSchema) })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Horário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blocked_date">Data</Label>
            <Input id="blocked_date" type="date" {...register('blocked_date')} />
            {errors.blocked_date && (
              <p className="text-sm text-red-500">{errors.blocked_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blocked_time">
              Horário específico{' '}
              <span className="text-muted-foreground font-normal">(deixe vazio para bloquear o dia todo)</span>
            </Label>
            <Input id="blocked_time" type="time" {...register('blocked_time')} />
            {errors.blocked_time && (
              <p className="text-sm text-red-500">{errors.blocked_time.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="ex: Feriado, consulta médica..."
              {...register('reason')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bloquear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
