import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => !value || (value.length >= 10 && value.length <= 13), 'WhatsApp inválido').optional().default(''),
  photo_url: z.string().url().nullable().optional(),
})

async function account() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  return barber ? { admin, barberId: barber.id } : null
}

export async function GET() {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const [{ data: staff, error }, { data: subscription }] = await Promise.all([
    context.admin.from('staff_members').select('*').eq('barber_id', context.barberId).order('display_order').order('created_at'),
    context.admin.from('subscriptions').select('plan_code, staff_limit, status').eq('barber_id', context.barberId).maybeSingle(),
  ])
  if (error) return NextResponse.json({ error: 'A estrutura de equipe ainda não foi instalada.' }, { status: 503 })
  return NextResponse.json({ staff: staff ?? [], plan: subscription ?? { plan_code: 'solo', staff_limit: 1, status: 'pending_payment' } })
}

export async function POST(request: NextRequest) {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const parsed = staffSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Preencha corretamente os dados do profissional.' }, { status: 400 })

  const { data, error } = await context.admin.from('staff_members').insert({
    barber_id: context.barberId,
    name: parsed.data.name,
    whatsapp: parsed.data.whatsapp || null,
    photo_url: parsed.data.photo_url ?? null,
  }).select().single()
  if (error) {
    const limitReached = error.message.includes('STAFF_LIMIT_REACHED')
    return NextResponse.json({ error: limitReached ? 'Limite de profissionais do plano atingido.' : 'Não foi possível adicionar o profissional.' }, { status: limitReached ? 409 : 500 })
  }
  return NextResponse.json({ staffMember: data }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const parsed = staffSchema.safeParse(body)
  if (!/^[0-9a-f-]{36}$/i.test(id) || !parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { data, error } = await context.admin.from('staff_members').update({
    name: parsed.data.name,
    whatsapp: parsed.data.whatsapp || null,
    photo_url: parsed.data.photo_url ?? null,
  }).eq('id', id).eq('barber_id', context.barberId).select().maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  return NextResponse.json({ staffMember: data })
}

export async function DELETE(request: NextRequest) {
  const context = await account()
  if (!context) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })

  const { data: member } = await context.admin.from('staff_members').select('is_owner').eq('id', id).eq('barber_id', context.barberId).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  if (member.is_owner) return NextResponse.json({ error: 'O responsável pela conta não pode ser removido.' }, { status: 409 })

  const { error } = await context.admin.from('staff_members').update({ is_active: false }).eq('id', id).eq('barber_id', context.barberId)
  if (error) return NextResponse.json({ error: 'Não foi possível desativar o profissional.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
