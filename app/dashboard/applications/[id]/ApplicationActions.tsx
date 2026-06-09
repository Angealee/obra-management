'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MemberApplication } from '@/types/database'
import { ArrowRight, XCircle, Loader, ExternalLink } from 'lucide-react'

type Props = {
  application: MemberApplication
  userRole: string
}

export default function ApplicationActions({ application, userRole }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [notes, setNotes] = useState(application.notes || '')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isConsultant = userRole === 'consultant'
  const isHead = userRole === 'creative_head'
  const currentStatus = application.status
  const isTerminal = ['approved', 'rejected', 'withdrawn'].includes(currentStatus)

  const stageFlow: Record<string, string> = {
    pending: 'shortlisted',
    shortlisted: 'interviewed',
    interviewed: 'approved',
  }
  const stageLabel: Record<string, string> = {
    pending: 'Move to Shortlisted',
    shortlisted: 'Move to Interviewed',
    interviewed: 'Mark as Approved',
  }
  const stageBg: Record<string, string> = {
    pending: '#111111',
    shortlisted: '#111111',
    interviewed: '#16a34a',
  }

  const nextStatus = stageFlow[currentStatus] ?? null
  const canAdvance = isConsultant
    ? nextStatus !== null
    : isHead && currentStatus === 'pending'

  const qs = [
    'full_name=' + encodeURIComponent(application.full_name),
    'email=' + encodeURIComponent(application.email),
    'contact_number=' + encodeURIComponent(application.contact_number),
    'year_level=' + encodeURIComponent(application.year_level),
    'course_section=' + encodeURIComponent(application.course_section),
  ].join('&')
  const addMemberUrl = '/dashboard/members/new?' + qs

  async function updateStatus(newStatus: string) {
    setLoading(newStatus)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('member_applications')
      .update({
        status: newStatus,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', application.id)
    if (err) {
      setError('Failed to update status. Please try again.')
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  async function saveNotes() {
    setLoading('notes')
    setError(null)
    const { error: err } = await supabase
      .from('member_applications')
      .update({ notes })
      .eq('id', application.id)
    if (err) {
      setError('Failed to save notes.')
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#dc2626',
          fontFamily: 'DM Sans',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#f9fafb',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 10,
        padding: '16px 20px',
      }}>

        {isTerminal && (
          <div>
            <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#666', margin: 0 }}>
              This application is <strong>{currentStatus}</strong>. No further stage actions available.
            </p>
            {currentStatus === 'approved' && isConsultant && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => { window.location.href = addMemberUrl }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#111',
                    color: '#fff',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={14} />
                  Create Member Account
                </button>
              </div>
            )}
          </div>
        )}

        {!isTerminal && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

            {canAdvance && nextStatus && (
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={loading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: stageBg[currentStatus] ?? '#111',
                  color: '#fff',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  opacity: loading !== null ? 0.7 : 1,
                }}
              >
                {loading === nextStatus ? <Loader size={14} /> : <ArrowRight size={14} />}
                {stageLabel[currentStatus]}
              </button>
            )}

            {isConsultant && (
              <button
                onClick={() => updateStatus('rejected')}
                disabled={loading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: 8,
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  opacity: loading !== null ? 0.7 : 1,
                }}
              >
                {loading === 'rejected' ? <Loader size={14} /> : <XCircle size={14} />}
                Reject
              </button>
            )}

            {isConsultant && (
              <button
                onClick={() => updateStatus('withdrawn')}
                disabled={loading !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: 8,
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                  opacity: loading !== null ? 0.7 : 1,
                }}
              >
                {loading === 'withdrawn' && <Loader size={14} />}
                Mark as Withdrawn
              </button>
            )}

          </div>
        )}
      </div>

      {(isConsultant || isHead) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="obra-label">
            {isConsultant ? 'Notes & Remarks' : 'Add Notes (visible to Consultant)'}
          </label>
          <textarea
            className="obra-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Add evaluation notes, interview observations, or remarks..."
            style={{ resize: 'vertical', minHeight: 100 }}
          />
          <button
            onClick={saveNotes}
            disabled={loading !== null}
            className="btn-secondary"
            style={{ alignSelf: 'flex-start', opacity: loading !== null ? 0.7 : 1 }}
          >
            {loading === 'notes' ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      )}

    </div>
  )
}