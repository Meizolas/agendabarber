import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_ROLE_COOKIE, getDemoRedirect } from '@/lib/demo-session'

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
  const demoRole = request.cookies.get(DEMO_ROLE_COOKIE)?.value
  const isAuthenticated = Boolean(user || demoRole)
  const isAuthRoute = pathname === '/login' || pathname === '/cadastro'
  const isPublicBookingRoute = pathname.startsWith('/agendar')

  // Rotas protegidas do dashboard
  const isDashboardRoute = [
    '/dashboard',
    '/servicos',
    '/horarios',
    '/agendamentos',
    '/perfil',
  ].some((route) => pathname.startsWith(route))
  const isClientRoute = pathname === '/' || pathname.startsWith('/cliente')

  if ((pathname === '/onboarding' || isAuthRoute) && isAuthenticated) {
    return NextResponse.redirect(new URL(demoRole ? getDemoRedirect(demoRole) : '/dashboard', request.url))
  }

  if ((isClientRoute || isDashboardRoute) && !isAuthenticated && !isPublicBookingRoute) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Redirecionar para login se não autenticado em rota protegida
  if (isDashboardRoute && !user && demoRole !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isDashboardRoute && demoRole === 'client') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirecionar para dashboard se já autenticado nas páginas de auth
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
