import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { blockTimeSchema } from '@/lib/validations/availability'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ blocked: [] })

  const { data } = await supabase
    .from('blocked_times').select('*').eq('barber_id', barber.id).order('blocked_date')

  return NextResponse.json({ blocked: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = blockTimeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const { data, error } = await supabase
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
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { error } = await supabase
    .from('blocked_times').delete().eq('id', id).eq('barber_id', barber.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
