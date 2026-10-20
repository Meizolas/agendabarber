import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { blockTimeSchema, blockTimesBatchSchema, calendarDateSchema } from '@/lib/validations/availability'
import { isTrustedMutationRequest } from '@/lib/security/request'
import { getSaoPauloDate, getSaoPauloParts } from '@/lib/utils/timezone'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (date && !calendarDateSchema.safeParse(date).success) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ blocked: [] })

  let query = adminClient
    .from('blocked_times')
    .select('*')
    .eq('barber_id', barber.id)
    .order('blocked_date')
    .order('blocked_time')
  if (date) query = query.eq('blocked_date', date)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Não foi possível consultar os bloqueios' }, { status: 500 })
  return NextResponse.json({ blocked: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const batch = blockTimesBatchSchema.safeParse(body)
  if (batch.success) {
    const today = getSaoPauloDate()
    if (batch.data.blocked_date < today) return NextResponse.json({ error: 'Escolha hoje ou uma data futura' }, { status: 400 })
    if (batch.data.blocked_date === today) {
      const now = getSaoPauloParts()
      const currentTime = `${now.hour}:${now.minute}`
      if (batch.data.blocked_times.some((time) => time <= currentTime)) return NextResponse.json({ error: 'Selecione apenas horários futuros' }, { status: 400 })
    }
    const adminClient = createServiceClient()
    const { data: barber } = await adminClient.from('barbers').select('id').eq('user_id', user.id).maybeSingle()
    if (!barber) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })
    const { data, error } = await adminClient.rpc('block_barber_times', {
      p_barber_id: barber.id,
      p_blocked_date: batch.data.blocked_date,
      p_blocked_times: batch.data.blocked_times,
      p_reason: batch.data.reason || null,
    })
    if (!error) return NextResponse.json({ blocked: data ?? [] }, { status: 201 })

    // Compatibilidade enquanto a migration da RPC ainda não foi aplicada no ambiente.
    if (error.code === 'PGRST202' || error.code === '42883') {
      const { data: existing, error: lookupError } = await adminClient.from('blocked_times').select('blocked_time')
        .eq('barber_id', barber.id).eq('blocked_date', batch.data.blocked_date).in('blocked_time', batch.data.blocked_times)
      if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar os bloqueios' }, { status: 500 })
      const existingTimes = new Set((existing ?? []).map((item) => String(item.blocked_time).slice(0, 5)))
      const missing = batch.data.blocked_times.filter((time) => !existingTimes.has(time))
      if (missing.length) {
        const { error: insertError } = await adminClient.from('blocked_times').insert(missing.map((time) => ({
          barber_id: barber.id,
          blocked_date: batch.data.blocked_date,
          blocked_time: time,
          reason: batch.data.reason || null,
        })))
        if (insertError) return NextResponse.json({ error: 'Não foi possível bloquear os horários' }, { status: 500 })
      }
      const { data: blocked, error: readError } = await adminClient.from('blocked_times').select('*')
        .eq('barber_id', barber.id).eq('blocked_date', batch.data.blocked_date).in('blocked_time', batch.data.blocked_times).order('blocked_time')
      if (readError) return NextResponse.json({ error: 'Os horários foram bloqueados, mas não foi possível atualizar a lista' }, { status: 500 })
      return NextResponse.json({ blocked: blocked ?? [] }, { status: 201 })
    }

    console.error('[Blocked times POST] Batch error:', error)
    return NextResponse.json({ error: 'Não foi possível bloquear os horários' }, { status: 500 })
  }
  const parsed = blockTimeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
  if (parsed.data.blocked_date < getSaoPauloDate()) return NextResponse.json({ error: 'Escolha hoje ou uma data futura' }, { status: 400 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

  // Repetir a ação de congelar não deve criar outro bloqueio em uso normal.
  if (!parsed.data.blocked_time) {
    const { data: existing, error } = await adminClient.from('blocked_times').select('*')
      .eq('barber_id', barber.id).eq('blocked_date', parsed.data.blocked_date).is('blocked_time', null).limit(1)
    if (error) return NextResponse.json({ error: 'Não foi possível consultar o dia' }, { status: 500 })
    if (existing?.[0]) return NextResponse.json({ blocked: existing[0] })
  }

  const { data, error } = await adminClient
    .from('blocked_times')
    .insert({
      barber_id: barber.id,
      blocked_date: parsed.data.blocked_date,
      blocked_time: parsed.data.blocked_time || null,
      reason: parsed.data.reason || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Não foi possível salvar o bloqueio' }, { status: 500 })
  return NextResponse.json({ blocked: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const date = searchParams.get('date')
  if ((!id && !date) || (id && date) || (id && !z.string().uuid().safeParse(id).success) || (date && !calendarDateSchema.safeParse(date).success)) {
    return NextResponse.json({ error: 'Informe um ID válido ou uma data válida' }, { status: 400 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const adminClient = createServiceClient()
  const { data: barber } = await adminClient
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })

  let query = adminClient
    .from('blocked_times')
    .delete()
    .eq('barber_id', barber.id)
  // Liberar o dia mantém os bloqueios de horários específicos.
  query = id ? query.eq('id', id) : query.eq('blocked_date', date!).is('blocked_time', null)
  const { error } = await query

  if (error) return NextResponse.json({ error: 'Não foi possível remover o bloqueio' }, { status: 500 })
  return NextResponse.json({ success: true })
}
