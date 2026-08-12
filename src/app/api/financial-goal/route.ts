import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getSaoPauloDate } from '@/lib/utils/timezone'
import { monthBounds } from '@/lib/finance/summary'

const goalSchema = z.object({
  target_amount: z.coerce.number().positive('A meta deve ser maior que zero.').max(99999999.99),
})

async function context() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createServiceClient()
  const { data: barber } = await admin.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
  return barber ? { admin, barberId: barber.id } : null
}

export async function GET() {
  const account = await context()
  if (!account) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const monthStart = monthBounds(getSaoPauloDate()).currentStart
  const { data, error } = await account.admin
    .from('financial_goals')
    .select('target_amount, month_start')
    .eq('barber_id', account.barberId)
    .eq('month_start', monthStart)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Instale a migration de metas financeiras.' }, { status: 503 })
  return NextResponse.json({ goal: data ? { ...data, target_amount: Number(data.target_amount) } : null })
}

export async function PUT(request: NextRequest) {
  const account = await context()
  if (!account) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const parsed = goalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Valor inválido.' }, { status: 400 })

  const monthStart = monthBounds(getSaoPauloDate()).currentStart
  const { data, error } = await account.admin
    .from('financial_goals')
    .upsert({
      barber_id: account.barberId,
      month_start: monthStart,
      target_amount: parsed.data.target_amount,
    }, { onConflict: 'barber_id,month_start' })
    .select('target_amount, month_start')
    .single()

  if (error) return NextResponse.json({ error: 'Não foi possível salvar a meta. Verifique a migration.' }, { status: 503 })
  return NextResponse.json({ goal: { ...data, target_amount: Number(data.target_amount) } })
}
