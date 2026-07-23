import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateAppointmentStatusSchema } from '@/lib/validations/appointment'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

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
      .eq('id', params.id)
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
