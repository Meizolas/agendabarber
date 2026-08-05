import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const content = readFileSync(file, 'utf8')
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const index = line.indexOf('=')
        if (index === -1) continue
        const key = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim()
        if (key && process.env[key] === undefined) process.env[key] = value
      }
    } catch {
      // arquivo opcional
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const tables = [
  'sessions',
  'password_reset_tokens',
  'billing_events',
  'payments',
  'billing_checkouts',
  'subscriptions',
  'appointments',
  'blocked_times',
  'availability_rules',
  'services',
  'whatsapp_logs',
  'staff_members',
  'barbers',
  'users',
]

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) return { table, count: null, error: error.message }
  return { table, count: count ?? 0, error: null }
}

async function deleteTable(table) {
  const { count, error } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not('id', 'is', null)

  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm-delete-all')

const counts = await Promise.all(tables.map(countTable))
console.table(counts)

if (dryRun) process.exit(0)

if (!confirmed) {
  console.error('Modo destrutivo bloqueado. Use --confirm-delete-all para apagar.')
  process.exit(2)
}

for (const table of tables) {
  const deleted = await deleteTable(table)
  console.log(`${table}: ${deleted} removido(s)`)
}

console.log('Limpeza concluida.')
