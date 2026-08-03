import Link from 'next/link'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const content = {
  sucesso: {
    icon: CheckCircle2,
    title: 'Dados enviados com sucesso',
    description: 'Estamos aguardando a confirmacao financeira do Asaas. O retorno da tela de pagamento, sozinho, nao libera o acesso.',
  },
  cancelado: {
    icon: AlertCircle,
    title: 'Pagamento cancelado',
    description: 'Nenhuma liberacao foi realizada. Voce pode iniciar um novo checkout quando quiser.',
  },
  expirado: {
    icon: Clock3,
    title: 'Checkout expirado',
    description: 'O link de pagamento perdeu a validade. Gere um novo link para continuar.',
  },
} as const

export default async function RetornoAssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const status = (await searchParams).status as keyof typeof content
  const selected = content[status] || content.cancelado
  const Icon = selected.icon

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <Icon className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <CardTitle>{selected.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{selected.description}</p>
          <Button asChild className="w-full bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/assinatura">Voltar para assinatura</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
