import type { Metadata, Viewport } from 'next'
import './globals.css'
import './liquid-glass.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

export const metadata: Metadata = {
  title: 'CFDI 4.0 Automation System',
  description: 'Automated system for filling CFDI 4.0 forms with AI-powered browser agent',
  generator: 'Next.js',
  keywords: 'CFDI, 4.0, automation, invoicing, Mexico, RFC, SAT',
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
    <html lang="en-US" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
