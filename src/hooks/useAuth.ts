'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ClientUser = { id: string; email: string | null }

export function useAuth() {
  const [user, setUser] = useState<ClientUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((payload) => setUser(payload.user ?? null))
      .finally(() => setLoading(false))
  }, [])

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    await fetch('/api/demo-logout', { method: 'POST' }).catch(() => null)
    window.localStorage.removeItem('agendbarber_demo_role')
    setUser(null)
    router.replace('/login')
    router.refresh()
  }

  return { user, loading, signOut }
}
