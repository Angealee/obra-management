'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MemberMultiSelect, { type MemberWithSkills } from '@/components/MemberMultiSelect'

// Inline duty assignment on the event detail page — the event is implicit, so
// this is just: pick members (already-assigned ones disabled), set details,
// go. Submits to the same /api/duties/create route as the standalone form
// (title/duty_type derived server-side, push notifications sent in-process).
export default function AssignDutiesPanel({
  eventId,
  alreadyAssignedIds,
}: {
  eventId: string
  alreadyAssignedIds: string[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberWithSkills[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const disabledIds = new Set(alreadyAssignedIds)

  // Members load lazily on first expand — closed panels cost nothing.
  async function toggleOpen() {
    const next = !open
    setOpen(next)
    setError('')
    if (next && members === null) {
      const { data } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_skills (
            member_skills ( name )
          )
        `)
        .eq('is_active', true)
        .neq('system_role', 'consultant')
        .order('full_name')
      setMembers((data ?? []) as MemberWithSkills[])
    }
  }

  function toggleMember(id: string) {
    if (disabledIds.has(id)) return
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    if (selected.length === 0) return setError('Select at least one member.')

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/duties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          memberIds: selected,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to assign duties.')
        setLoading(false)
        return
      }
    } catch {
      setError('Network error — duties not assigned.')
      setLoading(false)
      return
    }

    // Server re-render brings in the new duty rows + updated already-assigned
    // set; reset the form and fold the panel away.
    setSelected([])
    setDescription('')
    setPriority('normal')
    setDueDate('')
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ marginBottom: open ? 16 : 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={toggleOpen}
          className={open ? 'btn-secondary' : 'btn-primary'}
          style={{ fontSize: '12.5px', padding: '6px 14px' }}
        >
          {open ? 'Close' : '+ Assign duties'}
        </button>
      </div>

      {open && (
        <div
          className="panel-reveal"
          style={{
            marginTop: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            padding: 16,
            background: '#FCFCFB',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {members === null ? (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Loading members…</p>
          ) : (
            <MemberMultiSelect
              members={members}
              selectedIds={selected}
              disabledIds={disabledIds}
              onToggle={toggleMember}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <label className="obra-label">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional instructions or context..."
              rows={2}
              className="obra-input"
              style={{ resize: 'none' }}
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? 'Assigning…' : `Assign${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
            <button onClick={toggleOpen} disabled={loading} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
