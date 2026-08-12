export const BILLING_PLANS = [
  {
    code: 'solo',
    name: 'Essencial',
    tagline: 'Para quem atende sozinho',
    price: 19.9,
    staffLimit: 1,
    featured: false,
  },
  {
    code: 'team',
    name: 'Equipe',
    tagline: 'Para barbearias em crescimento',
    price: 49.9,
    staffLimit: 3,
    featured: true,
  },
  {
    code: 'studio',
    name: 'Barbearia',
    tagline: 'Para equipes maiores',
    price: 79.9,
    staffLimit: 6,
    featured: false,
  },
] as const

export type BillingPlanCode = typeof BILLING_PLANS[number]['code']
export type BillingPlan = typeof BILLING_PLANS[number]

export function getBillingPlan(value: unknown): BillingPlan | null {
  return BILLING_PLANS.find((plan) => plan.code === value) ?? null
}

export function planForAmount(value: number): BillingPlan {
  return BILLING_PLANS.find((plan) => plan.price === value)
    ?? (value >= 100 ? BILLING_PLANS[2] : value >= 40 ? BILLING_PLANS[1] : BILLING_PLANS[0])
}
