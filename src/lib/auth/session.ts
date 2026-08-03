import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient as createLegacyClient, createServiceClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/security/request'

export const SESSION_COOKIE_NAME = 'agendbarber_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30

export interface AuthUser {
  id: string
  email: string | null
  accountStatus: 'active' | 'disabled' | 'pending_migration'
  authSource: 'local' | 'supabase'
}

interface StoredUser {
  id: string
  email: string
  account_status: AuthUser['accountStatus']
  auth_source: AuthUser['authSource']
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function findLocalUserBySessionToken(token?: string | null): Promise<AuthUser | null> {
  if (!token) return null

  const admin = createServiceClient()
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select('user_id')
    .eq('token_hash', hashSessionToken(token))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (sessionError || !session) return null

  const { data: user, error: userError } = await admin
    .from('users')
    .select('id, email, account_status, auth_source')
    .eq('id', session.user_id)
    .maybeSingle()

  if (userError || !user) return null

  const storedUser = user as StoredUser
  if (storedUser.account_status === 'disabled') return null

  return {
    id: storedUser.id,
    email: storedUser.email,
    accountStatus: storedUser.account_status,
    authSource: storedUser.auth_source,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const localUser = await findLocalUserBySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  ).catch(() => null)

  if (localUser) return localUser

  // Compatibilidade temporaria com sessoes existentes do Supabase Auth.
  const legacyClient = await createLegacyClient()
  const { data: { user } } = await legacyClient.auth.getUser()
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    accountStatus: 'pending_migration',
    authSource: 'supabase',
  }
}

export async function createSession(userId: string, request: NextRequest) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)
  const clientIp = getClientIp(request)
  const admin = createServiceClient()

  const { error } = await admin.from('sessions').insert({
    user_id: userId,
    token_hash: hashSessionToken(token),
    expires_at: expiresAt.toISOString(),
    ip_address: clientIp === 'unknown' ? null : clientIp,
    user_agent: request.headers.get('user-agent')?.slice(0, 1000) ?? null,
  })

  if (error) throw new Error(`SESSION_CREATE_FAILED:${error.message}`)
  return { token, expiresAt }
}

export function setSessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date },
) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  })
}

export async function revokeCurrentSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return

  await createServiceClient()
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashSessionToken(token))
    .is('revoked_at', null)
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
