'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { demoBarber } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'
import { getStoredDemoServices, saveStoredDemoServices } from '@/lib/demo-store'

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

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    if (false && window.localStorage.getItem(DEMO_STORAGE_KEY) === 'admin') {
      const demoServices = getStoredDemoServices()
      setDemoMode(true)
      setBarber(demoBarber)
      setServices(demoServices)
      setLoading(false)
      return
    }

    const profileResponse = await fetch('/api/profile')
    if (!profileResponse.ok) {
      setLoading(false)
      return
    }

    const { barber: barberData } = await profileResponse.json()

    setBarber(barberData)

    if (barberData) {
      const cacheKey = getServicesCacheKey(barberData.id)
      const cachedServices = readServicesCache(cacheKey)
      if (cachedServices) setServices(cachedServices)

      const servicesResponse = await fetch('/api/services')
      const servicesResult = await servicesResponse.json()

      const nextServices = servicesResponse.ok ? servicesResult.services ?? [] : []
      setServices(nextServices)
      writeServicesCache(cacheKey, nextServices)
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const persistServicesState = (nextServices: Service[]) => {
    setServices(nextServices)

    if (demoMode) {
      saveStoredDemoServices(nextServices)
      return
    }

    if (barber?.id) writeServicesCache(getServicesCacheKey(barber.id), nextServices)
  }

  const handleSubmit = async (data: ServiceInput, imageFile?: File | null) => {
    if (!barber) return
    setFormLoading(true)

    let uploadedImageUrl: string | null = null
    try {
      uploadedImageUrl = imageFile ? await uploadServiceImage(imageFile) : null
    } catch (err) {
      toast({
        title: 'Erro ao enviar imagem',
        description: err instanceof Error ? err.message : 'Nao foi possivel enviar a imagem.',
        variant: 'destructive',
      })
      setFormLoading(false)
      return
    }

    const servicePayload = {
      name: data.name,
      image_url: uploadedImageUrl ?? data.image_url ?? null,
      price: data.price,
      duration_minutes: data.duration_minutes,
    }

    if (editingService) {
      if (demoMode) {
        const nextServices = services.map((service) => (
          service.id === editingService.id
            ? { ...service, ...servicePayload, updated_at: new Date().toISOString() }
            : service
        ))
        persistServicesState(nextServices)
        toast({ title: 'Servico demo atualizado!' })
        setFormOpen(false)
        setEditingService(null)
        setFormLoading(false)
        return
      }

      const response = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicePayload),
      })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Erro ao atualizar', description: result.error ?? 'Nao foi possivel atualizar.', variant: 'destructive' })
      } else {
        const nextServices = services.map((service) => (
          service.id === editingService.id
            ? result.service
            : service
        ))
        persistServicesState(nextServices)
        toast({ title: 'Servico atualizado!' })
        setFormOpen(false)
        setEditingService(null)
        loadData()
      }
    } else {
      if (demoMode) {
        const nextServices = [
          {
            id: `demo-service-${Date.now()}`,
            barber_id: barber.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...servicePayload,
          },
          ...services,
        ]
        persistServicesState(nextServices)
        toast({ title: 'Servico demo criado!' })
        setFormOpen(false)
        setFormLoading(false)
        return
      }

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicePayload),
      })
      const result = await response.json()

      if (!response.ok) {
        toast({ title: 'Erro ao criar', description: result.error ?? 'Nao foi possivel criar.', variant: 'destructive' })
      } else {
        toast({ title: 'Servico criado!' })
        setFormOpen(false)
        loadData()
      }
    }

    setFormLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteDialog.service || !barber) return
    setDeleteLoading(true)

    if (demoMode) {
      const nextServices = services.filter((service) => service.id !== deleteDialog.service?.id)
      persistServicesState(nextServices)
      toast({ title: 'Servico demo excluido!' })
      setDeleteDialog({ open: false, service: null })
      setDeleteLoading(false)
      return
    }

    const response = await fetch(`/api/services/${deleteDialog.service.id}`, { method: 'DELETE' })
    const result = await response.json()

    if (!response.ok) {
      toast({ title: 'Erro ao excluir', description: result.error ?? 'Nao foi possivel excluir.', variant: 'destructive' })
    } else {
      const nextServices = services.filter((service) => service.id !== deleteDialog.service?.id)
      persistServicesState(nextServices)
      toast({ title: 'Servico excluido!' })
      setDeleteDialog({ open: false, service: null })
      loadData()
    }
    setDeleteLoading(false)
  }

  if (loading) return <PageLoading />

  return (
    <>
      <Header barber={barber} title="Servicos" />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500 text-sm">
            {services.length} {services.length === 1 ? 'servico cadastrado' : 'servicos cadastrados'}
          </p>
          <Button
            className="gap-2 bg-amber-500 hover:bg-amber-600"
            onClick={() => { setEditingService(null); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Novo servico
          </Button>
        </div>

        {services.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center sm:p-12">
            <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-500">Nenhum servico cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">
              Adicione os servicos que voce oferece
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
        title="Excluir servico"
        description={`Deseja excluir "${deleteDialog.service?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}

function getServicesCacheKey(barberId: string) {
  return `agendbarber_services_${barberId}`
}

function readServicesCache(cacheKey: string) {
  try {
    const cached = window.localStorage.getItem(cacheKey)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed as Service[] : null
  } catch {
    window.localStorage.removeItem(cacheKey)
    return null
  }
}

function writeServicesCache(cacheKey: string, services: Service[]) {
  window.localStorage.setItem(cacheKey, JSON.stringify(services))
}

async function uploadServiceImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/service-images', {
    method: 'POST',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'Nao foi possivel enviar a imagem.')
  }

  return result.publicUrl as string
}
