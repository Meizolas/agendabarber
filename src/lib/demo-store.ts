import { Service } from '@/types'
import { demoServices } from '@/lib/demo-data'

const DEMO_SERVICES_KEY = 'agendbarber_demo_services'

export function getStoredDemoServices(): Service[] {
  if (typeof window === 'undefined') return demoServices

  try {
    const stored = window.localStorage.getItem(DEMO_SERVICES_KEY)
    if (!stored) return demoServices
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : demoServices
  } catch {
    return demoServices
  }
}

export function saveStoredDemoServices(services: Service[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_SERVICES_KEY, JSON.stringify(services))
}

export function resetStoredDemoServices() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DEMO_SERVICES_KEY)
}
