'use client'

import { Loader2, Trash2, XCircle } from 'lucide-react'

// Confirmation dialog for the consultant bulk reject/delete actions.
export default function BulkConfirmModal({
  action,
  count,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  action: 'reject' | 'delete'
  count: number
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}
      onClick={() => !loading && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}
      >
        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
          {action === 'delete' ? 'Delete applications?' : 'Reject applications?'}
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#555', lineHeight: 1.6, margin: 0 }}>
          {action === 'delete'
            ? `This will permanently delete ${count} application${count !== 1 ? 's' : ''}. This cannot be undone.`
            : `This will mark ${count} application${count !== 1 ? 's' : ''} as rejected.`}
        </p>
        {error && (
          <div style={{
            marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px', color: '#dc2626',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13,
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn-secondary" disabled={loading}
            onClick={onCancel} style={{ opacity: loading ? 0.7 : 1 }}>
            Cancel
          </button>
          <button type="button" className="btn-danger" disabled={loading}
            onClick={onConfirm} style={{ opacity: loading ? 0.7 : 1, borderColor: '#CC0000', background: '#CC0000', color: '#fff' }}>
            {loading
              ? <Loader2 size={13} className="animate-spin" />
              : action === 'delete' ? <Trash2 size={13} /> : <XCircle size={13} />}
            {action === 'delete' ? 'Delete' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}
