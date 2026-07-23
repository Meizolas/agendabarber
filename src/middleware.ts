import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const hasAdminSession = Boolean(user)

  const isAuthRoute = pathname === '/login' || pathname === '/cadastro'
  const isPublicBookingRoute = pathname.startsWith('/agendar')
  const isLegacyClientRoute = pathname.startsWith('/cliente') || pathname === '/onboarding'
  const isDashboardRoute = [
    '/dashboard',
    '/servicos',
    '/horarios',
    '/agendamentos',
    '/perfil',
  ].some((route) => pathname.startsWith(route))

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasAdminSession ? '/dashboard' : '/login', request.url))
  }

  if (isLegacyClientRoute) {
    return NextResponse.redirect(new URL(hasAdminSession ? '/dashboard' : '/login', request.url))
  }

  if (isAuthRoute && hasAdminSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isDashboardRoute && !hasAdminSession && !isPublicBookingRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
