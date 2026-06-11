'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkloadCell from './WorkLoadCell'
import {
  Users, CalendarDays, ListChecks, CheckCircle2, Scale, Search,
  ArrowUpAZ, ArrowDownAZ, ArrowUp10, ArrowDown10, ChevronDown, ChevronUp, Loader2,
  type LucideIcon,
} from 'lucide-react'

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

type SortOption = 'alpha' | 'alpha_desc' | 'most' | 'least'

const SORT_OPTIONS: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: 'alpha',      label: 'A–Z',   icon: ArrowUpAZ },
  { value: 'alpha_desc', label: 'Z–A',   icon: ArrowDownAZ },
  { value: 'most',       label: 'Most',  icon: ArrowDown10 },
  { value: 'least',      label: 'Least', icon: ArrowUp10 },
]

const EVENT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  upcoming:  { bg: '#eff6ff', color: '#3b82f6' },
  ongoing:   { bg: '#fefce8', color: '#ca8a04' },
  completed: { bg: '#f0fdf4', color: '#16a34a' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width: 52, height: 5, borderRadius: 99, background: '#F1F1EF', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 99,
        background: value === 0 ? '#e9e9e7' : '#3b82f6',
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function SkillTag({ name }: { name: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 500, color: '#888', background: '#F7F7F5',
      padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div className="dash-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: `${accent}1a`, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} strokeWidth={2.25} />
      </div>
      <div>
        <p className="section-label">{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#111', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function WorkloadMatrix({
  members,
  events,
  matrix,
  initialMarksMap,
  canManage,
}: {
  members: Member[]
  events: Event[]
  matrix: Record<string, Record<string, DutyCell[]>>
  initialMarksMap: Record<string, MarkRecord>
  canManage: boolean
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

  const [search, setSearch] = useState('')
  const [dutyTypeFilter, setDutyTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('alpha')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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

  function toggleExpanded(memberId: string) {
    setExpanded(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  // ── Derived data ──────────────────────────────────────────
  function getMemberSkills(member: Member): string[] {
    return (member.profile_skills?.map(ps => ps.member_skills?.name).filter(Boolean) as string[]) ?? []
  }

  // Duties for a member, excluding events marked "did not duty"
  // Per-member workload counts, excluding events marked "did not duty".
  // An event counts toward the total if it has assigned duty record(s), or — when no
  // duty record exists — if it carries a "completed"/"late" mark on its own.
  function getMemberCounts(memberId: string): { total: number; reviewed: number; pendingCount: number } {
    let total = 0
    let reviewed = 0
    let pendingCount = 0
    for (const event of events) {
      const mark = getDisplayMark(memberId, event.id)
      if (mark === 'did_not_duty') continue
      const cellDuties = matrix[memberId]?.[event.id] ?? []
      if (cellDuties.length > 0) {
        total += cellDuties.length
        reviewed += cellDuties.filter(d => d.status === 'reviewed').length
        pendingCount += cellDuties.filter(d => d.status === 'pending').length
      } else if (mark === 'completed' || mark === 'late') {
        total += 1
      }
    }
    return { total, reviewed, pendingCount }
  }

  const dutyTypeOptions = useMemo(
    () => Array.from(new Set(members.flatMap(getMemberSkills))).sort(),
    [members]
  )

  const memberStats = useMemo(() => {
    const stats: Record<string, { total: number; reviewed: number; pendingCount: number }> = {}
    for (const m of members) {
      stats[m.id] = getMemberCounts(m.id)
    }
    return stats
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, events, matrix, marksMap, pending])

  const visibleMembers = useMemo(() => {
    let list = members.filter(m => {
      if (search.trim() && !m.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (dutyTypeFilter !== 'all' && !getMemberSkills(m).includes(dutyTypeFilter)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'alpha_desc': return b.full_name.localeCompare(a.full_name)
        case 'most':       return memberStats[b.id].total - memberStats[a.id].total || a.full_name.localeCompare(b.full_name)
        case 'least':      return memberStats[a.id].total - memberStats[b.id].total || a.full_name.localeCompare(b.full_name)
        default:           return a.full_name.localeCompare(b.full_name)
      }
    })
    return list
  }, [members, search, dutyTypeFilter, sortBy, memberStats])

  const totals = members.map(m => memberStats[m.id].total)
  const overallTotal = totals.reduce((s, t) => s + t, 0)
  const overallReviewed = members.reduce((s, m) => s + memberStats[m.id].reviewed, 0)
  const overallPending = members.reduce((s, m) => s + memberStats[m.id].pendingCount, 0)
  const maxTotal = Math.max(1, ...totals)
  const minTotal = totals.length ? Math.min(...totals) : 0
  const avgTotal = totals.length ? overallTotal / totals.length : 0
  const noDutyCount = totals.filter(t => t === 0).length
  const completionRate = overallTotal > 0 ? Math.round((overallReviewed / overallTotal) * 100) : 0

  return (
    <div className="flex flex-col gap-4">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Members" value={members.length} accent="#3b82f6" />
        <StatCard icon={CalendarDays} label="Events" value={events.length} accent="#7c3aed" />
        <StatCard icon={ListChecks} label="Total Duties" value={overallTotal} accent="#0891b2" />
        <StatCard
          icon={CheckCircle2}
          label="Reviewed"
          value={overallReviewed}
          sub={overallTotal > 0 ? `${completionRate}% complete` : undefined}
          accent="#16a34a"
        />
        <StatCard
          icon={Scale}
          label="Avg Workload"
          value={avgTotal.toFixed(1)}
          sub={`min ${minTotal} · max ${maxTotal}`}
          accent="#ca8a04"
        />
      </div>

      {/* Toolbar */}
      <div className="dash-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb' }} />
            <input
              className="obra-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Duty type filter */}
          {dutyTypeOptions.length > 0 && (
            <select
              className="obra-input"
              style={{ width: 'auto', minWidth: 150, flex: '0 0 auto' }}
              value={dutyTypeFilter}
              onChange={e => setDutyTypeFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {dutyTypeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {/* Sort control */}
          <div style={{ display: 'flex', gap: 3, background: '#F7F7F5', borderRadius: 9, padding: 3, flexShrink: 0 }}>
            {SORT_OPTIONS.map(opt => {
              const active = sortBy === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, border: 'none',
                    background: active ? '#111' : 'transparent',
                    color: active ? '#fff' : '#888',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <span className="section-label">Legend</span>
          {[
            { bg: '#16a34a', label: 'Completed', icon: '✓' },
            { bg: '#ca8a04', label: 'Late', icon: '!' },
            { bg: '#CC0000', label: 'Did Not Duty', icon: '✗' },
          ].map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: item.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {item.icon}
              </span>
              {item.label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: '#FCFCFB', border: '1px dashed rgba(0,0,0,0.08)' }} />
            Not assigned
          </span>
          {canManage && (
            <span style={{ fontSize: 11.5, color: '#bbb', fontStyle: 'italic', marginLeft: 'auto' }}>
              Click any cell to cycle marks
            </span>
          )}
        </div>
      </div>

      {/* Save bar */}
      {hasPending && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          background: '#111', color: '#fff', borderRadius: 12, padding: '12px 18px',
        }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
              {Object.keys(pending).length} unsaved change{Object.keys(pending).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              disabled={saving}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: '6px 14px', opacity: saving ? 0.5 : 1 }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#fff', color: '#111', border: 'none', borderRadius: 8,
                padding: '7px 18px', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Success / error */}
      {saveSuccess && !hasPending && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, padding: '10px 16px', borderRadius: 10 }}>
          Changes saved successfully.
        </div>
      )}
      {saveError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: '10px 16px', borderRadius: 10 }}>
          {saveError}
        </div>
      )}

      {/* Matrix */}
      {events.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No events found for this academic year.</p>
          <Link href="/dashboard/events/new" className="btn-secondary" style={{ marginTop: 14, display: 'inline-flex' }}>
            Create an event
          </Link>
        </div>
      ) : members.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No active members found.</p>
        </div>
      ) : visibleMembers.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No members match your search or filter.</p>
          <button
            className="btn-secondary"
            style={{ marginTop: 14 }}
            onClick={() => { setSearch(''); setDutyTypeFilter('all') }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: Math.max(700, 260 + events.length * 110) }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <th
                      className="sticky left-0 z-10"
                      style={{
                        background: '#F1F1EF', textAlign: 'left', padding: '14px 20px',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555',
                        borderRight: '1px solid rgba(0,0,0,0.06)', minWidth: 240,
                      }}
                    >
                      Member
                    </th>
                    {events.map(event => {
                      const es = EVENT_STATUS_STYLE[event.status] ?? EVENT_STATUS_STYLE.upcoming
                      return (
                        <th key={event.id} style={{ textAlign: 'center', padding: '12px 8px', minWidth: 104, maxWidth: 120 }}>
                          <Link href={`/dashboard/events/${event.id}`} style={{ textDecoration: 'none' }}>
                            <p style={{
                              fontSize: 11.5, fontWeight: 600, color: '#555', lineHeight: 1.3, margin: 0,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {event.title}
                            </p>
                            <p style={{ fontSize: 10.5, color: '#bbb', margin: '4px 0 0' }}>
                              {new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            </p>
                            <span style={{
                              display: 'inline-block', marginTop: 4, fontSize: 9.5, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 999, background: es.bg, color: es.color, textTransform: 'capitalize',
                            }}>
                              {event.status}
                            </span>
                          </Link>
                        </th>
                      )
                    })}
                    <th style={{
                      textAlign: 'center', padding: '12px 16px', background: '#F1F1EF', minWidth: 100,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555',
                    }}>
                      Workload
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleMembers.map(member => {
                    const { total, reviewed } = memberStats[member.id]
                    const skills = getMemberSkills(member)

                    return (
                      <tr key={member.id} className="group hover:bg-[#FAFAF9]" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', opacity: total === 0 ? 0.6 : 1 }}>
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-[#FAFAF9]" style={{ padding: '12px 20px', borderRight: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.1s ease' }}>
                          <Link href={`/dashboard/members/${member.id}`} className="flex items-center gap-3 group/link">
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700,
                              background: total === 0 ? '#F7F7F5' : '#111',
                              color: total === 0 ? '#bbb' : '#fff',
                            }}>
                              {member.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate group-hover/link:underline" style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>
                                {member.full_name}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 2 }}>
                                <span style={{ fontSize: 11, color: '#bbb' }}>{member.course_section ?? '—'}</span>
                                {skills.slice(0, 2).map(s => <SkillTag key={s} name={s} />)}
                                {skills.length > 2 && <SkillTag name={`+${skills.length - 2}`} />}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {events.map(event => {
                          const cellDuties = matrix[member.id]?.[event.id] ?? []
                          const displayMark = getDisplayMark(member.id, event.id)
                          const isPendingChange = pending[`${member.id}_${event.id}`] !== undefined

                          return (
                            <td key={event.id} style={{ padding: '10px 8px', textAlign: 'center', background: isPendingChange ? '#fffbeb' : undefined }}>
                              <div className="flex justify-center">
                                <WorkloadCell
                                  mark={displayMark}
                                  dutyStatus={cellDuties[0]?.status ?? null}
                                  canEdit={canManage}
                                  onClick={() => handleCellClick(member.id, event.id)}
                                />
                              </div>
                            </td>
                          )
                        })}

                        <td style={{ padding: '10px 16px', textAlign: 'center', background: '#F7F7F5' }}>
                          {total === 0 ? (
                            <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
                                {total}
                                {reviewed > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#16a34a' }}> · {reviewed} done</span>}
                              </p>
                              <MiniBar value={total} max={maxTotal} />
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: '#F1F1EF' }}>
                    <td className="sticky left-0 z-10" style={{
                      background: '#F1F1EF', padding: '12px 20px',
                      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#555',
                      borderRight: '1px solid rgba(0,0,0,0.06)',
                    }}>
                      Duties / Event
                    </td>
                    {events.map(event => (
                      <td key={event.id} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 13, fontWeight: 700, color: '#555' }}>
                        {Object.values(matrix).reduce((c, me) => c + (me[event.id]?.length ?? 0), 0)}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#111', background: '#F1F1EF' }}>
                      {overallTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2">
            {visibleMembers.map(member => {
              const { total, reviewed } = memberStats[member.id]
              const skills = getMemberSkills(member)
              const isOpen = !!expanded[member.id]

              return (
                <div key={member.id} className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleExpanded(member.id)}
                    className="flex items-center gap-3 w-full"
                    style={{ padding: '14px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      background: total === 0 ? '#F7F7F5' : '#111',
                      color: total === 0 ? '#bbb' : '#fff',
                    }}>
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#111', margin: 0 }}>{member.full_name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: '#bbb' }}>{member.course_section ?? '—'}</span>
                        {skills.slice(0, 2).map(s => <SkillTag key={s} name={s} />)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {total === 0 ? (
                        <span style={{ fontSize: 11.5, color: '#ddd' }}>No duties</span>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
                            {total}
                            {reviewed > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#16a34a' }}> · {reviewed} done</span>}
                          </p>
                          <MiniBar value={total} max={maxTotal} />
                        </>
                      )}
                    </div>
                    {isOpen
                      ? <ChevronUp size={16} style={{ color: '#bbb', flexShrink: 0 }} />
                      : <ChevronDown size={16} style={{ color: '#bbb', flexShrink: 0 }} />
                    }
                  </button>

                  {isOpen && (
                    <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" style={{ marginTop: 12 }}>
                        {events.map(event => {
                          const cellDuties = matrix[member.id]?.[event.id] ?? []
                          const displayMark = getDisplayMark(member.id, event.id)

                          return (
                            <div key={event.id} className="flex flex-col items-center gap-1.5">
                              <WorkloadCell
                                mark={displayMark}
                                dutyStatus={cellDuties[0]?.status ?? null}
                                canEdit={canManage}
                                onClick={() => handleCellClick(member.id, event.id)}
                              />
                              <p style={{ fontSize: 9.5, color: '#bbb', textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
                                {event.title.length > 14 ? `${event.title.slice(0, 13)}…` : event.title}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer summary */}
          <div className="dash-card" style={{ padding: '14px 18px' }}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{noDutyCount}</span> member{noDutyCount !== 1 ? 's' : ''} with no duties
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{overallPending}</span> duties pending
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{overallReviewed}</span> of {overallTotal} reviewed
              </p>
              {overallTotal > 0 && (
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>{completionRate}%</span> completion rate
                </p>
              )}
              {visibleMembers.length !== members.length && (
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 0 auto' }}>
                  Showing <span style={{ fontWeight: 600, color: '#555' }}>{visibleMembers.length}</span> of {members.length} members
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
