'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, MousePointer2, RotateCw, X } from 'lucide-react'

type TourStep = { route: string; selector: string; title: string; description: string }
type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number }
type Phase = 'navigating' | 'waiting' | 'ready' | 'missing'

const steps: TourStep[] = [
  { route: '/dashboard', selector: '[data-tour="share-link"]', title: 'Seu link de agendamento', description: 'Compartilhe este link. O cliente escolhe serviço, profissional, data e horário sem precisar criar uma conta.' },
  { route: '/dashboard', selector: '[data-tour="next-appointment"]', title: 'Próximo atendimento', description: 'Veja rapidamente quem será atendido, qual serviço foi escolhido e a situação do pagamento.' },
  { route: '/dashboard', selector: '[data-tour="dashboard-insights"]', title: 'Visão geral e financeiro', description: 'Alterne entre o resumo da agenda, receitas reais e suas metas mensais.' },
  { route: '/servicos', selector: '[data-tour="services-actions"]', title: 'Cadastre seus serviços', description: 'Crie corte, barba e outros serviços, definindo preço, duração e imagem.' },
  { route: '/servicos', selector: '[data-tour="services-list"]', title: 'Gerencie seus serviços', description: 'Edite, exclua ou desative serviços. Os desativados deixam de aparecer no link público.' },
  { route: '/agendamentos', selector: '[data-tour="agenda-controls"]', title: 'Sua agenda', description: 'Consulte por dia ou semana e registre manualmente clientes que marcaram por fora.' },
  { route: '/agendamentos', selector: '[data-tour="agenda-list"]', title: 'Atendimentos e pagamentos', description: 'Conclua ou cancele atendimentos e confirme os pagamentos pendentes.' },
  { route: '/horarios', selector: '[data-tour="hours-main"]', title: 'Horários de atendimento', description: 'Defina os dias, abertura, fechamento, almoço e intervalo oferecido aos clientes.' },
  { route: '/horarios', selector: '[data-tour="blocked-times"]', title: 'Bloqueios de agenda', description: 'Bloqueie um horário ou um dia inteiro para folgas, compromissos e imprevistos.' },
  { route: '/equipe', selector: '[data-tour="team-main"]', title: 'Equipe da barbearia', description: 'Adicione profissionais para que o cliente possa escolher com quem deseja agendar.' },
  { route: '/assinatura?gerenciar=1', selector: '[data-tour="plans-main"]', title: 'Planos, teste e cupons', description: 'Acompanhe a assinatura, altere o plano e aplique cupons promocionais.' },
  { route: '/perfil', selector: '[data-tour="profile-main"]', title: 'Perfil da barbearia', description: 'Atualize dados, chave Pix, identidade e o endereço do seu link público.' },
  { route: '/perfil', selector: '[data-tour="support-link"]', title: 'Ajuda sempre disponível', description: 'Fale com o suporte sempre que precisar. A interrogação no topo reinicia este tour.' },
  { route: '/perfil', selector: '[data-tour="bottom-navigation"]', title: 'Navegação principal', description: 'A barra inferior leva rapidamente ao Início, Serviços, Agenda, Horários e Perfil.' },
]

const pathOf = (route: string) => route.split('?')[0]
const getRect = (element: HTMLElement): Rect => {
  const bounds = element.getBoundingClientRect(); const pad = 7
  const top = Math.max(5, bounds.top - pad); const left = Math.max(5, bounds.left - pad)
  const right = Math.min(window.innerWidth - 5, bounds.right + pad); const bottom = Math.min(window.innerHeight - 5, bounds.bottom + pad)
  return { top, left, right, bottom, width: right - left, height: bottom - top }
}

