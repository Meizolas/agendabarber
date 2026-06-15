'use client'

import { useEffect, useState } from 'react'
import { barberPhotos } from '@/lib/premium-data'

export interface ClientProfile {
  name: string
  email: string
  phone: string
  address: string
  photo: string
  notifications: boolean
}

const STORAGE_KEY = 'agendbarber_client_profile'

const defaultProfile: ClientProfile = {
  name: 'Cliente',
  email: 'cliente@gmail.com',
  phone: '(11) 99999-9999',
  address: 'Adicionar endereco',
  photo: barberPhotos.barber,
  notifications: true,
}

export function useClientProfile() {
  const [profile, setProfile] = useState<ClientProfile>(defaultProfile)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setProfile({ ...defaultProfile, ...JSON.parse(stored) })
    }
    setReady(true)
  }, [])

  const updateProfile = (next: Partial<ClientProfile>) => {
    setProfile((current) => {
      const updated = { ...current, ...next }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  return { profile, updateProfile, ready }
}
