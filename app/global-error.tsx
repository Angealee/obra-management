'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/logger'

// Root error boundary — only triggers when the root layout itself throws.
// Must render its own <html>/<body> since it replaces the whole document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError('global_error', error, { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F7F7F5' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16,
            padding: '36px 28px', maxWidth: 400, width: '100%', textAlign: 'center',
          }}>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
              The app failed to load. Please try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#111', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
