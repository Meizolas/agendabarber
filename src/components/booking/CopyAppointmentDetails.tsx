'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyAppointmentDetails({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return <button type="button" onClick={copyDetails} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-sm text-[#D7DADE] hover:border-[#F5C400] hover:text-[#F5C400]">
    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
    {copied ? 'Detalhes copiados' : 'Copiar detalhes do agendamento'}
  </button>
}
