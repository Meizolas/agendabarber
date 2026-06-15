'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Service } from '@/types'
import { ServiceCard } from '@/components/services/ServiceCard'
import { ServiceForm } from '@/components/services/ServiceForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Plus, Scissors } from 'lucide-react'
import type { ServiceInput } from '@/lib/validations/service'
import { demoBarber, demoServices } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'

export default function ServicosPage() {
  const [barber, setBarber] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
      setDemoMode(true)
      setBarber(demoBarber)
      setServices((current) => current.length ? current : demoServices)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: barberData } = await supabase
      .from('barbers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setBarber(barberData)

    if (barberData) {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberData.id)
        .order('created_at', { ascending: false })
      setServices(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async (data: ServiceInput) => {
    if (!barber) return
    setFormLoading(true)
    const servicePayload = {
      name: data.name,
      image_url: data.image_url,
      price: data.price,
      duration_minutes: data.duration_minutes,
    }

    if (editingService) {
      if (demoMode) {
        setServices((current) => current.map((service) => (
          service.id === editingService.id
            ? { ...service, ...servicePayload, updated_at: new Date().toISOString() }
            : service
        )))
        toast({ title: 'Serviço demo atualizado!' })
        setFormOpen(false)
        setEditingService(null)
        setFormLoading(false)
        return
      }

      let { error } = await supabase
        .from('services')
        .update(servicePayload)
        .eq('id', editingService.id)

      if (error && isMissingImageColumn(error.message)) {
        const { image_url, ...fallbackPayload } = servicePayload
        const fallback = await supabase
          .from('services')
          .update(fallbackPayload)
          .eq('id', editingService.id)
        error = fallback.error
        if (!error) toast({ title: 'Serviço salvo sem imagem', description: 'Adicione a coluna image_url no Supabase para salvar fotos.' })
      }

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Serviço atualizado!' })
        setFormOpen(false)
        setEditingService(null)
        loadData()
      }
    } else {
      if (demoMode) {
        setServices((current) => [
          {
            id: `demo-service-${Date.now()}`,
            barber_id: barber.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...servicePayload,
          },
          ...current,
        ])
        toast({ title: 'Serviço demo criado!' })
        setFormOpen(false)
        setFormLoading(false)
        return
      }

      let { error } = await supabase
        .from('services')
        .insert({
          barber_id: barber.id,
          ...servicePayload,
        })

      if (error && isMissingImageColumn(error.message)) {
        const { image_url, ...fallbackPayload } = servicePayload
        const fallback = await supabase
          .from('services')
          .insert({ barber_id: barber.id, ...fallbackPayload })
        error = fallback.error
        if (!error) toast({ title: 'Serviço salvo sem imagem', description: 'Adicione a coluna image_url no Supabase para salvar fotos.' })
      }

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Serviço criado!' })
        setFormOpen(false)
        loadData()
      }
    }

    setFormLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteDialog.service) return
    setDeleteLoading(true)

    if (demoMode) {
      setServices((current) => current.filter((service) => service.id !== deleteDialog.service?.id))
      toast({ title: 'Serviço demo excluído!' })
      setDeleteDialog({ open: false, service: null })
      setDeleteLoading(false)
      return
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', deleteDialog.service.id)

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Serviço excluído!' })
      setDeleteDialog({ open: false, service: null })
      loadData()
    }
    setDeleteLoading(false)
  }

  if (loading) return <PageLoading />

  return (
    <>
      <Header barber={barber} title="Serviços" />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-slate-500 text-sm">
              {services.length} {services.length === 1 ? 'serviço cadastrado' : 'serviços cadastrados'}
            </p>
          </div>
          <Button
            className="gap-2 bg-amber-500 hover:bg-amber-600"
            onClick={() => { setEditingService(null); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </div>

        {services.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center sm:p-12">
            <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-500">Nenhum serviço cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">
              Adicione os serviços que você oferece
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={(s) => { setEditingService(s); setFormOpen(true) }}
                onDelete={(s) => setDeleteDialog({ open: true, service: s })}
              />
            ))}
          </div>
        )}
      </div>

      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        service={editingService}
        loading={formLoading}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, service: deleteDialog.service })}
        title="Excluir serviço"
        description={`Deseja excluir "${deleteDialog.service?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}

function isMissingImageColumn(message: string) {
  return message.toLowerCase().includes('image_url')
}
