import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans'
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
})

// PWA Metadata
export const metadata: Metadata = {
  title: 'Datumsrechner Heilmittel',
  description: 'Fristberechnung für Heilmittelverordnungen im Praxisalltag',
  generator: 'v0.app',
  manifest: '/manifest.json',
  keywords: ['Heilmittel', 'Fristberechnung', 'Verordnung', 'Physiotherapie', 'Ergotherapie', 'Logopädie'],
  authors: [{ name: 'Heilmittel App' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Heilmittel Rechner',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icon-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-touch-icon.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
  },
}

// Viewport für PWA
export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${geist.variable} ${geistMono.variable} bg-background`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <ServiceWorkerRegistration />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
