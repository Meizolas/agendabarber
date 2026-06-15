import { z } from 'zod'

export const createAppointmentSchema = z.object({
  barber_id: z.string().uuid('Barbeiro inválido'),
  service_id: z.string().uuid('Serviço inválido'),
  client_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  client_whatsapp: z
    .string()
    .min(10, 'WhatsApp inválido')
    .transform((v) => v.replace(/\D/g, '')),
  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  appointment_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário inválido'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>
