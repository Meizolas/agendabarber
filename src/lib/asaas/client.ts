const DEFAULT_TIMEOUT_MS = 15_000

export class AsaasApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AsaasApiError'
  }
}

export interface AsaasCheckout {
  id: string
  link: string
  status: string
}

function normalizeAsaasBaseUrl(value?: string) {
  const raw = value?.trim().replace(/\/+$/, '')
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.hostname === 'sandbox.asaas.com' && url.pathname === '/api/v3') {
      return 'https://api-sandbox.asaas.com/v3'
    }
    if (url.hostname === 'www.asaas.com' && url.pathname === '/api/v3') {
      return 'https://api.asaas.com/v3'
    }
    return raw
  } catch {
    return raw
  }
}

interface AsaasErrorPayload {
  errors?: Array<{ code?: string; description?: string }>
}

export function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY?.trim()
  const baseUrl = normalizeAsaasBaseUrl(process.env.ASAAS_API_URL)
  const monthlyPrice = Number(process.env.ASAAS_MONTHLY_PRICE)

  if (!apiKey || !baseUrl || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
    throw new Error('ASAAS_NOT_CONFIGURED')
  }

  if (!/^https:\/\//i.test(baseUrl)) throw new Error('ASAAS_API_URL_INVALID')

  return {
    apiKey,
    baseUrl,
    monthlyPrice: Math.round(monthlyPrice * 100) / 100,
  }
}

function checkoutLink(baseUrl: string, checkoutId: string) {
  if (baseUrl.includes('api-sandbox.asaas.com')) {
    return `https://sandbox.asaas.com/checkoutSession/show/${encodeURIComponent(checkoutId)}`
  }
  return `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`
}

export async function createRecurringCheckout(input: {
  externalReference: string
  appUrl: string
  nextDueDate: string
}) {
  const config = getAsaasConfig()
  const response = await fetch(`${config.baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: config.apiKey,
      'user-agent': 'AgendBarber/1.0 (Next.js; server)',
    },
    body: JSON.stringify({
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: 60,
      externalReference: input.externalReference,
      callback: {
        successUrl: `${input.appUrl}/assinatura/retorno?status=sucesso`,
        cancelUrl: `${input.appUrl}/assinatura/retorno?status=cancelado`,
        expiredUrl: `${input.appUrl}/assinatura/retorno?status=expirado`,
      },
      items: [{
        externalReference: 'agendbarber-monthly',
        name: 'Mensalidade AgendBarber',
        description: 'Acesso mensal ao sistema AgendBarber',
        quantity: 1,
        value: config.monthlyPrice,
      }],
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: input.nextDueDate,
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  })

  const payload = await response.json().catch(() => ({})) as AsaasErrorPayload & {
    id?: string
    link?: string
    status?: string
  }

  if (!response.ok || !payload.id) {
    const firstError = payload.errors?.[0]
    throw new AsaasApiError(
      firstError?.description || 'O Asaas recusou a criacao do checkout.',
      response.status,
      firstError?.code,
    )
  }

  return {
    id: payload.id,
    link: payload.link || checkoutLink(config.baseUrl, payload.id),
    status: payload.status || 'ACTIVE',
  } satisfies AsaasCheckout
}
