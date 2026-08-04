'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Loader2, Plus, Scissors, Trash2, UsersRound, X } from 'lucide-react'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import type { Barber, StaffMember } from '@/types'

export default function EquipePage() {
  const [barber, setBarber] = useState<Barber | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [limit, setLimit] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const { toast } = useToast()

  const load = useCallback(async () => {
    const [profileResponse, staffResponse] = await Promise.all([fetch('/api/profile'), fetch('/api/staff')])
    const profile = await profileResponse.json().catch(() => ({}))
    const result = await staffResponse.json().catch(() => ({}))
    if (!staffResponse.ok) toast({ title: 'Equipe indisponível', description: result.error, variant: 'destructive' })
    setBarber(profile.barber ?? null)
    setStaff(result.staff ?? [])
    setLimit(result.plan?.staff_limit ?? 1)
    setLoading(false)
  }, [toast])

  useEffect(() => { void load() }, [load])

  const addMember = async () => {
    setSaving(true)
    const response = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, whatsapp }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) toast({ title: 'Não foi possível adicionar', description: result.error, variant: 'destructive' })
    else {
      setStaff((current) => [...current, result.staffMember])
      setName(''); setWhatsapp(''); setShowForm(false)
      toast({ title: 'Profissional adicionado' })
    }
    setSaving(false)
  }

  const deactivate = async (member: StaffMember) => {
    const response = await fetch(`/api/staff?id=${member.id}`, { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) toast({ title: 'Não foi possível remover', description: result.error, variant: 'destructive' })
    else setStaff((current) => current.map((item) => item.id === member.id ? { ...item, is_active: false } : item))
  }

  if (loading) return <PageLoading />
  const active = staff.filter((member) => member.is_active)

  return (
    <>
      <Header barber={barber} title="Equipe" />
      <div className="flex-1 space-y-4 px-4 pb-5">
        <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(245,196,0,.15),transparent_45%),#111315] p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] uppercase tracking-[.18em] text-[#F5C400]">Sua barbearia</p><h1 className="mt-1 text-lg font-semibold">Profissionais</h1></div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#F5C400] text-black"><UsersRound className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#F5C400] transition-all" style={{ width: `${Math.min(100, (active.length / limit) * 100)}%` }} /></div>
          <div className="mt-2 flex justify-between text-[10px]"><span className="text-[#A2A6AD]">{active.length} de {limit} vagas utilizadas</span><a href="/assinatura" className="font-medium text-[#F5C400]">Alterar plano</a></div>
        </section>

        <div className="space-y-2">
          {active.map((member) => (
            <article key={member.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111315] p-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#F5C400]/30 bg-[#1A1D20] text-sm font-semibold text-[#F5C400]">
                {member.photo_url ? <img src={member.photo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{member.name}</p><p className="mt-0.5 text-[10px] text-[#858A93]">{member.is_owner ? 'Responsável pela conta' : member.whatsapp || 'Profissional da equipe'}</p></div>
              {member.is_owner ? <Crown className="h-4 w-4 text-[#F5C400]" /> : <button onClick={() => void deactivate(member)} aria-label={`Remover ${member.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-[#EF4444]/20 text-[#F87171]"><Trash2 className="h-4 w-4" /></button>}
            </article>
          ))}
        </div>

        {showForm ? (
          <section className="rounded-xl border border-[#F5C400]/35 bg-[#111315] p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Novo profissional</h2><button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-[#858A93]" /></button></div>
            <div className="space-y-3"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do barbeiro" className="dashboard-field" /><Input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="WhatsApp (opcional)" className="dashboard-field" /><Button onClick={() => void addMember()} disabled={saving || name.trim().length < 2} className="gold-action w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" />Adicionar à equipe</>}</Button></div>
          </section>
        ) : (
          <Button onClick={() => setShowForm(true)} disabled={active.length >= limit} className="gold-action w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar barbeiro</Button>
        )}

        {active.length >= limit && <div className="rounded-xl border border-[#F5C400]/20 bg-[#F5C400]/[0.06] p-3 text-center text-[10px] text-[#D7DADE]"><Scissors className="mx-auto mb-1.5 h-4 w-4 text-[#F5C400]" />Você atingiu o limite deste plano. Faça upgrade para adicionar mais profissionais.</div>}
      </div>
    </>
  )
}
