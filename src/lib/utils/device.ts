export type ClientDevice = 'ios' | 'android' | 'desktop' | 'unknown'

export function detectClientDevice(): ClientDevice {
  if (typeof navigator === 'undefined') return 'unknown'

  const userAgent = navigator.userAgent || ''
  const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIPad || /iPhone|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  if (/Windows|Macintosh|Linux|X11/i.test(userAgent)) return 'desktop'
  return 'unknown'
}

export interface AndroidCalendarEvent {
  title: string
  description: string
  startMillis: number
  endMillis: number
}

export function androidCalendarInsertIntent(event: AndroidCalendarEvent, fallbackUrl: string) {
  return `intent://com.android.calendar/events#Intent;scheme=content;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/event;package=com.google.android.calendar;S.title=${encodeURIComponent(event.title)};S.description=${encodeURIComponent(event.description)};l.beginTime=${event.startMillis};l.endTime=${event.endMillis};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
}
