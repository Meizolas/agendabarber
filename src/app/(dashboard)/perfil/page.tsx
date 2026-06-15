'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { profileSchema, type ProfileInput } from '@/lib/validations/profile'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Loader2, Copy, ExternalLink, User, Scissors } from 'lucide-react'

export default function PerfilPage() {
  const [barber, setBarber] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })

  const slugValue = watch('slug', '')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('barbers').select('*').eq('user_id', user.id).single()
      setBarber(data)

      if (data) {
        reset({
          barbershop_name: data.barbershop_name,
          barber_name: data.barber_name,
          whatsapp: data.whatsapp,
          slug: data.slug,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const onSubmit = async (data: ProfileInput) => {
    if (!barber) return
    setSaving(true)

    const { error } = await supabase
      .from('barbers')
      .update({
        barbershop_name: data.barbershop_name,
        barber_name: data.barber_name,
        whatsapp: data.whatsapp,
        slug: data.slug.toLowerCase(),
      })
      .eq('id', barber.id)

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Link já em uso', description: 'Escolha outro link público.', variant: 'destructive' })
      } else {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      }
    } else {
      toast({ title: 'Perfil atualizado!' })
      setBarber({ ...barber, ...data, slug: data.slug.toLowerCase() })
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !barber) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 2MB', variant: 'destructive' })
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${barber.id}.${ext}`

    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })

    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' })
    } else {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('barbers').update({ logo_url: publicUrl }).eq('id', barber.id)
      setBarber({ ...barber, logo_url: publicUrl })
      toast({ title: 'Logo atualizada!' })
    }
    setUploading(false)
  }

  const copyLink = () => {
    const link = `${appUrl}/agendar/${slugValue}`
    navigator.clipboard.writeText(link)
    toast({ title: 'Link copiado!' })
  }

  if (loading) return <PageLoading />

  return (
    <>
      <Header barber={barber} title="Perfil" />
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Link público */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-amber-500" />
                Seu link público
              </CardTitle>
              <CardDescription>
                Compartilhe este link na bio do Instagram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
                  {appUrl}/agendar/{slugValue || barber?.slug}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={`${appUrl}/agendar/${slugValue || barber?.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-4 w-4 text-amber-500" />
                Logo / Foto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {barber?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={barber.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Scissors className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div>
                <Label htmlFor="logo" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Alterar logo'}
                  </div>
                </Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 2MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Profile form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barber_name">Seu nome</Label>
                    <Input id="barber_name" {...register('barber_name')} />
                    {errors.barber_name && <p className="text-sm text-red-500">{errors.barber_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop_name">Nome da barbearia</Label>
                    <Input id="barbershop_name" {...register('barbershop_name')} />
                    {errors.barbershop_name && <p className="text-sm text-red-500">{errors.barbershop_name.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" placeholder="(11) 99999-9999" {...register('whatsapp')} />
                  {errors.whatsapp && <p className="text-sm text-red-500">{errors.whatsapp.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Link público</Label>
                  <div className="flex items-center gap-0">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      /agendar/
                    </span>
                    <Input id="slug" className="rounded-l-none" {...register('slug')} />
                  </div>
                  {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
                </div>

                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
