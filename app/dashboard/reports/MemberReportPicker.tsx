'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Member selector for the accomplishment report — navigates to
// /dashboard/reports/member/[id] on Generate.
export default function MemberReportPicker({
  members,
}: {
  members: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <select
        aria-label="Choose a member"
        value={memberId}
        onChange={e => setMemberId(e.target.value)}
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#fff',
          color: '#333',
          cursor: 'pointer',
          maxWidth: 200,
        }}
      >
        <option value="">Choose member…</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.full_name}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn-primary"
        disabled={!memberId}
        style={{ opacity: memberId ? 1 : 0.5 }}
        onClick={() => memberId && router.push(`/dashboard/reports/member/${memberId}`)}
      >
        Generate
      </button>
    </div>
  )
}
