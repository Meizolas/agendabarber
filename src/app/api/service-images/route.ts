import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

const BUCKET_NAME = 'service-images'
const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Imagem obrigatoria' }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Envie um arquivo de imagem valido' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Imagem muito grande. Maximo de 5MB.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!barber) return NextResponse.json({ error: 'Perfil nao encontrado' }, { status: 404 })

  const { error: bucketError } = await ensureBucket()
  if (bucketError) return NextResponse.json({ error: bucketError }, { status: 500 })

  const extension = getExtension(file)
  const path = `${barber.id}/${crypto.randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return NextResponse.json({ publicUrl: data.publicUrl, path })
}

async function ensureBucket() {
  const supabase = createServiceClient()
  const { data } = await supabase.storage.getBucket(BUCKET_NAME)

  if (data) return { error: null as string | null }

  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_IMAGE_TYPES,
  })

  return { error: error?.message ?? null }
}

function getExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension

  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  return 'jpg'
}
