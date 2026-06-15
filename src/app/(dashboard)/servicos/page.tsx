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

  const supabase = createClient()
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update({ name: data.name, price: data.price, duration_minutes: data.duration_minutes })
        .eq('id', editingService.id)

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Serviço atualizado!' })
        setFormOpen(false)
        setEditingService(null)
        loadData()
      }
    } else {
      const { error } = await supabase
        .from('services')
        .insert({ barber_id: barber.id, name: data.name, price: data.price, duration_minutes: data.duration_minutes })

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
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-sm">
              {services.length} {services.length === 1 ? 'serviço cadastrado' : 'serviços cadastrados'}
            </p>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 gap-2"
            onClick={() => { setEditingService(null); setFormOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </div>

        {services.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
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
