'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { logError } from '@/lib/logger'

// Segment error boundary for the dashboard. Renders inside dashboard/layout, so
// the sidebar + year bar stay intact while the content area shows the fallback.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError('dashboard_segment_error', error, { digest: error.digest })
  }, [error])

  return (
    <div className="page-enter px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div className="dash-card" style={{ maxWidth: 480, margin: '24px auto', textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, background: '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <AlertTriangle size={24} style={{ color: '#CC0000' }} />
        </div>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
          Something went wrong
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
          This page hit an unexpected error. You can retry, or head back to the dashboard.
          {error.digest && (
            <><br /><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#bbb' }}>Ref: {error.digest}</span></>
          )}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={() => reset()}>
            <RotateCcw size={14} /> Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
