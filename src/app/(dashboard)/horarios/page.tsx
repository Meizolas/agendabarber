'use client'

import { useState, useEffect, useCallback } from 'react'
import { AvailabilityRule, Barber, BlockedTime } from '@/types'
import { AvailabilityForm } from '@/components/schedule/AvailabilityForm'
import { BlockTimeForm } from '@/components/schedule/BlockTimeForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Plus, Trash2, Ban, Clock3 } from 'lucide-react'
import { formatDateShort, formatTime } from '@/lib/utils/format'
import type { AvailabilityRuleInput, BlockTimeInput } from '@/lib/validations/availability'
import { demoBarber, demoRules } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'

export default function HorariosPage() {
  const [barber, setBarber] = useState<Barber | null>(null)
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [loading, setLoading] = useState(true)
  const [availFormOpen, setAvailFormOpen] = useState(false)
  const [blockFormOpen, setBlockFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1)
  const [draft, setDraft] = useState({ start: '09:00', end: '18:00', interval: 30, active: true, lunchStart: '12:00', lunchEnd: '13:00' })

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (false && window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
      setDemoMode(true)
      setBarber(demoBarber)
      setRules((current) => current.length ? current : demoRules)
      setBlockedTimes([])
      setLoading(false)
      return
    }

    const [profileResponse, rulesResponse, blockedResponse] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/availability'),
      fetch('/api/blocked-times'),
    ])

    if (!profileResponse.ok) {
      setLoading(false)
      return
    }

    const { barber: barberData } = await profileResponse.json()
    setBarber(barberData)

    if (barberData) {
      const rulesData = rulesResponse.ok ? (await rulesResponse.json()).rules : []
      const blockedData = blockedResponse.ok ? (await blockedResponse.json()).blocked : []
      setRules(rulesData ?? [])
      setBlockedTimes(blockedData ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const selectedRule = rules.find((rule) => rule.day_of_week === selectedDay)

  useEffect(() => {
    if (!selectedRule) {
      setDraft((current) => ({ ...current, start: '09:00', end: '18:00', interval: 30, active: false }))
      return
    }
    setDraft((current) => ({
      ...current,
      start: formatTime(selectedRule.start_time),
      end: formatTime(selectedRule.end_time),
      interval: selectedRule.interval_minutes,
      active: selectedRule.is_active,
    }))
  }, [selectedRule])

  const handleAddRule = async (data: AvailabilityRuleInput) => {
    if (!barber) return
    setFormLoading(true)

    if (demoMode) {
      setRules((current) => [
        ...current,
        {
          id: `demo-rule-${Date.now()}`,
          barber_id: barber.id,
          day_of_week: Number(data.day_of_week),
          start_time: data.start_time,
          end_time: data.end_time,
          interval_minutes: Number(data.interval_minutes),
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      toast({ title: 'Dia de atendimento demo adicionado!' })
      setAvailFormOpen(false)
      setFormLoading(false)
      return
    }

    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      day_of_week: Number(data.day_of_week),
      start_time: data.start_time,
      end_time: data.end_time,
      interval_minutes: Number(data.interval_minutes),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: 'Erro', description: result.error ?? 'Nao foi possivel salvar.', variant: 'destructive' })
    } else {
      toast({ title: 'Dia de atendimento adicionado!' })
      setAvailFormOpen(false)
      loadData()
    }
    setFormLoading(false)
  }

  const handleAddBlock = async (data: BlockTimeInput) => {
    if (!barber) return
    setFormLoading(true)

    if (demoMode) {
      setBlockedTimes((current) => [
        ...current,
        {
          id: `demo-block-${Date.now()}`,
          barber_id: barber.id,
          blocked_date: data.blocked_date,
          blocked_time: data.blocked_time || null,
          reason: data.reason || null,
          created_at: new Date().toISOString(),
        },
      ])
      toast({ title: 'Horário demo bloqueado!' })
      setBlockFormOpen(false)
      setFormLoading(false)
      return
    }

    const response = await fetch('/api/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      blocked_date: data.blocked_date,
      blocked_time: data.blocked_time || null,
      reason: data.reason || null,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: 'Erro', description: result.error ?? 'Nao foi possivel salvar.', variant: 'destructive' })
    } else {
      toast({ title: 'Horário bloqueado!' })
      setBlockFormOpen(false)
      loadData()
    }
    setFormLoading(false)
  }

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return
    if (demoMode) {
      setRules((current) => current.filter((rule) => rule.id !== deleteRuleId))
      toast({ title: 'Dia demo removido!' })
      setDeleteRuleId(null)
      return
    }

    const response = await fetch(`/api/availability?id=${deleteRuleId}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: 'Erro', description: result.error ?? 'Nao foi possivel remover.', variant: 'destructive' })
    } else {
      toast({ title: 'Dia removido!' })
      setDeleteRuleId(null)
      loadData()
    }
  }

  const handleDeleteBlock = async () => {
    if (!deleteBlockId) return
    if (demoMode) {
      setBlockedTimes((current) => current.filter((block) => block.id !== deleteBlockId))
      toast({ title: 'Bloqueio demo removido!' })
      setDeleteBlockId(null)
      return
    }

    const response = await fetch(`/api/blocked-times?id=${deleteBlockId}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: 'Erro', description: result.error ?? 'Nao foi possivel remover.', variant: 'destructive' })
    } else {
      toast({ title: 'Bloqueio removido!' })
      setDeleteBlockId(null)
      loadData()
    }
  }

  const handleSaveSelectedRule = async () => {
    if (!selectedRule) {
      setAvailFormOpen(true)
      return
    }
    setFormLoading(true)
    const payload = {
      id: selectedRule.id,
      day_of_week: selectedDay,
      start_time: draft.start,
      end_time: draft.end,
      interval_minutes: draft.interval,
      is_active: draft.active,
    }

    if (demoMode) {
      setRules((current) => current.map((rule) => rule.id === selectedRule.id ? { ...rule, ...payload } : rule))
      toast({ title: 'Horários atualizados!' })
      setFormLoading(false)
      return
    }

    const response = await fetch('/api/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) toast({ title: 'Erro ao salvar', description: result?.error ?? 'Tente novamente.', variant: 'destructive' })
    else {
      setRules((current) => current.map((rule) => rule.id === selectedRule.id ? result.rule : rule))
      toast({ title: 'Horários atualizados!' })
    }
    setFormLoading(false)
  }

  if (loading) return <PageLoading />

  const existingDays = rules.map((r) => r.day_of_week)

  return (
    <>
      <Header barber={barber} title="Horários de atendimento" />
      <div className="flex-1 space-y-4 px-4 pb-5">
        <div className="grid grid-cols-7 gap-1.5">
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((label, day) => (
            <button key={label} type="button" onClick={() => setSelectedDay(day)} className={`aspect-square rounded-full text-[9px] font-medium transition ${selectedDay === day ? 'bg-[#F5C400] text-black' : 'border border-white/10 bg-[#15181B] text-[#858A93]'}`}>{label}</button>
          ))}
        </div>

        <p className="text-sm font-semibold text-[#F5C400]">{['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedDay]}</p>

        {selectedRule ? (
          <section className="dashboard-card space-y-4 p-4">
            <TimeField label="Abertura" value={draft.start} onChange={(value) => setDraft((current) => ({ ...current, start: value }))} />
            <TimeField label="Fechamento" value={draft.end} onChange={(value) => setDraft((current) => ({ ...current, end: value }))} />
            <div>
              <p className="mb-2 text-[11px] text-[#858A93]">Intervalo para almoço</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={draft.lunchStart} onChange={(event) => setDraft((current) => ({ ...current, lunchStart: event.target.value }))} className="dashboard-field" />
                <Input type="time" value={draft.lunchEnd} onChange={(event) => setDraft((current) => ({ ...current, lunchEnd: event.target.value }))} className="dashboard-field" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] text-[#858A93]">Intervalo entre horários</label>
              <select value={draft.interval} onChange={(event) => setDraft((current) => ({ ...current, interval: Number(event.target.value) }))} className="dashboard-field w-full px-3">
                {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.07] pt-3">
              <span className="text-xs text-[#A2A6AD]">Dia disponível</span>
              <button type="button" role="switch" aria-checked={draft.active} onClick={() => setDraft((current) => ({ ...current, active: !current.active }))} className={`relative h-6 w-10 rounded-full ${draft.active ? 'bg-[#F5C400]' : 'bg-[#3D4147]'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${draft.active ? 'left-[18px]' : 'left-0.5'}`} /></button>
            </div>
          </section>
        ) : (
          <button type="button" onClick={() => setAvailFormOpen(true)} className="dashboard-card grid w-full place-items-center gap-2 p-7 text-xs text-[#858A93]"><Plus className="h-6 w-6 text-[#F5C400]" /> Configurar este dia</button>
        )}

        <Button className="gold-action w-full" onClick={handleSaveSelectedRule} disabled={formLoading}>{formLoading ? 'Salvando...' : selectedRule ? 'Salvar horários' : 'Adicionar dia'}</Button>

        <section className="pt-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-medium text-white"><Ban className="h-4 w-4 text-[#F5C400]" /> Horários bloqueados</h2>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[10px] text-[#F5C400]" onClick={() => setBlockFormOpen(true)}><Plus className="h-3.5 w-3.5" /> Bloquear</Button>
          </div>
          {blockedTimes.length === 0 ? <p className="dashboard-card px-3 py-4 text-center text-[11px] text-[#737881]">Nenhum horário bloqueado</p> : blockedTimes.map((bt) => (
            <div key={bt.id} className="dashboard-card mb-2 flex items-center justify-between px-3 py-2.5 text-xs">
              <span><strong>{formatDateShort(bt.blocked_date)}</strong>{bt.blocked_time ? ` às ${formatTime(bt.blocked_time)}` : ' — dia inteiro'}</span>
              <button onClick={() => setDeleteBlockId(bt.id)} className="text-[#F87171]"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </section>
      </div>

      <AvailabilityForm
        open={availFormOpen}
        onOpenChange={setAvailFormOpen}
        onSubmit={handleAddRule}
        loading={formLoading}
        existingDays={existingDays}
      />

      <BlockTimeForm
        open={blockFormOpen}
        onOpenChange={setBlockFormOpen}
        onSubmit={handleAddBlock}
        loading={formLoading}
      />

      <ConfirmDialog
        open={!!deleteRuleId}
        onOpenChange={(o) => !o && setDeleteRuleId(null)}
        title="Remover dia"
        description="Deseja remover este dia de atendimento?"
        confirmLabel="Remover"
        onConfirm={handleDeleteRule}
      />

      <ConfirmDialog
        open={!!deleteBlockId}
        onOpenChange={(o) => !o && setDeleteBlockId(null)}
        title="Remover bloqueio"
        description="Deseja remover este bloqueio?"
        confirmLabel="Remover"
        onConfirm={handleDeleteBlock}
      />
    </>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] text-[#858A93]">{label}</label>
      <div className="relative"><Input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="dashboard-field pr-10" /><Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858A93]" /></div>
    </div>
  )
}
