import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LanguageToggle } from '@/components/ui/LanguageSwitcher'

export const metadata: Metadata = {
  title: 'Sistema de Automatización CFDI 4.0',
  description: 'Sistema automatizado para el llenado de formularios CFDI 4.0 con agente de navegador potenciado por IA',
  generator: 'Next.js',
  keywords: 'CFDI, 4.0, automatización, facturación, México, RFC, SAT',
  authors: [{ name: 'Gaman.ai', url: 'https://gaman.ai' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            {/* Language switcher in top-right corner */}
            <div className="fixed top-4 right-4 z-50">
              <LanguageToggle />
            </div>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
