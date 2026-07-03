'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ObraEvent, Profile } from '@/types/database'

type MemberWithSkills = Profile & {
  profile_skills: { member_skills: { name: string } }[]
}

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

    router.push('/dashboard/duties')
    router.refresh()
  }

  // Group members by role for display
  const creativeHeads = members.filter(m => m.system_role === 'creative_head')
  const regularMembers = members.filter(m => m.system_role === 'member')

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/duties" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Duties
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Assign Duty</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pick an event and the members handling it. Each member’s duty title and type are set
          automatically from their creative role.
        </p>
      </div>

      <div className="space-y-6">

        {/* Event Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Event</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Event <span className="text-red-500">*</span>
            </label>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
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
        </div>

        {/* Member Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assign To</h2>
            <p className="text-gray-400 text-xs mt-1">
              {eventId
                ? 'Select the members who will handle this duty. Members already assigned for this event are disabled.'
                : 'Select an event first, then choose the members who will handle this duty.'}
            </p>
          </div>

          {members.length === 0 ? (
            <p className="text-gray-400 text-sm">No active members found.</p>
          ) : (
            <div className="space-y-4">

              {/* Creative Heads group */}
              {creativeHeads.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Creative Heads
                  </p>
                  <div className="space-y-2">
                    {creativeHeads.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        selected={assignedTo.includes(member.id)}
                        disabled={alreadyAssigned.has(member.id)}
                        onSelect={() => toggleMember(member.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Members group */}
              {regularMembers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Members
                  </p>
                  <div className="space-y-2">
                    {regularMembers.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        selected={assignedTo.includes(member.id)}
                        disabled={alreadyAssigned.has(member.id)}
                        onSelect={() => toggleMember(member.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Duty Details */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duty Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional instructions or context..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign Duty'}
          </button>
          <Link href="/dashboard/duties" className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Member card component ──
function MemberCard({
  member,
  selected,
  disabled = false,
  onSelect,
}: {
  member: MemberWithSkills
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  const skills = member.profile_skills?.map(ps => ps.member_skills?.name).filter(Boolean) ?? []

  const roleLabels: Record<string, string> = {
    creative_head: 'Creative Head',
    member: 'Member',
  }

  const creativeRoleLabels: Record<string, string> = {
    creative_producer: 'Creative Producer',
    creative_writer: 'Creative Writer',
    creative_director: 'Creative Director',
    none: '',
  }

  const displayRole = member.system_role === 'creative_head' && member.creative_head_role !== 'none'
    ? creativeRoleLabels[member.creative_head_role ?? 'none']
    : roleLabels[member.system_role]

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition ${
        disabled
          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
          : selected
            ? 'border-gray-900 bg-gray-50 cursor-pointer'
            : 'border-gray-100 hover:border-gray-300 bg-white cursor-pointer'
      }`}
    >
      {/* Checkbox circle */}
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
        selected ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
      }`}>
        {selected && (
          <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
            <path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Avatar initial */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {member.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${selected ? 'text-gray-900' : 'text-gray-800'}`}>
            {member.full_name}
          </p>
          {disabled && (
            <span className="bg-gray-200 text-gray-500 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide">
              Already assigned
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{displayRole}</p>

        {/* Skill badges */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skills.map(skill => (
              <span
                key={skill}
                className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
