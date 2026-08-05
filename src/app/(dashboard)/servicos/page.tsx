'use client'

import { useState, useEffect, useCallback } from 'react'
import { Barber, Service } from '@/types'
import { ServiceCard } from '@/components/services/ServiceCard'
import { ServiceForm } from '@/components/services/ServiceForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Header } from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { Plus, Scissors, Search, SlidersHorizontal } from 'lucide-react'
import type { ServiceInput } from '@/lib/validations/service'
import { demoBarber } from '@/lib/demo-data'
import { DEMO_STORAGE_KEY } from '@/lib/demo-session'
import { getStoredDemoServices, saveStoredDemoServices } from '@/lib/demo-store'

export default function ServicosPage() {
  const [barber, setBarber] = useState<Barber | null>(null)
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
  const [search, setSearch] = useState('')

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

    const servicesResponse = await fetch('/api/services')
    if (!servicesResponse.ok) {
      setLoading(false)
      return
    }

    const servicesResult = await servicesResponse.json()
    const barberData = servicesResult.barber ?? null
    setBarber(barberData)

    if (barberData) {
      const cacheKey = getServicesCacheKey(barberData.id)
      const cachedServices = readServicesCache(cacheKey)
      if (cachedServices) setServices(cachedServices)

      const nextServices = servicesResult.services ?? []
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

  const handleToggle = async (service: Service) => {
    const nextActive = !service.is_active
    const nextServices = services.map((item) => item.id === service.id ? { ...item, is_active: nextActive } : item)
    persistServicesState(nextServices)
    if (demoMode) return

    const response = await fetch(`/api/services/${service.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: service.name,
        image_url: service.image_url ?? '',
        price: service.price,
        duration_minutes: service.duration_minutes,
        is_active: nextActive,
      }),
    })
    if (!response.ok) {
      persistServicesState(services)
      toast({ title: 'Não foi possível alterar o serviço', variant: 'destructive' })
    }
  }

  if (loading) return <PageLoading />
  const visibleServices = services.filter((service) => service.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <Header barber={barber} title="Serviços" />
      <div className="flex-1 px-4 pb-5">
        <div className="mb-3">
          <Button
            variant="outline"
            className="h-10 w-full gap-2 border-[#F5C400] bg-transparent text-xs text-[#F5C400] hover:bg-[#F5C400]/10 hover:text-[#F5C400]"
            onClick={() => { setEditingService(null); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </div>

        <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737881]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar serviço" className="dashboard-field pl-9" />
          </div>
          <Button variant="outline" className="h-11 gap-2 border-white/10 bg-[#101214] px-3 text-xs text-[#A2A6AD]"><SlidersHorizontal className="h-4 w-4" /> Filtro</Button>
        </div>

        {services.length === 0 ? (
          <div className="dashboard-card p-8 text-center">
            <Scissors className="mx-auto mb-3 h-10 w-10 text-[#F5C400]" />
            <p className="text-sm font-medium text-white">Nenhum serviço cadastrado</p>
            <p className="mt-1 text-xs text-[#858A93]">
              Adicione os serviços que você oferece
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={(s) => { setEditingService(s); setFormOpen(true) }}
                onDelete={(s) => setDeleteDialog({ open: true, service: s })}
                onToggle={handleToggle}
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
