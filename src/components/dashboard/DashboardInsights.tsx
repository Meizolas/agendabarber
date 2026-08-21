'use client'

import { useState } from 'react'
import { BarChart3, CalendarDays, CircleDollarSign, Goal, Loader2, Save, Target, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinancialSummary } from '@/lib/finance/summary'
import { formatPrice } from '@/lib/utils/format'
import { useToast } from '@/components/ui/use-toast'

type Tab = 'overview' | 'finance' | 'goals'

interface DashboardInsightsProps {
  summary: FinancialSummary
  goalAmount: number | null
  counts: {
    today: number
    nextSevenDays: number
    completedToday: number
    month: number
  }
  todayAppointmentTimes: string[]
  financialDataAvailable: boolean
}

const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Visão geral', icon: BarChart3 },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign },
  { id: 'goals', label: 'Metas', icon: Target },
]

export function DashboardInsights({
  summary,
  goalAmount: initialGoalAmount,
  counts,
  todayAppointmentTimes,
  financialDataAvailable,
}: DashboardInsightsProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [goalAmount, setGoalAmount] = useState<number | null>(initialGoalAmount)
  const [goalInput, setGoalInput] = useState(initialGoalAmount ? formatInputValue(initialGoalAmount) : '')
  const [savingGoal, setSavingGoal] = useState(false)
  const { toast } = useToast()

  const saveGoal = async () => {
    const value = parseCurrencyInput(goalInput)
    if (!value || value <= 0) {
      toast({ title: 'Meta inválida', description: 'Informe um valor maior que zero.', variant: 'destructive' })
      return
    }
    setSavingGoal(true)
    const response = await fetch('/api/financial-goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_amount: value }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      toast({ title: 'Não foi possível salvar', description: payload?.error ?? 'Tente novamente.', variant: 'destructive' })
    } else {
      const savedAmount = Number(payload.goal.target_amount)
      setGoalAmount(savedAmount)
      setGoalInput(formatInputValue(savedAmount))
      toast({ title: 'Meta mensal salva' })
    }
    setSavingGoal(false)
  }

  return (
    <>
      <nav className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-[#101214]" aria-label="Visualizações do dashboard">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`relative flex h-11 items-center justify-center gap-1.5 border-r border-white/[0.06] text-[10px] transition last:border-r-0 ${tab === id ? 'bg-[#F5C400]/[0.04] text-[#F5C400]' : 'text-[#858A93]'}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F5C400]" />}
          </button>
        ))}
      </nav>

      {!financialDataAvailable && tab !== 'overview' && (
        <div className="rounded-lg border border-[#F5C400]/20 bg-[#F5C400]/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-[#D6C680]">
          Não foi possível carregar os dados financeiros. Atualize a página; se persistir, verifique a conexão com o banco.
        </div>
      )}

      {tab === 'overview' && <Overview counts={counts} todayAppointmentTimes={todayAppointmentTimes} />}
      {tab === 'finance' && <Finance summary={summary} goalAmount={goalAmount} onOpenGoals={() => setTab('goals')} />}
      {tab === 'goals' && (
        <Goals
          revenue={summary.monthRevenue}
          goalAmount={goalAmount}
          goalInput={goalInput}
          saving={savingGoal}
          onGoalInput={setGoalInput}
          onSave={saveGoal}
        />
      )}
    </>
  )
}

