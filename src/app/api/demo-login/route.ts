import { NextRequest, NextResponse } from 'next/server'
import { isDemoCredential } from '@/lib/demo-data'
import { DEMO_EMAIL_COOKIE, DEMO_ROLE_COOKIE, getDemoRedirect } from '@/lib/demo-session'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = String(body.email ?? '')
  const password = String(body.password ?? '')
  const role = isDemoCredential(email, password)

  if (!role) {
    return NextResponse.json({ error: 'Credenciais de teste invalidas' }, { status: 401 })
  }

  const response = NextResponse.json({ role, redirectTo: getDemoRedirect(role) })
  const maxAge = 60 * 60 * 24 * 7

  response.cookies.set(DEMO_ROLE_COOKIE, role, {
    maxAge,
    sameSite: 'lax',
    path: '/',
  })
  response.cookies.set(DEMO_EMAIL_COOKIE, email.trim().toLowerCase(), {
    maxAge,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
