'use client'

import { Loader2 } from 'lucide-react'

// The dark "unsaved changes" bar plus the save success / error banners.
export default function MatrixSaveBar({
  pendingCount,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onDiscard,
}: {
  pendingCount: number
  saving: boolean
  saveError: string
  saveSuccess: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const hasPending = pendingCount > 0
  return (
    <>
      {hasPending && (
        <div className="matrix-savebar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          background: '#111', color: '#fff', borderRadius: 12, padding: '12px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
              {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDiscard}
              disabled={saving}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: '6px 14px', opacity: saving ? 0.5 : 1 }}
            >
              Discard
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#fff', color: '#111', border: 'none', borderRadius: 8,
                padding: '7px 18px', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {saveSuccess && !hasPending && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, padding: '10px 16px', borderRadius: 10 }}>
          Changes saved successfully.
        </div>
      )}
      {saveError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: '10px 16px', borderRadius: 10 }}>
          {saveError}
        </div>
      )}
    </>
  )
}
