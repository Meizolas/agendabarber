'use client'

import { useCallback, useEffect, useState } from 'react'
import { Snowflake, CalendarDays, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/ui/use-toast'
import { getSaoPauloDate } from '@/lib/utils/timezone'
import { formatDateShort } from '@/lib/utils/format'
import type { BlockedTime } from '@/types'

interface Props {
  date?: string
  onChanged?: () => void
  disabled?: boolean
  refreshKey?: string
}

export function FreezeDayControl({ date, onChanged, disabled = false, refreshKey }: Props) {
  const [chosenDate, setChosenDate] = useState(getSaoPauloDate)
  const selectedDate = date ?? chosenDate
  const [state, setState] = useState<{ date: string; frozen: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(false)
    try {
      const response = await fetch(`/api/blocked-times?date=${selectedDate}`, { cache: 'no-store', signal })
      const payload = await response.json()
      if (!response.ok) throw new Error()
      if (!signal?.aborted) setState({ date: selectedDate, frozen: (payload.blocked as BlockedTime[]).some((block) => block.blocked_time === null) })
    } catch {
      if (!signal?.aborted) setError(true)
    }
  }, [selectedDate])

  useEffect(() => {
    setConfirmOpen(false)
    if (disabled) return
    const controller = new AbortController()
    void load(controller.signal)
    const refresh = () => { void load(controller.signal) }
    window.addEventListener('focus', refresh)
    return () => { controller.abort(); window.removeEventListener('focus', refresh) }
  }, [load, disabled, refreshKey])

  const ready = state?.date === selectedDate && !error
  const frozen = ready && state.frozen

  const change = async () => {
    setBusy(true)
    try {
      const response = await fetch(frozen ? `/api/blocked-times?date=${selectedDate}` : '/api/blocked-times', {
        method: frozen ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(frozen ? {} : { body: JSON.stringify({ blocked_date: selectedDate, blocked_time: null }) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Tente novamente.')
      setState({ date: selectedDate, frozen: !frozen })
      setConfirmOpen(false)
      toast({ title: frozen ? 'Dia liberado' : 'Dia congelado', description: frozen ? 'Os horários seguem o expediente e os demais bloqueios.' : 'Novas reservas estão bloqueadas. As existentes foram mantidas.' })
      onChanged?.()
    } catch (cause) {
      toast({ title: 'Não foi possível alterar o dia', description: cause instanceof Error ? cause.message : 'Tente novamente.', variant: 'destructive' })
    } finally { setBusy(false) }
  }

  return (
    <section className={`dashboard-card space-y-3 p-3 ${frozen ? 'border-sky-400/40 bg-sky-400/5' : ''}`} aria-label="Disponibilidade de uma data específica">
      <div className="flex items-center gap-2">
        {frozen ? <Snowflake className="h-5 w-5 text-sky-300" /> : <CalendarDays className="h-5 w-5 text-[#F5C400]" />}
        <div>
          <h2 className="text-xs font-semibold text-white">{frozen ? 'Dia congelado' : 'Congelar uma data'}</h2>
          <p className="mt-1 text-[11px] text-[#A2A6AD]">{date ? formatDateShort(selectedDate) : 'Escolha uma data, sem alterar seus dias de atendimento.'}</p>
        </div>
      </div>
      {!date && <div><label htmlFor="freeze-date" className="mb-1 block text-xs text-[#A2A6AD]">Data específica</label><Input id="freeze-date" type="date" min={getSaoPauloDate()} value={chosenDate} disabled={busy} onChange={(event) => { if (event.target.value) setChosenDate(event.target.value) }} /></div>}
      <p className="text-[11px] text-[#A2A6AD]">{frozen ? 'Sem novas reservas para toda a equipe. Agendamentos existentes continuam na agenda.' : 'Pausa novas reservas de toda a equipe apenas nesta data. Agendamentos existentes são mantidos.'}</p>
      {error && <p role="alert" className="text-xs text-red-300">Não foi possível consultar o dia. <button type="button" onClick={() => void load()} className="underline">Tentar novamente</button></p>}
      <Button variant="outline" className="w-full gap-2" disabled={disabled || busy || !ready || (!frozen && selectedDate < getSaoPauloDate())} onClick={() => setConfirmOpen(true)}>
        {frozen ? <RotateCcw className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
        {disabled ? 'Disponível na conta real' : !ready && !error ? 'Consultando dia...' : frozen ? 'Liberar dia' : 'Congelar dia'}
      </Button>
      <ConfirmDialog open={confirmOpen} onOpenChange={(open) => { if (!busy) setConfirmOpen(open) }} title={`${frozen ? 'Liberar' : 'Congelar'} ${formatDateShort(selectedDate)}?`} description={frozen ? 'Novas reservas voltam a seguir o expediente, os horários ocupados e os bloqueios específicos.' : 'Nenhum profissional receberá novas reservas nesta data. Os agendamentos existentes não serão cancelados.'} confirmLabel={frozen ? 'Liberar dia' : 'Congelar dia'} variant="default" loading={busy} onConfirm={() => void change()} />
    </section>
  )
}
