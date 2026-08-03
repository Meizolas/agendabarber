'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export function SubscriptionCheckoutButton({ disabled = false }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const openCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (result.status === 'active') {
        window.location.assign('/dashboard')
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
      className="gold-action w-full"
      disabled={disabled || loading}
      onClick={openCheckout}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
      {loading ? 'Abrindo ambiente seguro...' : 'Cadastrar cartao e assinar'}
    </Button>
  )
}
