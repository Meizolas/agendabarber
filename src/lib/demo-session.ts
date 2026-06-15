export const DEMO_ROLE_COOKIE = 'agendbarber_demo_role'
export const DEMO_EMAIL_COOKIE = 'agendbarber_demo_email'
export const DEMO_STORAGE_KEY = 'agendbarber_demo_role'

export function getDemoRedirect(role: string | undefined | null) {
  return role === 'admin' ? '/dashboard' : '/'
}
