'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { sanitizeWhatsApp } from '@/lib/utils/format'

export function CustomerContactActions({ name, whatsapp }: { name: string; whatsapp: string }) {
  const [copied, setCopied] = useState(false)
  const message = encodeURIComponent(`Olá, ${name}! Tudo bem? Estou entrando em contato sobre seu atendimento.`)
  const whatsappHref = `https://wa.me/${sanitizeWhatsApp(whatsapp)}?text=${message}`

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(whatsapp)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false) }
  }

  return <div className="mt-5 grid grid-cols-2 gap-3">
    <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-xs font-semibold text-black"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
    <button type="button" onClick={copyPhone} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 text-xs text-[#D7DADE] hover:border-[#F5C400] hover:text-[#F5C400]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar telefone'}</button>
  </div>
}
