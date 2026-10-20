'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Loader2, Plus, X } from 'lucide-react'
import type { AvailabilityRule, BlockedTime } from '@/types'
import type { BlockTimesBatchInput } from '@/lib/validations/availability'
import { getSaoPauloDate, getSaoPauloParts } from '@/lib/utils/timezone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BlockTimesBatchInput) => Promise<void>
  onUnblock: (block: BlockedTime) => Promise<boolean>
  rules: AvailabilityRule[]
  blockedTimes: BlockedTime[]
  initialDate?: string
  loading?: boolean
}

export function BlockTimeForm({ open, onOpenChange, onSubmit, onUnblock, rules, blockedTimes, initialDate, loading }: Props) {
  const [date, setDate] = useState(getSaoPauloDate)
  const [selected, setSelected] = useState<string[]>([])
  const [customTime, setCustomTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [unblockTarget, setUnblockTarget] = useState<BlockedTime | null>(null)
  const [unblocking, setUnblocking] = useState(false)

  useEffect(() => {
    if (!open) return
    const today = getSaoPauloDate()
    setDate(initialDate && initialDate >= today ? initialDate : today)
    setSelected([])
    setCustomTime('')
    setReason('')
    setError('')
    setUnblockTarget(null)
  }, [initialDate, open])

  const dayOfWeek = date ? new Date(`${date}T12:00:00`).getDay() : -1
  const rule = rules.find((item) => item.day_of_week === dayOfWeek && item.is_active)
  const now = getSaoPauloParts()
  const currentTime = `${now.hour}:${now.minute}`
  const suggestions = useMemo(() => rule ? scheduleStarts(rule.start_time, rule.end_time, rule.interval_minutes) : [], [rule])
    .filter((time) => date !== getSaoPauloDate() || time > currentTime)
    .filter((time) => !rule?.lunch_start_time || !rule.lunch_end_time || time < rule.lunch_start_time.slice(0, 5) || time >= rule.lunch_end_time.slice(0, 5))
  const dateBlocks = blockedTimes.filter((item) => item.blocked_date === date && item.blocked_time)
  const blockedByTime = new Map(dateBlocks.map((item) => [item.blocked_time!.slice(0, 5), item]))
  const blocked = new Set(blockedByTime.keys())
  const wholeDayBlocked = blockedTimes.some((item) => item.blocked_date === date && !item.blocked_time)
  const blocksOutsideGrid = dateBlocks.filter((item) => !suggestions.includes(item.blocked_time!.slice(0, 5)))

  const toggle = (time: string) => {
    if (!selected.includes(time) && selected.length >= 48) return setError('Selecione no máximo 48 horários por vez.')
    setError('')
    setSelected((current) => current.includes(time) ? current.filter((value) => value !== time) : [...current, time].sort())
  }

  const addCustom = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime)) return setError('Informe um horário válido.')
    if (date === getSaoPauloDate() && customTime <= currentTime) return setError('Escolha um horário futuro.')
    if (blocked.has(customTime)) return setError('Esse horário já está bloqueado.')
    if (!selected.includes(customTime) && selected.length >= 48) return setError('Selecione no máximo 48 horários por vez.')
    setSelected((current) => [...new Set([...current, customTime])].sort())
    setCustomTime('')
    setError('')
  }

  const submit = async () => {
    if (!date) return setError('Escolha uma data.')
    if (!selected.length) return setError('Selecione pelo menos um horário.')
    await onSubmit({ blocked_date: date, blocked_times: selected, reason: reason || null })
  }

  const confirmUnblock = async () => {
    if (!unblockTarget) return
    setUnblocking(true)
    const removed = await onUnblock(unblockTarget)
    setUnblocking(false)
    if (removed) setUnblockTarget(null)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => { if (!loading && !unblocking) onOpenChange(next) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Gerenciar horários</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blocked-date">Data</Label>
            <Input id="blocked-date" type="date" min={getSaoPauloDate()} value={date} disabled={loading} onChange={(event) => { setDate(event.target.value); setSelected([]); setError('') }} />
          </div>

          {wholeDayBlocked ? (
            <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 p-3 text-xs text-sky-200">Esta data está congelada. Libere o dia antes de gerenciar horários específicos.</div>
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between"><Label>Toque para selecionar</Label><span className="text-[11px] text-[#F5C400]">{selected.length} selecionado{selected.length === 1 ? '' : 's'}</span></div>
                {suggestions.length ? <div className="grid grid-cols-4 gap-2">
                  {suggestions.map((time) => {
                    const active = selected.includes(time)
                    const persistedBlock = blockedByTime.get(time)
                    return <button key={time} type="button" disabled={loading || unblocking} aria-pressed={active} onClick={() => persistedBlock ? setUnblockTarget(persistedBlock) : toggle(time)} className={`relative min-h-10 rounded-lg border text-xs font-medium transition ${persistedBlock ? 'border-red-400/50 bg-red-500/15 text-red-300 hover:bg-red-500/25' : active ? 'border-[#F5C400] bg-[#F5C400] text-black' : 'border-white/10 bg-[#101214] text-white hover:border-[#F5C400]/60'}`}>{persistedBlock ? <X className="absolute right-1 top-1 h-3 w-3" /> : active && <Check className="absolute right-1 top-1 h-3 w-3" />}{time}<span className="sr-only">{persistedBlock ? ' - bloqueado; toque para desbloquear' : ''}</span></button>
                  })}
                </div> : <p className="rounded-lg border border-white/10 bg-[#101214] p-3 text-xs text-[#A2A6AD]">Não há expediente configurado para esta data. Você ainda pode adicionar um horário abaixo.</p>}
                {blocked.size > 0 && <p className="mt-2 text-[10px] text-red-300/80">Horários vermelhos estão bloqueados. Toque para desbloquear.</p>}
              </div>

              {blocksOutsideGrid.length > 0 && <div className="space-y-2"><Label>Outros bloqueios nesta data</Label><div className="flex flex-wrap gap-2">{blocksOutsideGrid.map((block) => { const time = block.blocked_time!.slice(0, 5); return <button key={block.id} type="button" disabled={loading || unblocking} onClick={() => setUnblockTarget(block)} className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/25">{time}<X className="h-3 w-3" /><span className="sr-only">Desbloquear</span></button> })}</div></div>}

              <div className="space-y-2">
                <Label htmlFor="custom-block-time">Adicionar outro horário</Label>
                <div className="flex gap-2"><div className="relative flex-1"><Input id="custom-block-time" type="time" value={customTime} disabled={loading} onChange={(event) => setCustomTime(event.target.value)} className="pr-9" /><Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858A93]" /></div><Button type="button" variant="outline" disabled={loading || !customTime} onClick={addCustom} aria-label="Adicionar horário"><Plus className="h-4 w-4" /></Button></div>
              </div>

              {selected.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Horários selecionados">{selected.map((time) => <button key={time} type="button" disabled={loading} onClick={() => toggle(time)} className="inline-flex items-center gap-1 rounded-full bg-[#F5C400]/15 px-2.5 py-1.5 text-xs text-[#F5C400]">{time}<X className="h-3 w-3" /><span className="sr-only">Remover</span></button>)}</div>}

              <div className="space-y-2"><Label htmlFor="block-reason">Motivo <span className="font-normal text-[#858A93]">(opcional)</span></Label><Textarea id="block-reason" maxLength={200} value={reason} disabled={loading} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: compromisso pessoal" /></div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter><Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="button" className="bg-amber-500 hover:bg-amber-600" disabled={loading || wholeDayBlocked || !selected.length} onClick={() => void submit()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Bloquear ${selected.length || ''} horário${selected.length === 1 ? '' : 's'}`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={!!unblockTarget}
      onOpenChange={(next) => { if (!next && !unblocking) setUnblockTarget(null) }}
      title="Desbloquear horário"
      description={`Deseja desbloquear ${unblockTarget?.blocked_time?.slice(0, 5) ?? ''} do dia ${formatDate(unblockTarget?.blocked_date)}?`}
      confirmLabel="Desbloquear"
      onConfirm={() => void confirmUnblock()}
      loading={unblocking}
    />
    </>
  )
}

function formatDate(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function scheduleStarts(start: string, end: string, interval: number) {
  const toMinutes = (value: string) => { const [hours, minutes] = value.slice(0, 5).split(':').map(Number); return hours * 60 + minutes }
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  const result: string[] = []
  for (let value = toMinutes(start); value < toMinutes(end); value += interval) result.push(format(value))
  return result
}
