import { existsSync, readFileSync } from 'node:fs'

const WEBHOOK_NAME = 'AgendBarber Billing'
const EVENTS = [
  'CHECKOUT_CREATED',
  'CHECKOUT_PAID',
  'CHECKOUT_CANCELED',
  'CHECKOUT_EXPIRED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_INACTIVATED',
  'SUBSCRIPTION_DELETED',
  'PAYMENT_CREATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
]

function localEnvironment() {
  if (!existsSync('.env.local')) return {}
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]),
  )
}

const local = localEnvironment()
const env = (name) => (process.env[name] || local[name] || '').trim()

function baseUrl(value) {
  const normalized = value.replace(/\/+$/, '')
  if (normalized === 'https://sandbox.asaas.com/api/v3') return 'https://api-sandbox.asaas.com/v3'
  if (normalized === 'https://www.asaas.com/api/v3') return 'https://api.asaas.com/v3'
  return normalized
}

const apiUrl = baseUrl(env('ASAAS_API_URL'))
const apiKey = env('ASAAS_API_KEY').replace(/^\\\$/, '$')
const authToken = env('ASAAS_WEBHOOK_TOKEN')
const email = env('ASAAS_WEBHOOK_EMAIL')
const appUrl = env('NEXT_PUBLIC_APP_URL').replace(/\/+$/, '')

let parsedAppUrl
try { parsedAppUrl = new URL(appUrl) } catch { parsedAppUrl = null }

const errors = []
if (!/^https:\/\/api(-sandbox)?\.asaas\.com\/v3$/.test(apiUrl)) errors.push('ASAAS_API_URL invalida')
if (!apiKey) errors.push('ASAAS_API_KEY ausente')
if (authToken.length < 32 || authToken.length > 255 || /\s/.test(authToken)) errors.push('ASAAS_WEBHOOK_TOKEN invalido')
if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('ASAAS_WEBHOOK_EMAIL invalido ou ausente')
if (!parsedAppUrl || parsedAppUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(parsedAppUrl.hostname)) {
  errors.push('NEXT_PUBLIC_APP_URL deve ser HTTPS e publica')
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

const webhookUrl = `${appUrl}/api/webhooks/asaas`
const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  access_token: apiKey,
  'user-agent': 'AgendBarber/1.0 (webhook-configurator)',
}

const listResponse = await fetch(`${apiUrl}/webhooks?limit=100&offset=0`, { headers })
if (!listResponse.ok) throw new Error(`Nao foi possivel listar webhooks (HTTP ${listResponse.status})`)
const list = await listResponse.json()
const existing = list.data?.find((webhook) => webhook.name === WEBHOOK_NAME || webhook.url === webhookUrl)

const settings = {
  name: WEBHOOK_NAME,
  url: webhookUrl,
  enabled: true,
  interrupted: false,
  authToken,
  sendType: 'SEQUENTIALLY',
  events: EVENTS,
}

const response = await fetch(
  existing ? `${apiUrl}/webhooks/${encodeURIComponent(existing.id)}` : `${apiUrl}/webhooks`,
  {
    method: existing ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(existing ? settings : { ...settings, email, apiVersion: 3 }),
  },
)

if (!response.ok) {
  const payload = await response.json().catch(() => ({}))
  const descriptions = payload.errors?.map((error) => error.description).filter(Boolean).join('; ')
  throw new Error(descriptions || `Falha ao configurar webhook (HTTP ${response.status})`)
}

const webhook = await response.json()
console.log(existing ? 'Webhook atualizado com sucesso.' : 'Webhook criado com sucesso.')
console.log(`ID: ${webhook.id}`)
console.log(`URL: ${webhookUrl}`)
