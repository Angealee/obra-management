'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MoreVertical, XCircle, RotateCcw, Trash2, Loader2, LucideIcon } from 'lucide-react'

type ActionKey = 'reject' | 'withdraw' | 'delete'

type Props = {
  applicationId: string
  applicantName: string
  status: string
}

const MENU_COPY: Record<ActionKey, { title: string; message: string; confirmLabel: string; icon: LucideIcon }> = {
  reject: {
    title: 'Reject this application?',
    message: 'will be marked as rejected. The applicant will no longer appear in the active review pipeline.',
    confirmLabel: 'Reject',
    icon: XCircle,
  },
  withdraw: {
    title: 'Mark as withdrawn?',
    message: 'will be marked as withdrawn from the application process.',
    confirmLabel: 'Mark Withdrawn',
    icon: RotateCcw,
  },
  delete: {
    title: 'Delete this application?',
    message: 'will be permanently deleted. This cannot be undone.',
    confirmLabel: 'Delete',
    icon: Trash2,
  },
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '8px 10px', borderRadius: 6, border: 'none', background: 'transparent',
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#333', cursor: 'pointer', textAlign: 'left',
}

export default function ApplicationMenu({ applicationId, applicantName, status }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ActionKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTerminal = ['approved', 'rejected', 'withdrawn'].includes(status)
  const ConfirmIcon = confirmAction ? MENU_COPY[confirmAction].icon : null

  async function handleConfirm() {
    if (!confirmAction) return
    setLoading(true)
    setError(null)

    if (confirmAction === 'delete') {
      const { error: err } = await supabase
        .from('member_applications')
        .delete()
        .eq('id', applicationId)
      if (err) {
        setError('Failed to delete this application.')
        setLoading(false)
        return
      }
      router.push('/dashboard/applications')
      router.refresh()
      return
    }

    const newStatus = confirmAction === 'reject' ? 'rejected' : 'withdrawn'
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('member_applications')
      .update({
        status: newStatus,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    setLoading(false)
    if (err) {
      setError(`Failed to mark this application as ${newStatus}.`)
      return
    }
    setConfirmAction(null)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn-secondary"
        aria-label="More actions"
        style={{ padding: '7px 9px' }}
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 200, padding: 6,
          }}>
            {!isTerminal && (
              <>
                <button type="button" style={menuItemStyle}
                  onClick={() => { setConfirmAction('reject'); setOpen(false) }}>
                  <XCircle size={14} /> Reject Application
                </button>
                <button type="button" style={menuItemStyle}
                  onClick={() => { setConfirmAction('withdraw'); setOpen(false) }}>
                  <RotateCcw size={14} /> Mark as Withdrawn
                </button>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
              </>
            )}
            <button type="button" style={{ ...menuItemStyle, color: '#CC0000' }}
              onClick={() => { setConfirmAction('delete'); setOpen(false) }}>
              <Trash2 size={14} /> Delete Application
            </button>
          </div>
        </>
      )}

      {confirmAction && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={() => !loading && setConfirmAction(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}
          >
            <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
              {MENU_COPY[confirmAction].title}
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#333' }}>{applicantName}</strong>&apos;s application {MENU_COPY[confirmAction].message}
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
                onClick={() => setConfirmAction(null)} style={{ opacity: loading ? 0.7 : 1 }}>
                Cancel
              </button>
              <button type="button" className="btn-danger" disabled={loading}
                onClick={handleConfirm}
                style={{ opacity: loading ? 0.7 : 1, background: '#CC0000', color: '#fff', borderColor: '#CC0000' }}>
                {loading
                  ? <Loader2 size={13} className="animate-spin" />
                  : ConfirmIcon && <ConfirmIcon size={13} />}
                {MENU_COPY[confirmAction].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
