export const barberPhotos = {
  chair:
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=85',
  barber:
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85',
  cut:
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85',
  beard:
    'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=85',
  tools:
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=85',
}

export const featuredServices = [
  {
    slug: 'corte-barba',
    name: 'Corte + Barba',
    duration: '60 min',
    price: 'R$ 80,00',
    photo: barberPhotos.cut,
    description: 'Corte personalizado, barba modelada com toalha quente e finalização premium.',
  },
  {
    slug: 'degrade',
    name: 'Degradê',
    duration: '45 min',
    price: 'R$ 60,00',
    photo: barberPhotos.barber,
    description: 'Acabamento limpo, laterais precisas e styling para manter o visual no ponto.',
  },
  {
    slug: 'barba',
    name: 'Barba',
    duration: '30 min',
    price: 'R$ 40,00',
    photo: barberPhotos.beard,
    description: 'Desenho, hidratação e finalização para uma barba alinhada sem irritação.',
  },
  {
    slug: 'tratamento',
    name: 'Tratamento',
    duration: '45 min',
    price: 'R$ 90,00',
    photo: barberPhotos.tools,
    description: 'Cuidado capilar com produtos profissionais e diagnóstico rápido.',
  },
]

export const featuredBarbers = [
  {
    name: 'Fernando Almeida',
    location: 'Barber House - Moema',
    rating: '4.9',
    reviews: '129',
    price: 'a partir de R$ 60',
    photo: barberPhotos.barber,
  },
  {
    name: 'Rafael Souza',
    location: 'The Black Shop - Brooklyn',
    rating: '4.8',
    reviews: '96',
    price: 'a partir de R$ 50',
    photo: barberPhotos.cut,
  },
  {
    name: 'Bruno Martins',
    location: 'Old Naval - Vila Madalena',
    rating: '4.9',
    reviews: '74',
    price: 'a partir de R$ 55',
    photo: barberPhotos.beard,
  },
]

export const categories = [
  { name: 'Corte', icon: 'Scissors' },
  { name: 'Barba', icon: 'Shield' },
  { name: 'Coloração', icon: 'Sparkles' },
  { name: 'Tratamento', icon: 'BadgeCheck' },
]
