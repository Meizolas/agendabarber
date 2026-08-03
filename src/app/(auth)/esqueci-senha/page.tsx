import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Recuperar Senha | AgendBarber' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
