import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { registerSchema } from '@/lib/validations/auth'
import { enforceRateLimit, requestFingerprint } from '@/lib/security/request'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, barber_name, barbershop_name, whatsapp, slug } = parsed.data
  const supabase = createServiceClient()

  try {
    const allowed = await enforceRateLimit({
      supabase,
      key: requestFingerprint(request, 'register'),
      limit: 4,
      windowSeconds: 60 * 60,
    })
    if (!allowed) return NextResponse.json({ error: 'Muitas tentativas de cadastro. Tente mais tarde.' }, { status: 429 })
  } catch {
    return NextResponse.json({ error: 'Protecao do banco ainda nao foi instalada.' }, { status: 503 })
  }

  const { data: existingSlug } = await supabase
    .from('barbers')
    .select('id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle()

  if (existingSlug) {
    return NextResponse.json({ error: 'Link publico ja esta em uso.' }, { status: 409 })
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError || !userData.user) {
    const message = userError?.message?.toLowerCase() ?? ''
    const isDuplicate = message.includes('already') || message.includes('registered') || message.includes('exists')

    return NextResponse.json(
      {
        error: isDuplicate
          ? 'Este e-mail ja existe no Auth. Entre com ele ou remova o usuario no Supabase antes de cadastrar novamente.'
          : userError?.message ?? 'Nao foi possivel criar o usuario.',
      },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  const { error: profileError } = await supabase.from('barbers').insert({
    user_id: userData.user.id,
    barbershop_name,
    barber_name,
    whatsapp,
    slug: slug.toLowerCase(),
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)

    return NextResponse.json(
      {
        error: profileError.code === '23505'
          ? 'Link publico ja esta em uso.'
          : profileError.message,
      },
      { status: profileError.code === '23505' ? 409 : 500 },
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
