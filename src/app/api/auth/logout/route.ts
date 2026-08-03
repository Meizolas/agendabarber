import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, revokeCurrentSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isTrustedMutationRequest } from '@/lib/security/request'

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  await revokeCurrentSession(request).catch(() => null)

  // Durante a transicao, tambem encerra uma eventual sessao antiga do Supabase.
  const legacyClient = await createClient()
  await legacyClient.auth.signOut().catch(() => null)

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
