import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const supabase = createServiceClient()
  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ customers: [] })
  const search = new URL(request.url).searchParams.get('search')?.trim()
  let query = supabase.from('customers').select('*, appointments(id, appointment_date, appointment_time, status)').eq('barber_id', barber.id).order('name')
  if (search) query = query.or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
