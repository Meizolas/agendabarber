import { createHash } from 'crypto'
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
