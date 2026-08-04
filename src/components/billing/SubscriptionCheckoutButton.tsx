'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export function SubscriptionCheckoutButton({
  planCode,
  disabled = false,
  label = 'Escolher plano',
  featured = false,
}: { planCode: string; disabled?: boolean; label?: string; featured?: boolean }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const openCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (result.status === 'active' || result.status === 'plan_updated') {
        window.location.reload()
        return
      }

      if (typeof result.checkoutUrl !== 'string') {
        throw new Error('O Asaas nao retornou o link de pagamento.')
      }

      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast({
        title: 'Pagamento indisponivel',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className={featured
        ? 'h-10 w-full rounded-lg bg-[#F5C400] text-xs font-bold text-black shadow-[0_8px_24px_rgba(245,196,0,.2)] hover:bg-[#FFD21A]'
        : 'h-10 w-full rounded-lg border border-[#F5C400] bg-transparent text-xs font-semibold text-[#F5C400] hover:bg-[#F5C400]/10 hover:text-[#FFD21A]'}
      disabled={disabled || loading}
      onClick={openCheckout}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
      {loading ? 'Preparando...' : label}
    </Button>
  )
}
