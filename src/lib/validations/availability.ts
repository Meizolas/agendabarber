import { z } from 'zod'

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
    interval_minutes: z.coerce
      .number()
      .int()
      .min(10, 'Intervalo mínimo: 10 minutos')
      .max(120, 'Intervalo máximo: 120 minutos'),
  })
  .refine(
    (data) => data.start_time < data.end_time,
    { message: 'Horário de início deve ser antes do horário de fim', path: ['end_time'] },
  )

export const blockTimeSchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  blocked_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário inválido')
    .optional()
    .or(z.literal('')),
  reason: z.string().max(200).optional(),
})

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>
export type BlockTimeInput = z.infer<typeof blockTimeSchema>
