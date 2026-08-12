'use client'

import { useEffect, useState } from 'react'
import { BellRing, Check, Download, Loader2, Smartphone, X } from 'lucide-react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Status = 'loading' | 'unsupported' | 'ready' | 'enabled' | 'denied'

function base64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

export function PwaNotificationPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)))
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setStatus(!supported ? 'unsupported' : Notification.permission === 'granted' ? 'enabled' : Notification.permission === 'denied' ? 'denied' : 'ready')
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    const installedHandler = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', installedHandler)
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', installedHandler) }
  }, [])

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setInstallPrompt(null)
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    window.alert(ios ? 'No Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.' : 'Abra o menu do navegador e escolha Instalar app ou Adicionar a tela inicial.')
  }

  const enableNotifications = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) { window.alert('As notificacoes ainda precisam ser configuradas no servidor.'); return }
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'ready'); return }
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) })
      const response = await fetch('/api/push/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) })
      if (!response.ok) throw new Error('Nao foi possivel salvar este dispositivo.')
      setStatus('enabled')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Nao foi possivel ativar as notificacoes.')
    } finally { setBusy(false) }
  }

  if (dismissed || (installed && status === 'enabled')) return null
  return (
    <section className="mx-4 mb-4 mt-4 rounded-2xl border border-[#F5C400]/30 bg-[radial-gradient(circle_at_top_right,rgba(245,196,0,.16),transparent_46%),#111315] p-4 shadow-[0_14px_35px_rgba(0,0,0,.26)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F5C400] text-black"><Smartphone className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-white">Tenha o AgendBarber no celular</h2><p className="mt-1 text-[10px] leading-relaxed text-[#A2A6AD]">Instale o app e ative os avisos para saber imediatamente quando um cliente agendar.</p></div>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Fechar" className="text-[#737881]"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {!installed && <button type="button" onClick={install} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#F5C400] text-[11px] font-semibold text-[#F5C400]"><Download className="h-4 w-4" /> Instalar aplicativo</button>}
        {status !== 'unsupported' && status !== 'enabled' && <button type="button" disabled={busy || status === 'denied'} onClick={enableNotifications} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F5C400] text-[11px] font-bold text-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} {status === 'denied' ? 'Permissao bloqueada' : 'Ativar notificacoes'}</button>}
        {status === 'enabled' && <div className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#22C55E]/12 text-[11px] font-semibold text-[#65D787]"><Check className="h-4 w-4" /> Notificacoes ativas</div>}
      </div>
      {status === 'denied' && <p className="mt-2 text-[9px] text-[#FCA5A5]">Libere as notificacoes nas configuracoes do navegador ou do celular.</p>}
    </section>
  )
}
