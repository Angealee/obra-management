'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ObraEvent } from '@/types/database'
import MemberMultiSelect, { type MemberWithSkills } from '@/components/MemberMultiSelect'

// Standalone event-agnostic Assign Duty form (dashboard quick action + hub
// header). Assigning for a specific event is also available inline on the
// event's own page (AssignDutiesPanel). Only heads reach this page, so all
// exits target the hub's All Duties tab.
const HUB_DUTIES = '/dashboard/events?tab=duties'

export default function NewDutyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedEvent = searchParams.get('event')
  const supabase = createClient()

  // Form state — title & duty_type are auto-derived at submit; no checklist.
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [eventId, setEventId] = useState(preselectedEvent ?? '')
  const [assignedTo, setAssignedTo] = useState<string[]>([])

  // Members already assigned a duty for the currently-selected event.
  const [alreadyAssigned, setAlreadyAssigned] = useState<Set<string>>(new Set())

  // Data
  const [events, setEvents] = useState<ObraEvent[]>([])
  const [members, setMembers] = useState<MemberWithSkills[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: evts }, { data: mems }] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .in('status', ['upcoming', 'ongoing'])
          .order('event_date', { ascending: false }),
        supabase
          .from('profiles')
          .select(`
            *,
            profile_skills (
              member_skills ( name )
            )
          `)
          .eq('is_active', true)
          .neq('system_role', 'consultant')
          .order('full_name'),
      ])
      if (evts) setEvents(evts)
      if (mems) setMembers(mems as MemberWithSkills[])
    }
    load()
  }, [])

  // When the selected event changes, load who's already assigned for it so we
  // can flag those members as non-selectable (avoid duplicate assignments).
  useEffect(() => {
    if (!eventId) { setAlreadyAssigned(new Set()); return }
    let cancelled = false
    async function loadAssigned() {
      const { data } = await supabase
        .from('duties')
        .select('assigned_to')
        .eq('event_id', eventId)
      if (cancelled) return
      const ids = new Set<string>((data ?? []).map((d: any) => d.assigned_to).filter(Boolean))
      setAlreadyAssigned(ids)
      // Drop any selection that's now already-assigned for this event.
      setAssignedTo(prev => prev.filter(id => !ids.has(id)))
    }
    loadAssigned()
    return () => { cancelled = true }
  }, [eventId])

  function toggleMember(id: string) {
    if (alreadyAssigned.has(id)) return
    setAssignedTo(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (!eventId)                return setError('Please select an event.')
    if (assignedTo.length === 0) return setError('Please select at least one member.')

    setLoading(true)
    setError('')

    // Server route: creates one duty per member under this user's RLS (title +
    // duty_type derived server-side from the event and each member's creative
    // role) AND pushes to each assignee in-process — delivery no longer
    // depends on this browser staying open.
    try {
      const res = await fetch('/api/duties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          memberIds: assignedTo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to assign duties.'); setLoading(false); return }
    } catch {
      setError('Network error — duties not assigned.')
      setLoading(false)
      return
    }

    router.push(HUB_DUTIES)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={HUB_DUTIES} style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
          ← Back to Duties &amp; Events
        </Link>
        <h1 className="page-title">Assign Duty</h1>
        <p className="page-subtitle">
          Duty title and type are set automatically from each member’s creative role.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Event Selection */}
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 12 }}>Event</p>
          <label className="obra-label">
            Select Event <span style={{ color: '#CC0000' }}>*</span>
          </label>
          <select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className="obra-input"
          >
            <option value="">Choose an event...</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title} — {new Date(ev.event_date).toLocaleDateString('en-PH', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </option>
            ))}
          </select>
        </div>

        {/* Member Selection */}
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 4 }}>Assign To</p>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
            {eventId
              ? 'Members already assigned for this event are disabled.'
              : 'Select an event first.'}
          </p>
          <MemberMultiSelect
            members={members}
            selectedIds={assignedTo}
            disabledIds={alreadyAssigned}
            onToggle={toggleMember}
          />
        </div>

        {/* Duty Details */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="section-label">Duty Details</p>

          <div>
            <label className="obra-label">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional instructions or context..."
              rows={3}
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
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Assigning...' : 'Assign Duty'}
          </button>
          <Link href={HUB_DUTIES} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
