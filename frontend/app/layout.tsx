import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Browser Agent - AI Web Automation',
  description: 'AI-powered browser automation agent for web tasks',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
