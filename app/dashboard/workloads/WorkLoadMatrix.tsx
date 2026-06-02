'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkloadCell from './WorkLoadCell'

type Mark = 'completed' | 'late' | 'did_not_duty' | null

type Member = {
  id: string
  full_name: string
  system_role: string
  creative_head_role: string | null
  course_section: string | null
  profile_skills: { member_skills: { name: string } }[]
}

type Event = {
  id: string
  title: string
  event_date: string
  status: string
}

type DutyCell = {
  id: string
  status: string
  duty_type: string
  title: string
}

type MarkRecord = {
  id: string
  mark: string
} | null

export default function WorkloadMatrix({
  members,
  events,
  matrix,
  initialMarksMap,
  canManage,
  totalDuties,
  reviewedDuties,
  pendingDuties,
}: {
  members: Member[]
  events: Event[]
  matrix: Record<string, Record<string, DutyCell[]>>
  initialMarksMap: Record<string, MarkRecord>
  canManage: boolean
  totalDuties: number
  reviewedDuties: number
  pendingDuties: number
}) {
  const router = useRouter()
  const supabase = createClient()

  // Local marks state — key: `memberId_eventId`
  const [marksMap, setMarksMap] = useState<Record<string, MarkRecord>>(initialMarksMap)

  // Pending changes — key: `memberId_eventId`, value: new mark
  const [pending, setPending] = useState<Record<string, Mark>>({})

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const hasPending = Object.keys(pending).length > 0
  const cycle: Mark[] = ['completed', 'late', 'did_not_duty', null]

  function handleCellClick(memberId: string, eventId: string) {
    const key = `${memberId}_${eventId}`
    const currentMark = (pending[key] !== undefined ? pending[key] : marksMap[key]?.mark ?? null) as Mark
    const nextMark = cycle[(cycle.indexOf(currentMark) + 1) % cycle.length]

    setPending(prev => ({ ...prev, [key]: nextMark }))
    setSaveSuccess(false)
  }

  function getDisplayMark(memberId: string, eventId: string): Mark {
    const key = `${memberId}_${eventId}`
    if (pending[key] !== undefined) return pending[key]
    return (marksMap[key]?.mark as Mark) ?? null
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Not authenticated.'); setSaving(false); return }

    const errors: string[] = []

    for (const [key, newMark] of Object.entries(pending)) {
      const [memberId, eventId] = key.split('_')
      const existing = marksMap[key]

      if (newMark === null) {
        // Delete
        if (existing?.id) {
          const { error } = await supabase
            .from('workload_marks')
            .delete()
            .eq('id', existing.id)
          if (error) errors.push(error.message)
          else {
            setMarksMap(prev => { const n = { ...prev }; delete n[key]; return n })
          }
        }
      } else if (existing?.id) {
        // Update
        const { error } = await supabase
          .from('workload_marks')
          .update({ mark: newMark, marked_by: user.id })
          .eq('id', existing.id)
        if (error) errors.push(error.message)
        else {
          setMarksMap(prev => ({ ...prev, [key]: { id: existing.id, mark: newMark } }))
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('workload_marks')
          .insert({ member_id: memberId, event_id: eventId, mark: newMark, marked_by: user.id })
          .select()
          .single()
        if (error) errors.push(error.message)
        else if (data) {
          setMarksMap(prev => ({ ...prev, [key]: { id: data.id, mark: newMark } }))
        }
      }
    }

    if (errors.length > 0) {
      setSaveError(`Some changes failed: ${errors[0]}`)
    } else {
      setPending({})
      setSaveSuccess(true)
      router.refresh()
    }

    setSaving(false)
  }

  function handleDiscard() {
    setPending({})
    setSaveSuccess(false)
    setSaveError('')
  }

  // Sort members: least duties first
  function getMemberTotal(memberId: string) {
    return Object.values(matrix[memberId] ?? {}).flat().length
  }

  function getMemberReviewed(memberId: string) {
    return Object.values(matrix[memberId] ?? {}).flat().filter(d => d.status === 'reviewed').length
  }

  const sortedMembers = [...members].sort((a, b) => getMemberTotal(a.id) - getMemberTotal(b.id))

  const statusColor: Record<string, string> = {
    pending:     'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-yellow-100 text-yellow-700',
    reviewed:    'bg-green-100 text-green-700',
  }

  return (
    <div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Members',  value: members.length,   color: 'text-gray-800' },
          { label: 'Total Events',   value: events.length,    color: 'text-gray-800' },
          { label: 'Total Duties',   value: totalDuties,      color: 'text-gray-800' },
          { label: 'Reviewed',       value: reviewedDuties,   color: 'text-green-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Legend:</span>
        {[
          { color: 'bg-green-500', icon: '✓', label: 'Completed' },
          { color: 'bg-yellow-400', icon: '!', label: 'Late' },
          { color: 'bg-red-500', icon: '✗', label: 'Did Not Duty' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-6 h-6 rounded-lg ${l.color} flex items-center justify-center text-white text-xs font-bold`}>{l.icon}</span>
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-200" />
          <span className="text-xs text-gray-500">Not Assigned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">P</span>
          <span className="text-xs text-gray-500">Pending duty</span>
        </div>
        {canManage && (
          <span className="text-xs text-gray-400 italic">· Click any cell to cycle marks</span>
        )}
      </div>

      {/* Save bar — only shows when there are pending changes */}
      {hasPending && (
        <div className="flex items-center justify-between bg-gray-900 text-white px-5 py-3 rounded-xl mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <p className="text-sm font-medium">
              {Object.keys(pending).length} unsaved change{Object.keys(pending).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-gray-900 px-5 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {saveSuccess && !hasPending && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-5 py-3 rounded-xl mb-4">
          ✓ Changes saved successfully.
        </div>
      )}

      {/* Error message */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-5 py-3 rounded-xl mb-4">
          {saveError}
        </div>
      )}

      {/* Matrix table */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No events found for this academic year.</p>
          <Link href="/dashboard/events/new" className="mt-3 inline-block text-sm text-gray-600 underline">
            Create an event
          </Link>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No active members found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse" style={{ minWidth: `${Math.max(800, 280 + events.length * 130)}px` }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-5 py-4 font-medium text-gray-600 border-r border-gray-100 min-w-64">
                    <div className="flex items-center justify-between">
                      <span>Member</span>
                      <span className="text-xs text-gray-400 font-normal">↑ least active first</span>
                    </div>
                  </th>
                  {events.map(event => (
                    <th key={event.id} className="text-center px-3 py-4 font-medium text-gray-600 min-w-32 max-w-36">
                      <Link href={`/dashboard/events/${event.id}`} className="block hover:text-gray-900 transition">
                        <p className="text-xs leading-tight line-clamp-2 text-center">{event.title}</p>
                        <p className="text-xs text-gray-400 font-normal mt-1">
                          {new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${statusColor[event.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {event.status}
                        </span>
                      </Link>
                    </th>
                  ))}
                  <th className="text-center px-4 py-4 font-medium text-gray-600 bg-gray-50 min-w-20">Total</th>
                </tr>
              </thead>

              <tbody>
                {sortedMembers.map(member => {
                  const total = getMemberTotal(member.id)
                  const reviewed = getMemberReviewed(member.id)
                  const skills = member.profile_skills?.map(ps => ps.member_skills?.name).filter(Boolean) ?? []

                  return (
                    <tr key={member.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${total === 0 ? 'opacity-60' : ''}`}>
                      <td className="sticky left-0 z-10 bg-white px-5 py-3 border-r border-gray-100 hover:bg-gray-50">
                        <Link href={`/dashboard/members/${member.id}`} className="block group">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${total === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white'}`}>
                              {member.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm leading-tight">{member.full_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{member.course_section ?? '—'}</p>
                              {skills.length > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">{skills.join(' · ')}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {events.map(event => {
                        const cellDuties = matrix[member.id]?.[event.id] ?? []
                        const displayMark = getDisplayMark(member.id, event.id)
                        const isPendingChange = pending[`${member.id}_${event.id}`] !== undefined

                        return (
                          <td key={event.id} className={`px-2 py-3 text-center align-middle ${isPendingChange ? 'bg-yellow-50' : ''}`}>
                            <WorkloadCell
                              mark={displayMark}
                              dutyStatus={cellDuties[0]?.status ?? null}
                              canEdit={canManage}
                              onClick={() => handleCellClick(member.id, event.id)}
                            />
                          </td>
                        )
                      })}

                      <td className="px-4 py-3 text-center bg-gray-50">
                        {total === 0 ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-gray-800">{total}</p>
                            {reviewed > 0 && <p className="text-xs text-green-600">{reviewed} done</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-100">
                    Duties per Event
                  </td>
                  {events.map(event => (
                    <td key={event.id} className="text-center px-2 py-3">
                      <span className="text-sm font-bold text-gray-700">
                        {Object.values(matrix).reduce((count, memberEvents) => count + (memberEvents[event.id]?.length ?? 0), 0)}
                      </span>
                    </td>
                  ))}
                  <td className="text-center px-4 py-3 bg-gray-100">
                    <span className="text-sm font-bold text-gray-800">{totalDuties}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-6 flex-wrap">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{sortedMembers.filter(m => getMemberTotal(m.id) === 0).length}</span> members with no duties
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{pendingDuties}</span> duties pending
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{reviewedDuties}</span> of {totalDuties} reviewed
            </p>
            {totalDuties > 0 && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-green-600">{Math.round((reviewedDuties / totalDuties) * 100)}%</span> completion rate
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}