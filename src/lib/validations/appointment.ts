import { z } from 'zod'

export const createAppointmentSchema = z.object({
  staff_member_id: z.string().uuid('Profissional invalido'),
  barber_id: z.string().uuid('Barbeiro invalido'),
  service_id: z.string().uuid('Servico invalido'),
  client_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  client_whatsapp: z
    .string()
    .min(10, 'WhatsApp invalido')
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10 && v.length <= 13, 'WhatsApp invalido'),
  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  appointment_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horario invalido'),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  payment_method: z.enum(['pix', 'at_barbershop']).default('at_barbershop'),
})

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']).optional(),
  payment_status: z.enum(['pending_confirmation', 'paid']).optional(),
}).refine((value) => value.status || value.payment_status, 'Informe uma atualizacao')

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>
