import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { findLocalUserBySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { getBillingAccessByUserId } from '@/lib/billing/access'
import { isTrustedMutationRequest } from '@/lib/security/request'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAsaasWebhook = pathname === '/api/webhooks/asaas'
  const isSessionlessPublicRequest = Boolean(
    pathname.startsWith('/agendar')
    || pathname.startsWith('/api/public/')
    || (pathname === '/api/available-slots' && request.method === 'GET')
    || (pathname === '/api/appointments' && request.method === 'POST')
  )

  if (isAsaasWebhook || isSessionlessPublicRequest) {
    if (
      !isAsaasWebhook
      && pathname.startsWith('/api/')
      && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      && !isTrustedMutationRequest(request)
    ) {
      return NextResponse.json({ error: 'Origem da requisicao nao permitida.' }, { status: 403 })
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const localUser = await findLocalUserBySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  ).catch(() => null)
  const { data: { user: legacyUser } } = localUser
    ? { data: { user: null } }
    : await supabase.auth.getUser()
  const hasAdminSession = Boolean(localUser || legacyUser)
  const authenticatedUserId = localUser?.id || legacyUser?.id || null

  const isAuthRoute = [
    '/login',
    '/cadastro',
    '/esqueci-senha',
    '/redefinir-senha',
  ].includes(pathname)
  const isPublicBookingRoute = pathname.startsWith('/agendar')
  const isLegacyClientRoute = pathname === '/cliente' || pathname.startsWith('/cliente/') || pathname === '/onboarding'
  const isDashboardRoute = [
    '/dashboard',
    '/servicos',
    '/horarios',
    '/agendamentos',
    '/clientes',
    '/perfil',
    '/equipe',
    '/assinatura',
  ].some((route) => pathname.startsWith(route))
  const isSubscriptionRoute = pathname.startsWith('/assinatura')
  const isPaidAdminApi = [
    '/api/appointments',
    '/api/customers',
    '/api/availability',
    '/api/blocked-times',
    '/api/profile',
    '/api/service-images',
    '/api/services',
    '/api/staff',
    '/api/financial-goal',
    '/api/push',
    '/api/whatsapp',
  ].some((route) => pathname.startsWith(route))

  const redirect = (destination: string) => {
    const response = NextResponse.redirect(new URL(destination, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  if (
    pathname.startsWith('/api/')
    && !isAsaasWebhook
    && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    && !isTrustedMutationRequest(request)
  ) {
    return NextResponse.json({ error: 'Origem da requisicao nao permitida.' }, { status: 403 })
  }

  const needsBillingAccess = Boolean(
    authenticatedUserId
    && (
      (isDashboardRoute && !isSubscriptionRoute)
      || isPaidAdminApi
      || pathname === '/'
      || isAuthRoute
    )
  )
  const billingAccess = needsBillingAccess
    ? await getBillingAccessByUserId(authenticatedUserId!).catch(() => ({ allowed: false }))
    : null

  if (isPaidAdminApi && billingAccess && !billingAccess.allowed) {
    return NextResponse.json(
      { error: 'Assinatura necessaria.', code: 'PAYMENT_REQUIRED' },
      { status: 402 },
    )
  }

  if (isDashboardRoute && !isSubscriptionRoute && billingAccess && !billingAccess.allowed) {
    return redirect('/assinatura')
  }

  if (pathname === '/') {
    return redirect(hasAdminSession
      ? (billingAccess?.allowed ? '/dashboard' : '/assinatura')
      : '/login')
  }

  if (isLegacyClientRoute) {
    return redirect(hasAdminSession ? '/dashboard' : '/login')
  }

  if (isAuthRoute && hasAdminSession) {
    return redirect(billingAccess?.allowed ? '/dashboard' : '/assinatura')
  }

  if (isDashboardRoute && !hasAdminSession && !isPublicBookingRoute) {
    return redirect('/login')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
