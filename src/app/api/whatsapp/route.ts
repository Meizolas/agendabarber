import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  phone: z.string().min(10),
  message: z.string().min(1),
})

// Rota para envio manual de mensagem WhatsApp (autenticado)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { phone, message } = parsed.data
    const apiUrl = process.env.EVOLUTION_API_URL
    const apiKey = process.env.EVOLUTION_API_KEY
    const instance = process.env.EVOLUTION_INSTANCE_NAME

    if (!apiUrl || !apiKey || !instance) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 503 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number: fullPhone, textMessage: { text: message } }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `WhatsApp API error: ${errorText}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[WhatsApp POST] Error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
