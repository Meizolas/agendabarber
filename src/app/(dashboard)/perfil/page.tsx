'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Copy, Link2, Loader2, LogOut, Phone, Share2, Store, UserRound } from 'lucide-react'
import { Header } from '@/components/dashboard/Header'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { profileSchema, type ProfileInput } from '@/lib/validations/profile'
import { useAuth } from '@/hooks/useAuth'
import type { Barber } from '@/types'

export default function PerfilPage() {
  const [barber, setBarber] = useState<Barber | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [browserOrigin, setBrowserOrigin] = useState('')
  const { toast } = useToast()
  const { signOut } = useAuth()
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })
  const slugValue = watch('slug', '')

  useEffect(() => {
    setBrowserOrigin(window.location.origin)
    const load = async () => {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const result = await response.json()
        setBarber(result.barber)
        if (result.barber) {
          setLogoUrl(result.barber.logo_url)
          reset({
            barbershop_name: result.barber.barbershop_name,
            barber_name: result.barber.barber_name,
            whatsapp: result.barber.whatsapp,
            slug: result.barber.slug,
            logo_url: result.barber.logo_url,
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [reset])

  const onSubmit = async (data: ProfileInput) => {
    setSaving(true)
    const response = await fetch('/api/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, slug: data.slug.toLowerCase(), logo_url: logoUrl }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) toast({ title: 'Erro ao salvar', description: result?.error ?? 'Não foi possível salvar seu perfil.', variant: 'destructive' })
    else {
      setBarber(result.barber)
      toast({ title: 'Perfil atualizado!' })
    }
    setSaving(false)
  }

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/service-images', { method: 'POST', body: formData })
    const result = await response.json().catch(() => null)
    if (!response.ok) toast({ title: 'Erro ao enviar logo', description: result?.error ?? 'Tente outra imagem.', variant: 'destructive' })
    else {
      setLogoUrl(result.publicUrl)
      toast({ title: 'Logo enviada', description: 'Salve as alterações para concluir.' })
    }
    setUploadingLogo(false)
  }

  const publicSlug = slugValue || barber?.slug || ''
  const publicLink = `${configuredAppUrl || browserOrigin}/agendar/${publicSlug}`
  const copyLink = async () => { await navigator.clipboard.writeText(publicLink); toast({ title: 'Link copiado!' }) }
  const shareLink = async () => {
    try {
      if (navigator.share) await navigator.share({ title: barber?.barbershop_name ?? 'Agendamento', url: publicLink })
      else await copyLink()
    } catch {
      // O usuário pode cancelar o compartilhamento nativo sem que isso seja um erro.
    }
  }

  if (loading) return <PageLoading />

  return (
    <>
      <Header barber={barber} title="Perfil" />
      <div className="flex-1 px-4 pb-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="mb-5 flex justify-center">
            <div className="relative h-28 w-28 rounded-full border-2 border-white/85 bg-[#111315] p-1">
              {logoUrl ? <img src={logoUrl} alt="Logo da barbearia" className="h-full w-full rounded-full object-cover" /> : <div className="grid h-full w-full place-items-center rounded-full text-2xl font-semibold text-[#F5C400]">AB</div>}
              <label className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-[#080A0C] bg-white text-black hover:bg-[#F5C400]">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
              </label>
            </div>
          </div>

          <ProfileField label="Seu nome" icon={UserRound} error={errors.barber_name?.message}><Input className="dashboard-field pl-10" {...register('barber_name')} /></ProfileField>
          <ProfileField label="Nome da barbearia" icon={Store} error={errors.barbershop_name?.message}><Input className="dashboard-field pl-10" {...register('barbershop_name')} /></ProfileField>
          <ProfileField label="WhatsApp" icon={Phone} error={errors.whatsapp?.message}><Input className="dashboard-field pl-10" {...register('whatsapp')} /></ProfileField>
          <ProfileField label="Link público" icon={Link2} error={errors.slug?.message}><Input className="dashboard-field pl-10" {...register('slug')} /></ProfileField>

          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#101214] p-2">
            <span className="min-w-0 flex-1 truncate px-1 text-[10px] text-[#858A93]">/agendar/<span className="text-[#D7DADE]">{publicSlug}</span></span>
            <button type="button" onClick={copyLink} aria-label="Copiar link" className="grid h-8 w-8 place-items-center rounded border border-white/10 text-[#A2A6AD]"><Copy className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={shareLink} aria-label="Compartilhar link" className="grid h-8 w-8 place-items-center rounded border border-white/10 text-[#A2A6AD]"><Share2 className="h-3.5 w-3.5" /></button>
          </div>

          <Button type="submit" className="gold-action w-full" disabled={saving || uploadingLogo}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}</Button>
          <button type="button" onClick={signOut} className="mx-auto flex items-center gap-2 pt-1 text-xs text-[#EF4444]"><LogOut className="h-4 w-4" /> Sair da conta</button>
        </form>
      </div>
    </>
  )
}

function ProfileField({ label, icon: Icon, error, children }: { label: string; icon: React.ComponentType<{ className?: string }>; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-[10px] text-[#858A93]">{label}</label><div className="relative"><Icon className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#A2A6AD]" />{children}</div>{error && <p className="mt-1 text-[10px] text-[#F87171]">{error}</p>}</div>
}
