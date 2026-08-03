import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { serviceSchema } from '@/lib/validations/service'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })

  const { data, error } = await adminClient
    .from('services')
    .update(parsed.data)
    .eq('id', id)
    .eq('barber_id', barber.id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Servico nao encontrado' }, { status: 404 })
  return NextResponse.json({ service: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })

  const { error } = await adminClient
    .from('services')
    .delete()
    .eq('id', id)
    .eq('barber_id', barber.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
