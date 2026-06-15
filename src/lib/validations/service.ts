import { z } from 'zod'

export const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  price: z
    .string()
    .transform((v) => parseFloat(v.replace(',', '.')))
    .refine((v) => !isNaN(v) && v >= 0, 'Preço inválido'),
  duration_minutes: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => !isNaN(v) && v > 0 && v <= 480, 'Duração inválida (máx. 8h)'),
})

export type ServiceInput = z.infer<typeof serviceSchema>
