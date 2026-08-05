'use client'

import { useEffect } from 'react'

export function BillingReconciler({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const reconcile = async () => {
      const response = await fetch('/api/billing/reconcile', { method: 'POST' })
      const result = await response.json().catch(() => null)
      if (!cancelled && response.ok && result?.active) window.location.replace('/dashboard')
    }
    void reconcile()
    return () => { cancelled = true }
  }, [enabled])

  return null
}
