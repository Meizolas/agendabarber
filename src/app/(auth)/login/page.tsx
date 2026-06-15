import { LoginForm } from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Login | AgendBarber' }

export default function LoginPage() {
  return <LoginForm />
}
