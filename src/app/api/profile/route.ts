import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validations/profile'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabase.from('barbers').select('*').eq('user_id', user.id).single()
  return NextResponse.json({ barber: data ?? null })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { data: existing } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()

  if (!existing) {
    // Criar perfil
    const { data, error } = await supabase
      .from('barbers')
      .insert({ user_id: user.id, ...parsed.data, slug: parsed.data.slug.toLowerCase() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ barber: data }, { status: 201 })
  }

  // Atualizar perfil
  const { data, error } = await supabase
    .from('barbers')
    .update({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ barber: data })
}
