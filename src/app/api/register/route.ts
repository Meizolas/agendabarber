import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { registerSchema } from '@/lib/validations/auth'
import { enforceRateLimit, getClientIp, isTrustedMutationRequest, requestFingerprint } from '@/lib/security/request'
import { hashPassword } from '@/lib/auth/password'
import { createSession, setSessionCookie } from '@/lib/auth/session'

const TERMS_VERSION = '2026-08-01'

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, barber_name, barbershop_name, whatsapp, slug } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedSlug = slug.toLowerCase()
  const admin = createServiceClient()

  try {
    const allowed = await enforceRateLimit({
      supabase: admin,
      key: requestFingerprint(request, 'register'),
      limit: 4,
      windowSeconds: 60 * 60,
    })
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas de cadastro. Tente mais tarde.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Cadastro temporariamente indisponivel.' }, { status: 503 })
  }

  const [{ data: existingUser }, { data: existingSlug }] = await Promise.all([
    admin.from('users').select('id').eq('email', normalizedEmail).maybeSingle(),
    admin.from('barbers').select('id').eq('slug', normalizedSlug).maybeSingle(),
  ])

  if (existingUser) {
    return NextResponse.json({ error: 'Este e-mail ja esta cadastrado.' }, { status: 409 })
  }
  if (existingSlug) {
    return NextResponse.json({ error: 'Link publico ja esta em uso.' }, { status: 409 })
  }

  const userId = randomUUID()
  const passwordHash = await hashPassword(password)
  const clientIp = getClientIp(request)
  const { error } = await admin.rpc('create_local_account', {
    p_user_id: userId,
    p_email: normalizedEmail,
    p_password_hash: passwordHash,
    p_barber_name: barber_name,
    p_barbershop_name: barbershop_name,
    p_whatsapp: whatsapp,
    p_slug: normalizedSlug,
    p_terms_version: TERMS_VERSION,
    p_terms_ip: clientIp === 'unknown' ? null : clientIp,
  })

  if (error) {
    const duplicate = error.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'E-mail ou link publico ja esta em uso.' : 'Nao foi possivel criar sua conta.' },
      { status: duplicate ? 409 : 500 },
    )
  }

  const session = await createSession(userId, request)
  const response = NextResponse.json(
    { ok: true, user: { id: userId, email: normalizedEmail } },
    { status: 201 },
  )
  setSessionCookie(response, session)
  return response
}
