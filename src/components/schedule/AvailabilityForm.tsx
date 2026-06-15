'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { availabilityRuleSchema, type AvailabilityRuleInput } from '@/lib/validations/availability'
import { DAY_NAMES, DayOfWeek } from '@/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Controller } from 'react-hook-form'

interface AvailabilityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AvailabilityRuleInput) => Promise<void>
  loading?: boolean
  existingDays?: number[]
}

export function AvailabilityForm({
  open,
  onOpenChange,
  onSubmit,
  loading,
  existingDays = [],
}: AvailabilityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<AvailabilityRuleInput>({
    resolver: zodResolver(availabilityRuleSchema),
    defaultValues: { start_time: '09:00', end_time: '18:00', interval_minutes: 30 },
  })

  const availableDays = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).filter(
    (d) => !existingDays.includes(d),
  )

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Dia de Atendimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Dia da semana</Label>
            <Controller
              name="day_of_week"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={String(field.value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDays.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {DAY_NAMES[day]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.day_of_week && (
              <p className="text-sm text-red-500">{errors.day_of_week.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" type="time" {...register('start_time')} />
              {errors.start_time && (
                <p className="text-sm text-red-500">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" type="time" {...register('end_time')} />
              {errors.end_time && (
                <p className="text-sm text-red-500">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval_minutes">Intervalo entre horários (minutos)</Label>
            <Input
              id="interval_minutes"
              type="number"
              min={10}
              max={120}
              step={5}
              {...register('interval_minutes')}
            />
            {errors.interval_minutes && (
              <p className="text-sm text-red-500">{errors.interval_minutes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
