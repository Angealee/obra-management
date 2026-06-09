'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MemberApplication } from '@/types/database'
import { ArrowRight, XCircle, Loader } from 'lucide-react'

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
    pending:     'shortlisted',
    shortlisted: 'interviewed',
    interviewed: 'approved',
  }
  const stageLabel: Record<string, string> = {
    pending:     'Move to Shortlisted',
    shortlisted: 'Move to Interviewed',
    interviewed: 'Mark as Approved',
  }

  const nextStatus = stageFlow[currentStatus] ?? null
  const canAdvance = isConsultant
    ? nextStatus !== null
    : isHead && currentStatus === 'pending'

  const qs = [
    'full_name='      + encodeURIComponent(application.full_name),
    'email='          + encodeURIComponent(application.email),
    'contact_number=' + encodeURIComponent(application.contact_number),
    'year_level='     + encodeURIComponent(application.year_level),
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#dc2626',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Stage actions */}
      <div style={{
        background: '#F7F7F5',
        borderRadius: 10,
        padding: '14px 16px',
      }}>

        {isTerminal && (
          <div>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              color: '#888',
              margin: '0 0 12px',
            }}>
              This application is <strong style={{ color: '#555' }}>{currentStatus}</strong>. No further stage actions available.
            </p>
            {currentStatus === 'approved' && isConsultant && (
              <button
                className="btn-primary"
                onClick={() => { window.location.href = addMemberUrl }}
              >
                Create Member Account →
              </button>
            )}
          </div>
        )}

        {!isTerminal && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

            {canAdvance && nextStatus && (
              <button
                className="btn-primary"
                onClick={() => updateStatus(nextStatus)}
                disabled={loading !== null}
                style={{ opacity: loading !== null ? 0.7 : 1 }}
              >
                {loading === nextStatus
                  ? <Loader size={13} />
                  : <ArrowRight size={13} />
                }
                {stageLabel[currentStatus]}
              </button>
            )}

            {isConsultant && (
              <button
                className="btn-danger"
                onClick={() => updateStatus('rejected')}
                disabled={loading !== null}
                style={{ opacity: loading !== null ? 0.7 : 1 }}
              >
                {loading === 'rejected'
                  ? <Loader size={13} />
                  : <XCircle size={13} />
                }
                Reject
              </button>
            )}

            {isConsultant && (
              <button
                className="btn-secondary"
                onClick={() => updateStatus('withdrawn')}
                disabled={loading !== null}
                style={{ opacity: loading !== null ? 0.7 : 1 }}
              >
                {loading === 'withdrawn' && <Loader size={13} />}
                Mark as Withdrawn
              </button>
            )}

          </div>
        )}
      </div>

      {/* Notes */}
      {(isConsultant || isHead) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          <div>
            <button
              className="btn-secondary"
              onClick={saveNotes}
              disabled={loading !== null}
              style={{ opacity: loading !== null ? 0.7 : 1 }}
            >
              {loading === 'notes' ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}