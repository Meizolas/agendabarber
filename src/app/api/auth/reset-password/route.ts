import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/password'
import { enforceRateLimit, isTrustedMutationRequest, requestFingerprint } from '@/lib/security/request'

const schema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas nao coincidem.',
})

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Link ou senha invalidos.' }, { status: 400 })
  }

  const admin = createServiceClient()
  try {
    const allowed = await enforceRateLimit({
      supabase: admin,
      key: requestFingerprint(request, 'reset-password'),
      limit: 10,
      windowSeconds: 60 * 60,
    })
    if (!allowed) return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 })
  } catch {
    return NextResponse.json({ error: 'Recuperacao temporariamente indisponivel.' }, { status: 503 })
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex')
  const { data: userId, error } = await admin.rpc('complete_password_reset', {
    p_token_hash: tokenHash,
    p_password_hash: passwordHash,
  })

  if (error || !userId) {
    return NextResponse.json({ error: 'Este link expirou ou ja foi utilizado.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
