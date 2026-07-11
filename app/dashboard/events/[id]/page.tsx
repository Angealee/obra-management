import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import EventStatusManager from './EventStatusManager'
import DeleteEventButton from './DeleteEventButton'
import AssignDutiesPanel from './AssignDutiesPanel'
import { dutyTypeLabel } from '@/lib/memberRole'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import { DutyStatusBadge, EventStatusBadge } from '@/components/ui/StatusBadge'
import WorkloadBadge from '@/components/WorkLoadBadge'
import DutyDetailBody, { fetchDutyDetail } from '../../duties/[id]/DutyDetailBody'
import SlideOver from '@/components/SlideOver'
import BackLink from '@/components/BackLink'

const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ duty?: string }>
}) {
  const { id } = await params
  const { duty: dutyParam } = await searchParams
  const { profile } = await requireProfile()
  const supabase = await createClient()

  // Event, its duties, and its outcome marks are all keyed by the route param —
  // independent queries, one parallel round trip.
  const [{ data: event }, { data: duties }, { data: eventMarks }] = await Promise.all([
    supabase
      .from('events')
      .select(`
        *,
        academic_years ( label ),
        profiles ( full_name )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('duties')
      .select(`
        id, title, duty_type, priority, status, reviewed_by, assigned_to,
        assignee:profiles!duties_assigned_to_fkey ( full_name )
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
    // A mark set from the Workload Matrix or the duty's "Mark Outcome" is the
    // real outcome (Completed / Late / Did Not Duty) and takes precedence over
    // the derived duty status — same rule the duties board uses.
    supabase
      .from('workload_marks')
      .select('member_id, mark')
      .eq('event_id', id),
  ])

  if (!event) redirect('/dashboard/events')

  const markByMember: Record<string, string> = {}
  for (const m of eventMarks ?? []) markByMember[m.member_id] = m.mark

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // Duty-outcome summary, derived from the merged display status.
  const dutyList = (duties ?? []) as any[]
  const outcomeCounts = {
    pending:         dutyList.filter(d => dutyDisplayStatus(d) === 'pending').length,
    in_progress:     dutyList.filter(d => dutyDisplayStatus(d) === 'in_progress').length,
    awaiting_review: dutyList.filter(d => dutyDisplayStatus(d) === 'awaiting_review').length,
    reviewed:        dutyList.filter(d => dutyDisplayStatus(d) === 'reviewed').length,
  }
  const alreadyAssignedIds = dutyList.map(d => d.assigned_to).filter(Boolean) as string[]

  // ?duty= slide-over (admins only — members navigate to the full page).
  const dutyDetail = canManage && dutyParam
    ? await fetchDutyDetail(supabase, dutyParam)
    : null

  const detailRows: [string, string][] = [
    ['Date', new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
    ['Time', event.event_time ? event.event_time.slice(0, 5) : '—'],
    ['Location', event.location ?? '—'],
    ['Academic Year', event.academic_years?.label ?? '—'],
    ['Created By', event.profiles?.full_name ?? '—'],
    ['Created', new Date(event.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
  ]

  return (
    <div className="page-narrow" style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <BackLink href="/dashboard/events">Back to Duties &amp; Events</BackLink>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.15, margin: 0 }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {canManage && (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Edit Event
              </Link>
            )}
            <EventStatusBadge status={event.status} />
          </div>
        </div>
        {event.description && (
          <p style={{ fontSize: '13.5px', color: '#555', marginTop: 8, lineHeight: 1.55 }}>{event.description}</p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Event Info */}
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 12 }}>Details</p>
          {detailRows.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
              <span style={{ fontSize: '13.5px', color: '#111', fontWeight: 500, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Duties */}
        <div className="dash-card">
          <div style={{ marginBottom: 4 }}>
            <p className="section-label">Duties</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '4px 0 0' }}>
              {dutyList.length > 0
                ? `${dutyList.length} assigned · ${outcomeCounts.pending} pending · ${outcomeCounts.in_progress} in progress · ${outcomeCounts.awaiting_review} awaiting review · ${outcomeCounts.reviewed} reviewed`
                : 'No duties assigned yet'}
            </p>
          </div>

          {/* Inline assignment — the event is implicit */}
          {canManage && (
            <AssignDutiesPanel eventId={event.id} alreadyAssignedIds={alreadyAssignedIds} />
          )}

          {dutyList.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0 0' }}>
              Duties assigned for this event appear here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dutyList.map(duty => {
                const display = dutyDisplayStatus(duty)
                const mark = duty.assigned_to ? markByMember[duty.assigned_to] ?? null : null
                // Dot follows the outcome mark when present, else the derived status.
                const dotColor = mark
                  ? ({ completed: '#22c55e', late: '#eab308', did_not_duty: '#ef4444' } as Record<string, string>)[mark] ?? '#d1d5db'
                  : ({ reviewed: '#22c55e', awaiting_review: '#eab308', in_progress: '#3b82f6', pending: '#d1d5db' } as Record<string, string>)[display]
                const [pbg, ptc] = priorityStyle[duty.priority] ?? ['#f3f4f6', '#6b7280']
                return (
                  <Link
                    key={duty.id}
                    href={canManage ? `/dashboard/events/${event.id}?duty=${duty.id}` : `/dashboard/duties/${duty.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50/60 transition-colors"
                    style={{
                      padding: '11px 12px', borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.06)', textDecoration: 'none',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
                      <div style={{ minWidth: 0 }}>
                        <p className="truncate" style={{ fontSize: '13.5px', fontWeight: 500, color: '#111', margin: 0 }}>{duty.title}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                          {dutyTypeLabel(duty.duty_type)} · {duty.assignee?.full_name ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-5 sm:pl-0">
                      <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 9px', borderRadius: 99, textTransform: 'capitalize' }}>
                        {duty.priority}
                      </span>
                      {mark ? <WorkloadBadge mark={mark} /> : <DutyStatusBadge display={display} />}
                      <span className="text-gray-300 group-hover:text-gray-500 transition text-xs">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Status Manager */}
        {canManage && (
          <div className="dash-card">
            <p className="section-label" style={{ marginBottom: 4 }}>Update Status</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
              Move this event through its lifecycle.
            </p>
            <EventStatusManager eventId={event.id} currentStatus={event.status} />
          </div>
        )}

        {/* Delete — consultant only */}
        {profile.system_role === 'consultant' && (
          <div className="dash-card" style={{ borderColor: 'rgba(204,0,0,0.15)' }}>
            <p className="section-label" style={{ marginBottom: 4, color: '#CC0000' }}>Danger Zone</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
              Permanently delete this event and all its duties.
            </p>
            <DeleteEventButton eventId={event.id} eventTitle={event.title} />
          </div>
        )}
      </div>

      {/* ── Duty slide-over (?duty=) ── */}
      {canManage && dutyParam && (
        <SlideOver
          closeHref={`/dashboard/events/${event.id}`}
          fullPageHref={dutyDetail ? `/dashboard/duties/${dutyParam}` : undefined}
        >
          {dutyDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px', color: '#111', lineHeight: 1.2, margin: 0 }}>
                  {dutyDetail.duty.title}
                </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  {(() => {
                    const [pbg, ptc] = priorityStyle[dutyDetail.duty.priority] ?? priorityStyle.normal
                    return (
                      <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' }}>
                        {dutyDetail.duty.priority}
                      </span>
                    )
                  })()}
                  <DutyStatusBadge display={dutyDisplayStatus(dutyDetail.duty)} />
                </div>
              </div>
              <DutyDetailBody
                duty={dutyDetail.duty}
                workloadMark={dutyDetail.workloadMark}
                profile={profile}
                isHead
              />
            </div>
          ) : (
            <p style={{ fontSize: '13.5px', color: '#6b7280', margin: 0 }}>
              This duty no longer exists.
            </p>
          )}
        </SlideOver>
      )}
    </div>
  )
}
