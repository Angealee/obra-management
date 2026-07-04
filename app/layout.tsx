import type { Metadata, Viewport } from 'next'
import './globals.css'
import PwaController from '@/components/PwaController'

export const metadata: Metadata = {
  title: 'CCS-Obra',
  description: 'Obra Management System · College of Computer Studies · DCT',
  applicationName: 'Obra CMP',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Obra CMP',
  },
  formatDetection: { telephone: false },
  icons: {
    // Browser tab favicon is handled by the existing app/favicon.ico (auto-injected).
    // These cover the installed-app surfaces.
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D0D0D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts load via @import in globals.css; preconnecting shaves
            the DNS+TLS round-trips off the critical font path. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <PwaController />
      </body>
    </html>
  )
}
