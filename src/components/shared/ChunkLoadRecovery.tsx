'use client'

import { useEffect } from 'react'

const RECOVERY_KEY = 'agendbarber_chunk_reload'

export function ChunkLoadRecovery() {
  useEffect(() => {
    const recover = (event: ErrorEvent | PromiseRejectionEvent) => {
      const reason = 'reason' in event ? event.reason : event.error
      const message = String(reason?.message || reason || '')
      const isChunkError =
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('failed to fetch dynamically imported module')

      if (!isChunkError) return

      const alreadyReloaded = window.sessionStorage.getItem(RECOVERY_KEY)
      if (alreadyReloaded) return

      window.sessionStorage.setItem(RECOVERY_KEY, '1')
      window.location.reload()
    }

    window.addEventListener('error', recover)
    window.addEventListener('unhandledrejection', recover)

    return () => {
      window.removeEventListener('error', recover)
      window.removeEventListener('unhandledrejection', recover)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem(RECOVERY_KEY)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [])

  return null
}
