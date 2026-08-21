'use client'

import { useState } from 'react'
import { Check, Loader2, Save } from 'lucide-react'

export function CustomerNotesForm({ customerId, initialNotes }: { customerId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    try {
      const response = await fetch(`/api/customers/${customerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
      if (!response.ok) throw new Error()
      setStatus('saved')
      window.setTimeout(() => setStatus('idle'), 2000)
    } catch { setStatus('error') }
  }

  return <div><textarea value={notes} onChange={(event) => { setNotes(event.target.value); setStatus('idle') }} maxLength={2000} placeholder="Ex.: prefere degradê baixo; enviar lembrete antes do horário..." className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-[#0B0D0F] p-3 text-sm text-white outline-none placeholder:text-[#777B82] focus:border-[#F5C400]/60" /><div className="mt-2 flex items-center justify-between"><span className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-[#777B82]'}`}>{status === 'error' ? 'Não foi possível salvar.' : `${notes.length}/2000`}</span><button type="button" onClick={save} disabled={status === 'saving'} className="flex items-center gap-2 rounded-lg bg-[#F5C400] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60">{status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : status === 'saved' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{status === 'saved' ? 'Salvo' : 'Salvar'}</button></div></div>
}