export function ProductTour() {
  const router = useRouter(); const pathname = usePathname()
  const [active, setActive] = useState(false); const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('waiting'); const [rect, setRect] = useState<Rect | null>(null)
  const targetRef = useRef<HTMLElement | null>(null); const step = steps[index]
  const start = useCallback(() => { setIndex(0); setRect(null); setPhase('waiting'); setActive(true) }, [])
  const finish = useCallback(() => { setActive(false); setRect(null); targetRef.current = null }, [])

  useEffect(() => { window.addEventListener('agendbarber:start-tour', start); return () => window.removeEventListener('agendbarber:start-tour', start) }, [start])

  const locate = useCallback(() => {
    const element = document.querySelector<HTMLElement>(step.selector)
    if (!element || element.offsetParent === null) return false
    targetRef.current = element
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    window.setTimeout(() => { if (targetRef.current === element) { setRect(getRect(element)); setPhase('ready') } }, 420)
    return true
  }, [step.selector])

  useLayoutEffect(() => {
    if (!active) return
    setRect(null); targetRef.current = null
    if (pathname !== pathOf(step.route)) { setPhase('navigating'); router.push(step.route); return }
    setPhase('waiting')
    let settled = false; let timeout = 0
    const tryLocate = () => { if (!settled && locate()) { settled = true; observer.disconnect(); window.clearTimeout(timeout) } }
    const observer = new MutationObserver(tryLocate)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-tour'] })
    tryLocate()
    timeout = window.setTimeout(() => { if (!settled) { observer.disconnect(); setPhase('missing') } }, 15000)
    return () => { settled = true; observer.disconnect(); window.clearTimeout(timeout) }
  }, [active, index, locate, pathname, router, step.route])

  useEffect(() => {
    if (!active || phase !== 'ready') return
    let frame = 0
    const update = () => { if (targetRef.current?.isConnected) setRect(getRect(targetRef.current)) }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true)
    const observer = new ResizeObserver(schedule); if (targetRef.current) observer.observe(targetRef.current)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true) }
  }, [active, phase])

  const balloonStyle = useMemo(() => {
    if (!rect) return undefined
    const roomBelow = window.innerHeight - rect.bottom
    return roomBelow >= 260 ? { top: Math.min(rect.bottom + 18, window.innerHeight - 250) } : { bottom: Math.max(92, window.innerHeight - rect.top + 18) }
  }, [rect])

  if (!active) return null
  const ready = phase === 'ready' && rect; const last = index === steps.length - 1
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Tour pelo AgendBarber">
      {ready ? <>
        <div className="fixed inset-x-0 top-0 bg-black/80 backdrop-blur-[2px]" style={{ height: rect.top }} />
        <div className="fixed left-0 bg-black/80 backdrop-blur-[2px]" style={{ top: rect.top, width: rect.left, height: rect.height }} />
        <div className="fixed right-0 bg-black/80 backdrop-blur-[2px]" style={{ top: rect.top, left: rect.right, height: rect.height }} />
        <div className="fixed inset-x-0 bottom-0 bg-black/80 backdrop-blur-[2px]" style={{ top: rect.bottom }} />
        <div className="pointer-events-none fixed rounded-xl border-2 border-[#F5C400] bg-[#F5C400]/[0.025] shadow-[0_0_0_5px_rgba(245,196,0,.14),0_0_30px_rgba(245,196,0,.52)] animate-pulse" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
        <MousePointer2 className="pointer-events-none fixed z-[91] h-5 w-5 animate-bounce fill-[#F5C400] text-black drop-shadow-[0_2px_6px_rgba(245,196,0,.8)]" style={{ top: Math.max(8, rect.top - 8), left: Math.max(8, rect.left - 7) }} />
      </> : <div className="fixed inset-0 bg-black/82 backdrop-blur-[3px]" />}

      <section className="fixed left-1/2 z-[92] w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 rounded-[20px] border border-[#F5C400]/45 bg-[radial-gradient(circle_at_top_right,rgba(245,196,0,.12),transparent_38%),#111315] p-4 shadow-[0_25px_80px_rgba(0,0,0,.72),0_0_22px_rgba(245,196,0,.12)]" style={balloonStyle ?? { top: '50%', transform: 'translate(-50%,-50%)' }}>
        {ready && <span className="absolute left-8 -top-2 h-4 w-4 rotate-45 border-l border-t border-[#F5C400]/45 bg-[#121416]" />}
        <button type="button" onClick={finish} aria-label="Fechar tour" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-[#858A93]"><X className="h-4 w-4" /></button>
        <div className="pr-8"><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#F5C400]">Passo {index + 1} de {steps.length}</p><h2 className="mt-1.5 text-[17px] font-semibold text-white"><span className="decoration-[#F5C400] decoration-2 underline underline-offset-[6px]">{step.title}</span></h2><p className="mt-3 text-xs leading-[1.55] text-[#B5BAC2]">{step.description}</p></div>
        {phase !== 'ready' && <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-[10px] text-[#A2A6AD]">{phase === 'missing' ? <><RotateCw className="h-4 w-4 text-[#F5C400]" /> Esta parte demorou para carregar. Tente localizar novamente.</> : <><Loader2 className="h-4 w-4 animate-spin text-[#F5C400]" /> {phase === 'navigating' ? 'Abrindo a próxima tela…' : 'Aguardando o conteúdo carregar…'}</>}</div>}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#F5C400] transition-all duration-500" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
        <div className="mt-4 flex items-center justify-between"><button type="button" onClick={() => index === 0 ? finish() : setIndex((value) => value - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-[#A2A6AD]"><ArrowLeft className="h-4 w-4" /> {index === 0 ? 'Pular' : 'Voltar'}</button>{phase === 'missing' ? <button type="button" onClick={() => { setPhase('waiting'); if (!locate()) setPhase('missing') }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#F5C400] px-4 text-[11px] font-bold text-black"><RotateCw className="h-4 w-4" /> Tentar novamente</button> : <button type="button" disabled={phase !== 'ready'} onClick={() => last ? finish() : setIndex((value) => value + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#F5C400] px-4 text-[11px] font-bold text-black disabled:cursor-wait disabled:opacity-45">{last ? <><Check className="h-4 w-4" /> Concluir</> : <>Próximo <ArrowRight className="h-4 w-4" /></>}</button>}</div>
      </section>
    </div>
  )
}
