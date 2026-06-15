'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityRule, BlockedTime, DAY_NAMES } from '@/types'
import { AvailabilityForm } from '@/components/schedule/AvailabilityForm'
import { BlockTimeForm } from '@/components/schedule/BlockTimeForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Plus, Trash2, Clock, Ban } from 'lucide-react'
import { formatDateShort, formatTime } from '@/lib/utils/format'
import type { AvailabilityRuleInput, BlockTimeInput } from '@/lib/validations/availability'
import { demoBarber, demoRules } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'

export default function HorariosPage() {
  const [barber, setBarber] = useState<any>(null)
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [loading, setLoading] = useState(true)
  const [availFormOpen, setAvailFormOpen] = useState(false)
  const [blockFormOpen, setBlockFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
      setDemoMode(true)
      setBarber(demoBarber)
      setRules((current) => current.length ? current : demoRules)
      setBlockedTimes([])
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: barberData } = await supabase
      .from('barbers').select('*').eq('user_id', user.id).single()
    setBarber(barberData)

    if (barberData) {
      const [{ data: rulesData }, { data: blockedData }] = await Promise.all([
        supabase.from('availability_rules').select('*').eq('barber_id', barberData.id).order('day_of_week'),
        supabase.from('blocked_times').select('*').eq('barber_id', barberData.id).order('blocked_date'),
      ])
      setRules(rulesData ?? [])
      setBlockedTimes(blockedData ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

    const { error } = await supabase.from('availability_rules').insert({
      barber_id: barber.id,
      day_of_week: Number(data.day_of_week),
      start_time: data.start_time,
      end_time: data.end_time,
      interval_minutes: Number(data.interval_minutes),
    })
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
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

    const { error } = await supabase.from('blocked_times').insert({
      barber_id: barber.id,
      blocked_date: data.blocked_date,
      blocked_time: data.blocked_time || null,
      reason: data.reason || null,
    })
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
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

    const { error } = await supabase.from('availability_rules').delete().eq('id', deleteRuleId)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
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

    const { error } = await supabase.from('blocked_times').delete().eq('id', deleteBlockId)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Bloqueio removido!' })
      setDeleteBlockId(null)
      loadData()
    }
  }

  if (loading) return <PageLoading />

  const existingDays = rules.map((r) => r.day_of_week)

  return (
    <>
      <Header barber={barber} title="Horários" />
      <div className="flex-1 space-y-7 p-4 sm:space-y-8 sm:p-6">

        {/* Regras de disponibilidade */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Dias de atendimento</h2>
            <Button
              className="bg-amber-500 hover:bg-amber-600 gap-2"
              size="sm"
              onClick={() => setAvailFormOpen(true)}
              disabled={existingDays.length === 7}
            >
              <Plus className="h-4 w-4" />
              Adicionar dia
            </Button>
          </div>

          {rules.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center">
              <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">Nenhum dia configurado ainda</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((rule) => (
                  <div key={rule.id} className="rounded-lg border bg-white p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">
                        {DAY_NAMES[rule.day_of_week as keyof typeof DAY_NAMES]}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime(rule.start_time)} – {formatTime(rule.end_time)}
                        {' · '}a cada {rule.interval_minutes} min
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-500 h-8 w-8"
                      onClick={() => setDeleteRuleId(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Horários bloqueados */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Horários bloqueados</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setBlockFormOpen(true)}
            >
              <Ban className="h-4 w-4" />
              Bloquear horário
            </Button>
          </div>

          {blockedTimes.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center">
              <Ban className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">Nenhum horário bloqueado</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blockedTimes.map((bt) => (
                <div key={bt.id} className="rounded-lg border bg-white p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">
                      {formatDateShort(bt.blocked_date)}
                      {bt.blocked_time
                        ? ` às ${formatTime(bt.blocked_time)}`
                        : ' — dia inteiro'}
                    </p>
                    {bt.reason && <p className="text-sm text-slate-500">{bt.reason}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-500 h-8 w-8"
                    onClick={() => setDeleteBlockId(bt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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
