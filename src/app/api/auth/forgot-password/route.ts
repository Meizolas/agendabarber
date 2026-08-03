import { createHash, randomBytes, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/auth/email'
import { enforceRateLimit, isTrustedMutationRequest, requestFingerprint } from '@/lib/security/request'

const schema = z.object({ email: z.string().email() })
const genericMessage = 'Se o e-mail estiver cadastrado, enviaremos as instrucoes.'

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  if (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM) {
    return NextResponse.json({ error: 'Recuperacao de senha ainda nao configurada.' }, { status: 503 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: genericMessage })

  const email = parsed.data.email.trim().toLowerCase()
  const admin = createServiceClient()

  try {
    const allowed = await enforceRateLimit({
      supabase: admin,
      key: requestFingerprint(request, `forgot-password:${email}`),
      limit: 5,
      windowSeconds: 60 * 60,
    })
    if (!allowed) return NextResponse.json({ message: genericMessage })
  } catch {
    return NextResponse.json({ error: 'Recuperacao temporariamente indisponivel.' }, { status: 503 })
  }

  const { data: user } = await admin
    .from('users')
    .select('id, email')
    .eq('email', email)
    .neq('account_status', 'disabled')
    .maybeSingle()

  if (!user) return NextResponse.json({ message: genericMessage })

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const resetId = randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  const { error: tokenError } = await admin.from('password_reset_tokens').insert({
    id: resetId,
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })
  if (tokenError) {
    return NextResponse.json({ error: 'Recuperacao temporariamente indisponivel.' }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || request.nextUrl.origin

  try {
    await sendPasswordResetEmail({
      email: user.email,
      resetUrl: `${appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`,
      idempotencyKey: `password-reset-${resetId}`,
    })
  } catch (error) {
    console.error('[Auth] Password reset email failed:', error)
    await admin.from('password_reset_tokens').delete().eq('id', resetId)
    return NextResponse.json({ error: 'Nao foi possivel enviar o e-mail agora.' }, { status: 503 })
  }

  return NextResponse.json({ message: genericMessage })
}
