import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z
  .object({
    barber_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    barbershop_name: z.string().min(2, 'Nome da barbearia deve ter no mínimo 2 caracteres'),
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
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
