import { z } from 'zod'

export const profileSchema = z.object({
  barbershop_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  barber_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  whatsapp: z
    .string()
    .min(10, 'WhatsApp inválido')
    .transform((v) => v.replace(/\D/g, '')),
  slug: z
    .string()
    .min(3, 'Link deve ter no mínimo 3 caracteres')
    .max(50, 'Link deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Use apenas letras minúsculas, números e hífens',
    ),
})

export type ProfileInput = z.infer<typeof profileSchema>
