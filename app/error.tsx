'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { logError } from '@/lib/logger'

// App-level error boundary for routes outside the dashboard (login, join, etc.).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError('app_route_error', error, { digest: error.digest })
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7F7F5', padding: 24,
    }}>
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16,
        padding: '36px 28px', maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, background: '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <AlertTriangle size={24} style={{ color: '#CC0000' }} />
        </div>
        <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 19, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
          An unexpected error occurred. Please try again.
          {error.digest && (
            <><br /><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#bbb' }}>Ref: {error.digest}</span></>
          )}
        </p>
        <button type="button" className="btn-primary" onClick={() => reset()} style={{ margin: '0 auto' }}>
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    </div>
  )
}
