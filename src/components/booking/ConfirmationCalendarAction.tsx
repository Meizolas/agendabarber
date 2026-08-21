'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { androidCalendarInsertIntent, detectClientDevice, type AndroidCalendarEvent, type ClientDevice } from '@/lib/utils/device'

export function ConfirmationCalendarAction({ appleHref, googleHref, androidEvent }: { appleHref: string; googleHref: string; androidEvent: AndroidCalendarEvent }) {
  const [device, setDevice] = useState<ClientDevice>('unknown')
  useEffect(() => setDevice(detectClientDevice()), [])
  const isIos = device === 'ios'
  const isAndroid = device === 'android'
  const href = isIos ? appleHref : isAndroid ? androidCalendarInsertIntent(androidEvent, appleHref) : googleHref
  const label = isIos ? 'Adicionar ao Calendário Apple' : isAndroid ? 'Adicionar ao calendário' : 'Adicionar ao Google Agenda'
  return <div className="mt-5"><a href={href} target={isIos || isAndroid ? '_self' : '_blank'} rel={isIos || isAndroid ? undefined : 'noreferrer'} className="gold-action flex w-full items-center justify-center gap-2 text-sm"><CalendarDays className="h-5 w-5" /> {label}</a>{isAndroid && <p className="mt-2 text-center text-[10px] text-[#858A93]">O evento abrirá preenchido no aplicativo. Basta tocar em Salvar.</p>}</div>
}
