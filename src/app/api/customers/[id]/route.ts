import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null
  const supabase = createServiceClient()
  const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single()
  if (!barber) return NextResponse.json({ error: 'Barbearia nao encontrada' }, { status: 404 })
  const { data, error } = await supabase.from('customers').update({ notes, updated_at: new Date().toISOString() }).eq('id', id).eq('barber_id', barber.id).select('id, notes').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 })
  return NextResponse.json({ customer: data })
}
