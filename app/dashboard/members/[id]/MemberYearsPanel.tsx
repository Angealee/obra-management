'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

type YearRef = { id: string; label: string; is_active: boolean }

export default function MemberYearsPanel({
  profileId,
  profileMemberRole,
  memberYears,
  allYears,
}: {
  profileId: string
  profileMemberRole: string
  memberYears: YearRef[]
  allYears: YearRef[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [error, setError] = useState('')

  const activeForIds = new Set(memberYears.map(y => y.id))
  const availableYears = allYears.filter(y => !activeForIds.has(y.id))

  async function setActiveFor(yearId: string) {
    if (!yearId) return
    setAdding(true)
    setError('')
    const { error: insErr } = await supabase
      .from('academic_year_members')
      .insert({
        academic_year_id: yearId,
        profile_id: profileId,
        member_role: profileMemberRole || 'none',
        status: 'active',
      })
    setAdding(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setSelectedYear('')
    router.refresh()
  }

  async function removeFrom(yearId: string) {
    setRemovingId(yearId)
    setError('')
    const { error: delErr } = await supabase
      .from('academic_year_members')
      .delete()
      .eq('academic_year_id', yearId)
      .eq('profile_id', profileId)
    setRemovingId(null)
    if (delErr) {
      setError(delErr.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px' }}>
      <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '8px' }}>
        Academic Years
      </p>
      <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '14px' }}>
        The years this member is active for. They only appear in a year&apos;s members list, workloads, and duties while listed here.
      </p>

      {/* Current years */}
      {memberYears.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#bbb', marginBottom: '14px' }}>
          Not active for any academic year yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {memberYears.map(y => (
            <span
              key={y.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '12.5px', fontWeight: 600,
                background: y.is_active ? '#111' : '#f1f5f9',
                color: y.is_active ? '#fff' : '#475569',
                padding: '5px 6px 5px 12px', borderRadius: '99px',
              }}
            >
              {y.label}{y.is_active ? ' · Active' : ''}
              <button
                onClick={() => removeFrom(y.id)}
                disabled={removingId === y.id}
                title="Remove from this year"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%',
                  background: y.is_active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                  color: 'inherit', border: 'none', cursor: 'pointer',
                  opacity: removingId === y.id ? 0.4 : 1,
                }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add to a year */}
      {availableYears.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="obra-input"
            style={{ maxWidth: '260px' }}
          >
            <option value="">Select an academic year…</option>
            {availableYears.map(y => (
              <option key={y.id} value={y.id}>
                {y.label}{y.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => setActiveFor(selectedYear)}
            disabled={!selectedYear || adding}
            className="btn-secondary"
            style={{ opacity: !selectedYear || adding ? 0.5 : 1 }}
          >
            {adding ? 'Adding…' : 'Set active for this year'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', marginTop: '12px' }}>
          <p style={{ fontSize: '13px', color: '#CC0000' }}>{error}</p>
        </div>
      )}
    </div>
  )
}
