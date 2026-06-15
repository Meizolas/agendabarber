import { RegisterForm } from '@/components/auth/RegisterForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Criar Conta | AgendBarber' }

export default function CadastroPage() {
  return <RegisterForm />
}
