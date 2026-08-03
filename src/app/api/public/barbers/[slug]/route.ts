import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBillingAccessByBarberId } from '@/lib/billing/access'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    return NextResponse.json({ error: 'Link invalido' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: barber, error } = await supabase
    .from('barbers')
    .select('id, barber_name, barbershop_name, whatsapp, slug, logo_url, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erro ao carregar barbearia' }, { status: 500 })
  if (!barber) return NextResponse.json({ error: 'Barbearia nao encontrada' }, { status: 404 })

  const billingAccess = await getBillingAccessByBarberId(barber.id)
  if (!billingAccess.allowed) {
    return NextResponse.json(
      { error: 'Agenda temporariamente indisponivel.', code: 'PAYMENT_REQUIRED' },
      { status: 402, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const [{ data: services, error: servicesError }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from('services').select('id, barber_id, name, price, duration_minutes, image_url, is_active, created_at, updated_at').eq('barber_id', barber.id).eq('is_active', true).order('created_at'),
    supabase.from('availability_rules').select('id, barber_id, day_of_week, start_time, end_time, interval_minutes, is_active, created_at').eq('barber_id', barber.id).eq('is_active', true).order('day_of_week'),
  ])

  if (servicesError || rulesError) return NextResponse.json({ error: 'Erro ao carregar agenda' }, { status: 500 })

  return NextResponse.json(
    { barber: { ...barber, user_id: '' }, services: services ?? [], rules: rules ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
