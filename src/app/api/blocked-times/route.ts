import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { blockTimeSchema } from '@/lib/validations/availability'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ blocked: [] })

  const { data, error } = await adminClient
    .from('blocked_times')
    .select('*')
    .eq('barber_id', barber.id)
    .order('blocked_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocked: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = blockTimeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

  const { data, error } = await adminClient
    .from('blocked_times')
    .insert({
      barber_id: barber.id,
      blocked_date: parsed.data.blocked_date,
      blocked_time: parsed.data.blocked_time || null,
      reason: parsed.data.reason || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocked: data }, { status: 201 })
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
    .from('blocked_times')
    .delete()
    .eq('id', id)
    .eq('barber_id', barber.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
