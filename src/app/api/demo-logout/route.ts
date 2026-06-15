import { NextResponse } from 'next/server'
import { DEMO_EMAIL_COOKIE, DEMO_ROLE_COOKIE } from '@/lib/demo-session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(DEMO_ROLE_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(DEMO_EMAIL_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
