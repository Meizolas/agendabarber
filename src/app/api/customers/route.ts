import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const supabase = createServiceClient()
  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ customers: [] })
  const params = new URL(request.url).searchParams
  const search = params.get('search')?.trim()
  if (params.get('mode') === 'lookup') {
    let lookupQuery = supabase
      .from('customers')
      .select('id, barber_id, name, whatsapp, notes')
      .eq('barber_id', barber.id)
      .order('updated_at', { ascending: false })
      .limit(search ? 20 : 50)
    if (search) {
      const safeSearch = search.replace(/[,%()]/g, ' ').trim()
      const digits = safeSearch.replace(/\D/g, '')
      lookupQuery = digits.length >= 4
        ? lookupQuery.or(`name.ilike.%${safeSearch}%,whatsapp.ilike.%${digits}%`)
        : lookupQuery.ilike('name', `%${safeSearch}%`)
    }
    const { data, error } = await lookupQuery
    if (error) return NextResponse.json({ error: 'Nao foi possivel carregar clientes.' }, { status: 500 })
    return NextResponse.json({ customers: data ?? [] }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } })
  }

  let query = supabase.from('customers').select('*, appointments(id, appointment_date, appointment_time, status)').eq('barber_id', barber.id).order('name')
  if (search) query = query.or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
