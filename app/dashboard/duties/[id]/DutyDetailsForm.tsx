'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

export default function DutyDetailsForm({
  duty,
  isHead,
}: {
  duty: { id: string; description: string | null; priority: string; due_date: string | null }
  isHead: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(duty.description ?? '')
  const [priority, setPriority] = useState(duty.priority)
  const [dueDate, setDueDate] = useState(duty.due_date ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    const { error: updateError } = await supabase
      .from('duties')
      .update({
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      })
      .eq('id', duty.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setDescription(duty.description ?? '')
    setPriority(duty.priority)
    setDueDate(duty.due_date ?? '')
    setError('')
    setEditing(false)
  }

  // ── Read-only view (members, or heads not editing) ──
  if (!isHead || !editing) {
    const [pbg, ptc] = priorityStyle[duty.priority] ?? priorityStyle.normal
    return (
      <div className="dash-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="section-label">Duty Details</p>
          {isHead && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              Edit
            </button>
          )}
        </div>

        <div>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 4px' }}>Description</p>
          <p style={{ fontSize: '13.5px', color: '#333', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
            {duty.description?.trim()
              ? duty.description
              : <span style={{ color: '#9ca3af' }}>No description</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 12 }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Priority</span>
          <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' }}>
            {duty.priority}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Due Date</span>
          <span style={{ fontSize: '13.5px', color: '#111', fontWeight: 500 }}>
            {duty.due_date
              ? new Date(duty.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </span>
        </div>
      </div>
    )
  }

  // ── Edit view (heads only) ──
  return (
    <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="section-label">Edit Duty Details</p>

      <div>
        <label className="obra-label">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Additional instructions or context..."
          className="obra-input"
          style={{ resize: 'none' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="obra-label">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="obra-input">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="obra-label">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="obra-input" />
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={handleCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  )
}
