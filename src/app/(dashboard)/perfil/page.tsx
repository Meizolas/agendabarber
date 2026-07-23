'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, ExternalLink, Loader2, Scissors, User } from 'lucide-react'
import { Header } from '@/components/dashboard/Header'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { profileSchema, type ProfileInput } from '@/lib/validations/profile'
import type { Barber } from '@/types'

export default function PerfilPage() {
  const [barber, setBarber] = useState<Barber | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [browserOrigin, setBrowserOrigin] = useState('')
  const { toast } = useToast()
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })

  const slugValue = watch('slug', '')

  useEffect(() => {
    setBrowserOrigin(window.location.origin)
    const load = async () => {
      const response = await fetch('/api/profile')

      if (!response.ok) {
        setLoading(false)
        return
      }

      const { barber } = await response.json()
      setBarber(barber)

      if (barber) {
        reset({
          barbershop_name: barber.barbershop_name,
          barber_name: barber.barber_name,
          whatsapp: barber.whatsapp,
          slug: barber.slug,
        })
      }

      setLoading(false)
    }

    load()
  }, [reset])

  const onSubmit = async (data: ProfileInput) => {
    setSaving(true)

    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barbershop_name: data.barbershop_name,
        barber_name: data.barber_name,
        whatsapp: data.whatsapp,
        slug: data.slug.toLowerCase(),
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      toast({
        title: 'Erro ao salvar',
        description: result.error ?? 'Nao foi possivel salvar seu perfil.',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    setBarber(result.barber)
    reset({
      barbershop_name: result.barber.barbershop_name,
      barber_name: result.barber.barber_name,
      whatsapp: result.barber.whatsapp,
      slug: result.barber.slug,
    })
    toast({ title: 'Perfil atualizado!' })
    setSaving(false)
  }

  const copyLink = () => {
    const baseUrl = configuredAppUrl || window.location.origin
    const link = `${baseUrl}/agendar/${slugValue || barber?.slug || ''}`

    navigator.clipboard.writeText(link).then(() => {
      toast({ title: 'Link copiado!' })
    })
  }

  if (loading) return <PageLoading />

  const publicSlug = slugValue || barber?.slug || ''
  const publicLink = publicSlug ? `${configuredAppUrl || browserOrigin}/agendar/${publicSlug}` : 'Complete seu perfil para gerar o link'

  return (
    <>
      <Header barber={barber} title="Perfil" />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ExternalLink className="h-4 w-4 text-amber-500" />
                Seu link publico
              </CardTitle>
              <CardDescription>Compartilhe este link com seus clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {publicLink}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink} disabled={!publicSlug}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild disabled={!publicSlug}>
                  <a href={`/agendar/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scissors className="h-4 w-4 text-amber-500" />
                Identidade da barbearia
              </CardTitle>
              <CardDescription>Essas informacoes aparecem no painel e no link publico.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="slug">Link publico</Label>
                  <div className="flex items-center">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      /agendar/
                    </span>
                    <Input id="slug" className="rounded-l-none" {...register('slug')} />
                  </div>
                  {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
                </div>

                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alteracoes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {!barber && (
            <Card>
              <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                <User className="mt-0.5 h-4 w-4 text-amber-500" />
                <p>Seu usuario existe, mas o perfil da barbearia ainda nao foi criado. Preencha os dados acima para concluir.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
