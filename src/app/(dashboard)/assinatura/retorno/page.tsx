import { BillingReturnFlow } from '@/components/billing/BillingReturnFlow'

export default async function RetornoAssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const status = (await searchParams).status
  return <BillingReturnFlow status={status === 'sucesso' ? 'success' : status === 'expirado' ? 'expired' : 'cancelled'} />
}
