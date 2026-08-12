import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(20).max(512), auth: z.string().min(8).max(256) }),
})

async function account() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  return barber ? { admin, barberId: barber.id } : null
}

export async function POST(request: NextRequest) {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Inscricao de notificacao invalida.' }, { status: 400 })
  const { error } = await context.admin.from('push_subscriptions').upsert({
    barber_id: context.barberId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
    is_active: true,
  }, { onConflict: 'endpoint' })
  if (error) return NextResponse.json({ error: 'Instale a migration de notificacoes.' }, { status: 503 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  const endpoint = new URL(request.url).searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'Endpoint obrigatorio.' }, { status: 400 })
  await context.admin.from('push_subscriptions').update({ is_active: false }).eq('barber_id', context.barberId).eq('endpoint', endpoint)
  return NextResponse.json({ success: true })
}