function Overview({ counts, todayAppointmentTimes }: Pick<DashboardInsightsProps, 'counts' | 'todayAppointmentTimes'>) {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  const values = hours.map((hour) => todayAppointmentTimes.filter((time) => Number(time.slice(0, 2)) === hour).length)
  const max = Math.max(...values, 1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <MiniStat label="Hoje" value={counts.today} />
        <MiniStat label="Próximos 7 dias" value={counts.nextSevenDays} />
        <MiniStat label="Concluídos hoje" value={counts.completedToday} />
        <MiniStat label="No mês" value={counts.month} />
      </div>
      <section>
        <h2 className="mb-3 border-l-2 border-[#F5C400] pl-2 text-sm font-medium text-white">Agenda de hoje</h2>
        <div className="dashboard-card px-3 pb-3 pt-4">
          {todayAppointmentTimes.length === 0 ? (
            <div className="grid min-h-28 place-items-center text-center">
              <div><CalendarDays className="mx-auto mb-2 h-6 w-6 text-[#F5C400]/70" /><p className="text-[11px] text-[#737881]">Nenhum atendimento agendado para hoje.</p></div>
            </div>
          ) : (
            <div className="flex h-28 items-end justify-between gap-2 border-b border-white/10">
              {values.map((value, index) => (
                <div key={hours[index]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className={`w-full max-w-5 rounded-t-sm ${value > 0 ? 'bg-[#F5C400]' : 'bg-[#34383E]'}`} style={{ height: `${Math.max(5, (value / max) * 82)}%` }} />
                  <span className="pb-1 text-[8px] text-[#737881]">{hours[index]}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Finance({ summary, goalAmount, onOpenGoals }: { summary: FinancialSummary; goalAmount: number | null; onOpenGoals: () => void }) {
  const [period, setPeriod] = useState<'today' | 'month'>('month')
  const comparison = summary.comparisonPercent
  const goal = getGoalProgress(summary.monthRevenue, goalAmount)
  const displayedRevenue = period === 'today' ? summary.todayRevenue : summary.monthRevenue

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-[#101214] p-1">
        <button type="button" onClick={() => setPeriod('today')} className={`rounded-md py-2 text-[10px] font-medium transition ${period === 'today' ? 'bg-[#F5C400] text-black' : 'text-[#858A93]'}`}>Hoje</button>
        <button type="button" onClick={() => setPeriod('month')} className={`rounded-md py-2 text-[10px] font-medium transition ${period === 'month' ? 'bg-[#F5C400] text-black' : 'text-[#858A93]'}`}>Este mês</button>
      </div>
      <section className="dashboard-card relative overflow-hidden p-4">
        <div className="absolute -right-5 -top-5 grid h-24 w-24 place-items-center rounded-full border border-white/[0.07] text-[#F5C400]"><TrendingUp className="h-9 w-9" /></div>
        <p className="text-xs text-[#A2A6AD]">{period === 'today' ? 'Receita de hoje' : 'Receita do mês'}</p>
        <p className="mt-1 text-[26px] font-semibold leading-tight text-white">{formatPrice(displayedRevenue)}</p>
        {period === 'today' ? (
          <p className="mt-2 text-[10px] text-[#737881]">Pagamentos confirmados hoje</p>
        ) : comparison === null ? (
          <p className="mt-2 text-[10px] text-[#737881]">Sem histórico suficiente no mês anterior</p>
        ) : comparison >= 0 ? (
          <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#52D982]"><TrendingUp className="h-3.5 w-3.5" /> +{comparison.toFixed(1)}% vs. mês anterior</p>
        ) : (
          <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#F87171]"><TrendingDown className="h-3.5 w-3.5" /> {comparison.toFixed(1)}% vs. mês anterior</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <MoneyCard label="Hoje" value={summary.todayRevenue} icon={CalendarDays} />
        <MoneyCard label="A receber" value={summary.receivable} icon={WalletCards} />
      </div>

      <RevenueChart data={summary.lastSevenDays} />

      <section className="dashboard-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[#A2A6AD]">Meta mensal</p>
            {goalAmount ? (
              <p className="mt-1 text-lg font-semibold text-white">{formatPrice(summary.monthRevenue)} <span className="text-[10px] font-normal text-[#858A93]">de {formatPrice(goalAmount)}</span></p>
            ) : (
              <p className="mt-1 text-sm font-medium text-white">Nenhuma meta definida</p>
            )}
          </div>
          <span className={`text-lg font-bold ${goal.reached ? 'text-[#52D982]' : 'text-[#F5C400]'}`}>{goal.percent}%</span>
        </div>
        <ProgressBar percent={goal.percent} reached={goal.reached} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-[#858A93]">{goalAmount ? (goal.reached ? 'Meta alcançada. Excelente trabalho!' : `Faltam ${formatPrice(goal.remaining)}`) : 'Crie uma meta para acompanhar seu progresso.'}</p>
          <button type="button" onClick={onOpenGoals} className="shrink-0 text-[10px] font-semibold text-[#F5C400]">{goalAmount ? 'Alterar' : 'Criar meta'}</button>
        </div>
      </section>

      {summary.monthRevenue === 0 && (
        <p className="px-2 text-center text-[10px] leading-relaxed text-[#737881]">Os valores serão atualizados quando os pagamentos forem confirmados.</p>
      )}
    </div>
  )
}

function RevenueChart({ data }: { data: FinancialSummary['lastSevenDays'] }) {
  const max = Math.max(...data.map((item) => item.amount), 1)
  const today = data.at(-1)?.date
  return (
    <section className="dashboard-card p-4">
      <h2 className="text-xs font-medium text-[#D7DADE]">Receita — últimos 7 dias</h2>
      <div className="mt-4 flex h-32 items-end justify-between gap-2 border-b border-white/10">
        {data.map((item) => {
          const active = item.date === today
          const height = item.amount > 0 ? Math.max(8, (item.amount / max) * 92) : 3
          return (
            <div key={item.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${formatPrice(item.amount)} em ${item.date}`}>
              <span className={`w-full max-w-5 rounded-t-sm transition ${active ? 'bg-[#F5C400]' : 'bg-[#5B6068]'}`} style={{ height: `${height}%` }} />
              <span className={`pb-1 text-[8px] capitalize ${active ? 'font-semibold text-[#F5C400]' : 'text-[#737881]'}`}>{format(parseISO(item.date), 'EEE', { locale: ptBR }).slice(0, 3)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Goals({ revenue, goalAmount, goalInput, saving, onGoalInput, onSave }: {
  revenue: number
  goalAmount: number | null
  goalInput: string
  saving: boolean
  onGoalInput: (value: string) => void
  onSave: () => void
}) {
  const progress = getGoalProgress(revenue, goalAmount)
  return (
    <div className="space-y-3">
      <section className={`dashboard-card overflow-hidden p-4 ${progress.reached ? 'border-[#22C55E]/35 shadow-[0_0_22px_rgba(34,197,94,0.08)]' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#A2A6AD]">Meta mensal</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatPrice(revenue)} <span className="text-[10px] font-normal text-[#858A93]">de {goalAmount ? formatPrice(goalAmount) : '—'}</span></p>
          </div>
          <span className={`grid h-12 w-12 place-items-center rounded-full border text-sm font-bold ${progress.reached ? 'border-[#22C55E]/50 bg-[#22C55E]/10 text-[#52D982]' : 'border-[#F5C400]/40 bg-[#F5C400]/[0.06] text-[#F5C400]'}`}>{progress.percent}%</span>
        </div>
        <ProgressBar percent={progress.percent} reached={progress.reached} />
        <p className={`mt-3 text-[11px] ${progress.reached ? 'text-[#52D982]' : 'text-[#858A93]'}`}>
          {goalAmount ? (progress.reached ? 'Meta alcançada! Continue crescendo.' : `Faltam ${formatPrice(progress.remaining)} para alcançar sua meta.`) : 'Defina abaixo quanto deseja faturar neste mês.'}
        </p>
      </section>

      <section className="dashboard-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5C400]/10 text-[#F5C400]"><Goal className="h-5 w-5" /></span>
          <div><h2 className="text-sm font-semibold text-white">{goalAmount ? 'Alterar meta' : 'Criar meta'}</h2><p className="text-[10px] text-[#737881]">A meta vale para o mês atual.</p></div>
        </div>
        <label className="block text-[10px] font-medium text-[#A2A6AD]">
          Valor da meta
          <div className="mt-1.5 flex h-12 items-center rounded-lg border border-white/10 bg-[#111315] px-3 focus-within:border-[#F5C400]/60">
            <span className="mr-2 text-sm font-semibold text-[#F5C400]">R$</span>
            <input value={goalInput} onChange={(event) => onGoalInput(maskCurrencyInput(event.target.value))} inputMode="decimal" placeholder="5.000,00" className="min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none placeholder:text-[#555A61]" />
          </div>
        </label>
        <button type="button" disabled={saving} onClick={onSave} className="gold-action mt-4 flex w-full items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar meta mensal'}
        </button>
      </section>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="dashboard-card px-3 py-3 text-center"><p className="text-[11px] text-[#858A93]">{label}</p><p className="mt-1 text-[25px] font-semibold leading-none text-white">{value}</p></div>
}

function MoneyCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarDays }) {
  return (
    <div className="dashboard-card flex items-center justify-between gap-2 p-3.5">
      <div><p className="text-[10px] text-[#858A93]">{label}</p><p className="mt-1 text-base font-medium text-white">{formatPrice(value)}</p></div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-[#F5C400]"><Icon className="h-5 w-5" /></span>
    </div>
  )
}

function ProgressBar({ percent, reached }: { percent: number; reached: boolean }) {
  return <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2A2E33]"><div className={`h-full rounded-full transition-all ${reached ? 'bg-[#22C55E]' : 'bg-[#F5C400]'}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
}

function getGoalProgress(revenue: number, target: number | null) {
  const percent = target && target > 0 ? Math.min(999, Math.round((revenue / target) * 100)) : 0
  return { percent, remaining: Math.max(0, (target ?? 0) - revenue), reached: Boolean(target && revenue >= target) }
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) / 100 : 0
}

function formatInputValue(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function maskCurrencyInput(value: string) {
  return formatInputValue(parseCurrencyInput(value))
}
