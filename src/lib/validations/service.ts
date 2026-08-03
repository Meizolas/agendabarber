import { z } from 'zod'

export const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  image_url: z
    .string()
    .trim()
    .url('Informe uma URL de imagem valida')
    .optional()
    .or(z.literal(''))
    .transform((value) => value || null),
  price: z
    .preprocess((value) => String(value ?? ''), z.string())
    .transform((value) => parseFloat(value.replace(',', '.')))
    .refine((value) => !Number.isNaN(value) && value >= 0, 'Preco invalido'),
  duration_minutes: z
    .preprocess((value) => String(value ?? ''), z.string())
    .transform((value) => parseInt(value, 10))
    .refine(
      (value) => !Number.isNaN(value) && value > 0 && value <= 480,
      'Duracao invalida (max. 8h)',
    ),
  is_active: z.boolean().optional(),
})

export type ServiceInput = z.infer<typeof serviceSchema>
