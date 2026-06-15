import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ChunkLoadRecovery } from '@/components/shared/ChunkLoadRecovery'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'AgendBarber - Agendamento premium para barbearias',
    template: '%s | AgendBarber',
  },
  description: 'App moderno para descobrir barbearias, escolher serviços e agendar em poucos segundos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <ChunkLoadRecovery />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
