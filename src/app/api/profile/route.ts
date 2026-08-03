import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { profileSchema } from '@/lib/validations/profile'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data } = await adminClient
    .from('barbers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ barber: data ?? null })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const adminClient = createServiceClient()
  const { data: existing } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    const { data, error } = await adminClient
      .from('barbers')
      .insert({ user_id: user.id, ...parsed.data, slug: parsed.data.slug.toLowerCase() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Link publico ja em uso' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ barber: data }, { status: 201 })
  }

  const { data, error } = await adminClient
    .from('barbers')
    .update({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Link publico ja em uso' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ barber: data })
}
