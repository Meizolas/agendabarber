import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { updateAppointmentStatusSchema } from '@/lib/validations/appointment'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateAppointmentStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Status invalido' }, { status: 400 })
    }

    const adminClient = createServiceClient()
    const { data: barber } = await adminClient
      .from('barbers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!barber) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('appointments')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .eq('barber_id', barber.id)
      .select('*, service:services(*)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agendamento nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ appointment: data })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
