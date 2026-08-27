import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export function requestFingerprint(request: NextRequest, scope: string) {
  return createHash('sha256').update(`${scope}:${getClientIp(request)}`).digest('hex')
}

export function isTrustedMutationRequest(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') return false

  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).host === request.nextUrl.host
  } catch {
    return false
  }
}

function configuredOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!value) return null
  try { return new URL(value).origin } catch { return null }
}

export function isOfficialOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const expectedOrigin = configuredOrigin()
  if (!origin) {
    const fetchSite = request.headers.get('sec-fetch-site')
    return fetchSite === 'same-origin' || fetchSite === 'same-site'
  }
  try {
    const originUrl = new URL(origin)
    return expectedOrigin ? originUrl.origin === expectedOrigin : originUrl.host === request.nextUrl.host
  } catch { return false }
}

function tokenMatches(received: string | null, expected: string) {
  if (!received || !expected) return false
  const receivedHash = createHash('sha256').update(received).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(receivedHash, expectedHash)
}

export function hasValidApiKey(request: NextRequest) {
  return tokenMatches(request.headers.get('x-api-key'), process.env.APP_API_KEY?.trim() ?? '')
}

export function hasApiKeyConfigured() {
  const value = process.env.APP_API_KEY?.trim()
  return Boolean(value && value.length >= 32)
}

export function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && isOfficialOrigin(request)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Asaas-Access-Token')
    response.headers.set('Vary', 'Origin')
  }
  return response
}

export function isHttpsRequest(request: NextRequest) {
  return (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')) === 'https'
}

export async function enforceRateLimit({ supabase, key, limit, windowSeconds }: {
  supabase: SupabaseClient
  key: string
  limit: number
  windowSeconds: number
}) {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('[Rate limit] Database error:', error)
    throw new Error('RATE_LIMIT_NOT_CONFIGURED')
  }
  return Boolean(data)
}
