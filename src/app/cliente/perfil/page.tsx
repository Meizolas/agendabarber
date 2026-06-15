'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  Headphones,
  LogOut,
  MapPin,
  Save,
  Settings,
  UserRound,
} from 'lucide-react'
import { BottomNav } from '@/components/premium/BottomNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useClientProfile } from '@/hooks/useClientProfile'
import { createClient } from '@/lib/supabase/client'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'

export default function ClientProfilePage() {
  const { profile, updateProfile } = useClientProfile()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone)
  const [address, setAddress] = useState(profile.address)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const saveProfile = () => {
    updateProfile({ name, phone, address })
    setEditing(false)
    toast({ title: 'Perfil atualizado!' })
  }

  const changePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Use uma imagem de ate 2MB.', variant: 'destructive' })
      return
    }

    updateProfile({ photo: URL.createObjectURL(file) })
    toast({ title: 'Foto atualizada!' })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    await fetch('/api/demo-logout', { method: 'POST' }).catch(() => null)
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    router.replace('/login')
    router.refresh()
  }

  const action = (label: string) => {
    toast({ title: label, description: 'Opcao atualizada no perfil.' })
  }

  return (
    <main className="premium-screen pb-28">
      <div className="mx-auto max-w-xl px-4 pt-4 sm:px-5">
        <header className="flex items-center gap-3">
          <Link href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#101214]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-[#9CA3AF]">Conta do cliente</p>
            <h1 className="truncate text-[24px] font-semibold text-white">Perfil</h1>
          </div>
        </header>

        <section className="premium-card mt-6 p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] ring-1 ring-white/10"
              aria-label="Alterar foto de perfil"
            >
              <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 grid h-7 place-items-center bg-black/60 text-white">
                <Camera className="h-4 w-4" />
              </span>
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={changePhoto} />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[20px] font-semibold text-white">{profile.name}</h2>
              <p className="truncate text-sm text-[#9CA3AF]">{profile.email}</p>
              <button onClick={() => setEditing((value) => !value)} className="mt-2 text-sm font-semibold text-[#F4B400]">
                {editing ? 'Cancelar edicao' : 'Editar dados'}
              </button>
            </div>
          </div>

          {editing && (
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
              <Field label="Nome">
                <Input value={name} onChange={(event) => setName(event.target.value)} className="premium-input" />
              </Field>
              <Field label="Telefone">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="premium-input" />
              </Field>
              <Field label="Endereco">
                <Input value={address} onChange={(event) => setAddress(event.target.value)} className="premium-input" />
              </Field>
              <Button onClick={saveProfile} className="premium-button w-full">
                <Save className="h-4 w-4" />
                Salvar perfil
              </Button>
            </div>
          )}
        </section>

        <section className="premium-card mt-5 divide-y divide-white/10 overflow-hidden">
          <ActionButton label="Dados pessoais" icon={UserRound} onClick={() => setEditing(true)} />
          <ActionButton label="Enderecos" icon={MapPin} value={profile.address} onClick={() => setEditing(true)} />
          <ActionButton label="Formas de pagamento" icon={CreditCard} onClick={() => action('Formas de pagamento')} />
          <button
            className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
            onClick={() => {
              updateProfile({ notifications: !profile.notifications })
              toast({ title: profile.notifications ? 'Notificacoes desativadas' : 'Notificacoes ativadas' })
            }}
          >
            <Bell className="h-5 w-5 text-[#F4B400]" />
            <span className="flex-1 text-sm font-medium text-white">Notificacoes</span>
            <span className={`grid h-6 w-11 place-items-center rounded-full p-0.5 transition ${profile.notifications ? 'bg-[#F4B400]' : 'bg-white/10'}`}>
              <span className={`h-5 w-5 rounded-full bg-white transition ${profile.notifications ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
            </span>
          </button>
          <ActionButton label="Configuracoes" icon={Settings} onClick={() => action('Configuracoes')} />
          <ActionButton label="Ajuda e suporte" icon={Headphones} onClick={() => action('Ajuda e suporte')} />
        </section>

        <button onClick={signOut} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 py-3 text-sm font-semibold text-[#EF4444]">
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
      <BottomNav />
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-[#D1D5DB]">{label}</Label>
      {children}
    </div>
  )
}

function ActionButton({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string
  value?: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
      <Icon className="h-5 w-5 text-[#F4B400]" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        {value && <span className="block truncate text-xs text-[#9CA3AF]">{value}</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-[#6B7280]" />
    </button>
  )
}
