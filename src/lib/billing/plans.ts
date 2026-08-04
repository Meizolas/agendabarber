export const BILLING_PLANS = [
  {
    code: 'solo',
    name: 'Essencial',
    tagline: 'Para quem atende sozinho',
    price: 39.9,
    staffLimit: 1,
    featured: false,
  },
  {
    code: 'team',
    name: 'Equipe',
    tagline: 'Para barbearias em crescimento',
    price: 79.9,
    staffLimit: 3,
    featured: true,
  },
  {
    code: 'studio',
    name: 'Barbearia',
    tagline: 'Para equipes maiores',
    price: 119.9,
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
  return BILLING_PLANS.find((plan) => plan.price === value) ?? BILLING_PLANS[0]
}
