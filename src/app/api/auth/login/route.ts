import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validations/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { validateLegacyCredentials } from '@/lib/auth/legacy'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { enforceRateLimit, isTrustedMutationRequest, requestFingerprint } from '@/lib/security/request'

type StoredUser = {
  id: string
  email: string
  password_hash: string | null
  auth_source: 'local' | 'supabase'
  account_status: 'active' | 'disabled' | 'pending_migration'
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const admin = createServiceClient()

  try {
    const allowed = await enforceRateLimit({
      supabase: admin,
      key: requestFingerprint(request, `login:${email}`),
      limit: 10,
      windowSeconds: 15 * 60,
    })
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Autenticacao temporariamente indisponivel.' }, { status: 503 })
  }

  const { data, error } = await admin
    .from('users')
    .select('id, email, password_hash, auth_source, account_status')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Autenticacao temporariamente indisponivel.' }, { status: 503 })
  }

  const user = data as StoredUser | null
  if (!user || user.account_status === 'disabled') {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  let authenticated = false
  let migrated = false

  if (user.auth_source === 'local' && user.password_hash) {
    authenticated = await verifyPassword(user.password_hash, parsed.data.password).catch(() => false)
  } else {
    const legacyUser = await validateLegacyCredentials(email, parsed.data.password)
    authenticated = legacyUser?.id === user.id

    if (authenticated) {
      const passwordHash = await hashPassword(parsed.data.password)
      const { error: migrationError } = await admin
        .from('users')
        .update({
          password_hash: passwordHash,
          auth_source: 'local',
          account_status: 'active',
          email_verified_at: legacyUser?.email_confirmed_at ?? new Date().toISOString(),
        })
        .eq('id', user.id)

      if (migrationError) {
        return NextResponse.json({ error: 'Nao foi possivel migrar sua conta.' }, { status: 503 })
      }
      migrated = true
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const session = await createSession(user.id, request)
  await admin.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id)

  const response = NextResponse.json({
    user: { id: user.id, email: user.email },
    migrated,
  })
  setSessionCookie(response, session)
  return response
}
