import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ChunkLoadRecovery } from '@/components/shared/ChunkLoadRecovery'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  applicationName: 'AgendBarber',
  title: {
    default: 'AgendBarber - Agendamento premium para barbearias',
    template: '%s | AgendBarber',
  },
  description: 'App moderno para descobrir barbearias, escolher serviços e agendar em poucos segundos.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'AgendBarber',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#F5C400',
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
