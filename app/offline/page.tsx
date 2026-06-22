import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Offline · Obra CMP',
}

// Static fallback shown by the service worker when a navigation is attempted
// with no network. Kept self-contained (inline styles, no data) so it renders
// even fully offline.
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F7F5',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: '36px 28px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#0D0D0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <WifiOff size={26} style={{ color: '#fff' }} />
        </div>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 19,
            fontWeight: 700,
            color: '#111',
            margin: '0 0 8px',
          }}
        >
          You&apos;re offline
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13.5,
            color: '#666',
            lineHeight: 1.6,
            margin: '0 0 20px',
          }}
        >
          Obra needs a connection to load this page. Check your internet and try
          again — your work isn&apos;t lost.
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            background: '#0D0D0D',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 9,
            textDecoration: 'none',
          }}
        >
          Try again
        </a>
      </div>
    </div>
  )
}
