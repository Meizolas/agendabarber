import { z } from 'zod'

export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').refine((value) => {
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Data inválida')

export const availabilityRuleSchema = z
  .object({
    day_of_week: z.coerce
      .number()
      .int()
      .min(0)
      .max(6, 'Dia da semana inválido'),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
    lunch_start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Início do almoço inválido').nullable().optional(),
    lunch_end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Fim do almoço inválido').nullable().optional(),
    interval_minutes: z.coerce
      .number()
      .int()
      .min(10, 'Intervalo mínimo: 10 minutos')
      .max(120, 'Intervalo máximo: 120 minutos'),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => data.start_time < data.end_time,
    { message: 'Horário de início deve ser antes do horário de fim', path: ['end_time'] },
  )
  .refine((data) => (!data.lunch_start_time && !data.lunch_end_time) || Boolean(data.lunch_start_time && data.lunch_end_time), { message: 'Informe o início e o fim do almoço', path: ['lunch_end_time'] })
  .refine((data) => !data.lunch_start_time || !data.lunch_end_time || (data.lunch_start_time < data.lunch_end_time && data.lunch_start_time >= data.start_time && data.lunch_end_time <= data.end_time), { message: 'O almoço deve estar dentro do expediente', path: ['lunch_end_time'] })

export const blockTimeSchema = z.object({
  blocked_date: calendarDateSchema,
  blocked_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido')
    .nullable()
    .optional()
    .or(z.literal('')),
  reason: z.string().trim().max(200).nullable().optional(),
})

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido')

export const blockTimesBatchSchema = z.object({
  blocked_date: calendarDateSchema,
  blocked_times: z.array(clockTimeSchema)
    .min(1, 'Selecione pelo menos um horário')
    .max(48, 'Máximo de 48 horários por operação')
    .transform((times) => [...new Set(times)].sort()),
  reason: z.string().trim().max(200).nullable().optional(),
})

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>
export type BlockTimeInput = z.infer<typeof blockTimeSchema>
export type BlockTimesBatchInput = z.input<typeof blockTimesBatchSchema>
