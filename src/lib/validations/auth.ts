import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido').max(254),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres').max(128),
})

export const registerSchema = z
  .object({
    barber_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
    barbershop_name: z.string().min(2, 'Nome da barbearia deve ter no minimo 2 caracteres'),
    whatsapp: z
      .string()
      .min(10, 'WhatsApp invalido')
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length >= 10 && value.length <= 13, 'WhatsApp invalido'),
    slug: z
      .string()
      .min(3, 'Link deve ter no minimo 3 caracteres')
      .max(50, 'Link deve ter no maximo 50 caracteres')
      .regex(/^[a-z0-9-]+$/, 'Use apenas letras minusculas, numeros e hifens'),
    email: z.string().email('E-mail invalido').max(254),
    password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres').max(128),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((accepted) => accepted, 'Aceite os termos para continuar'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
