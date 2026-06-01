import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CCS-Obra',
  description: 'Obra Management System · College of Computer Studies · DCT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}