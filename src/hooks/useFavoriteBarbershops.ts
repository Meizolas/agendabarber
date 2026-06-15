'use client'

import { useEffect, useState } from 'react'
import { featuredBarbers } from '@/lib/premium-data'

export interface FavoriteBarbershop {
  slug: string
  name: string
  location: string
  rating: string
  reviews: string
  price: string
  photo: string
  distance: string
  open: boolean
}

const STORAGE_KEY = 'agendbarber_favorite_barbershops'

export const nearbyBarbershops: FavoriteBarbershop[] = featuredBarbers.map((barber, index) => ({
  ...barber,
  slug: index === 0 ? 'demo' : `barbearia-${index + 1}`,
  distance: index === 0 ? '1,2 km' : index === 1 ? '2,4 km' : '3,1 km',
  open: index !== 2,
}))

const defaultFavorites = nearbyBarbershops.slice(0, 2).map((barber) => barber.slug)

export function useFavoriteBarbershops() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(defaultFavorites)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setFavoriteSlugs(JSON.parse(stored))
    setReady(true)
  }, [])

  const persist = (next: string[]) => {
    setFavoriteSlugs(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const toggleFavorite = (slug: string) => {
    const next = favoriteSlugs.includes(slug)
      ? favoriteSlugs.filter((item) => item !== slug)
      : [...favoriteSlugs, slug]
    persist(next)
  }

  const favorites = nearbyBarbershops.filter((barber) => favoriteSlugs.includes(barber.slug))

  return {
    ready,
    favorites,
    favoriteSlugs,
    isFavorite: (slug: string) => favoriteSlugs.includes(slug),
    toggleFavorite,
  }
}
