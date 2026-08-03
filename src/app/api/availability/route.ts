import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { availabilityRuleSchema } from '@/lib/validations/availability'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ rules: [] })

  const { data, error } = await adminClient
    .from('availability_rules')
    .select('*')
    .eq('barber_id', barber.id)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = availabilityRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

  const { data, error } = await adminClient
    .from('availability_rules')
    .insert({ barber_id: barber.id, ...parsed.data })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Este dia ja esta configurado.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ rule: data }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : null
  const parsed = availabilityRuleSchema.safeParse(body)
  if (!id || !parsed.success) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  if (!barber) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })

  const { data, error } = await admin
    .from('availability_rules')
    .update(parsed.data)
    .eq('id', id)
    .eq('barber_id', barber.id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Horario nao encontrado' }, { status: 404 })
  return NextResponse.json({ rule: data })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })

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
    .from('availability_rules')
    .delete()
    .eq('id', id)
    .eq('barber_id', barber.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
