import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Sistema de Automatización CFDI 4.0',
  description: 'Sistema automatizado para el llenado de formularios CFDI 4.0 con agente de navegador potenciado por IA',
  generator: 'Next.js',
  keywords: 'CFDI, 4.0, automatización, facturación, México, RFC, SAT',
  authors: [{ name: 'Gaman.ai', url: 'https://gaman.ai' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
