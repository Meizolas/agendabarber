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
