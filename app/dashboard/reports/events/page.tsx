import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import EmptyState from '@/components/EmptyState'
import { CalendarDays } from 'lucide-react'
import { ReportHeader, ReportTable } from '../ReportBits'
import ReportActions from '../ReportActions'

const NONE_UUID = '00000000-0000-0000-0000-000000000000'

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled',
}

// Events summary: every event of the viewing year with duty counts and the
// number of distinct members involved.
export default async function EventsReportPage() {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const yearId = viewYearId ?? NONE_UUID

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, status, location')
    .eq('academic_year_id', yearId)
    .order('event_date', { ascending: true })

  // Duties scoped through the event join — same single-query pattern the
  // dashboard and duties list use.
  const { data: yearDuties } = await supabase
    .from('duties')
    .select('event_id, assigned_to, status, reviewed_by, events!inner(academic_year_id)')
    .eq('events.academic_year_id', yearId)
    .limit(5000)

  type EvStats = { total: number; reviewed: number; members: Set<string> }
  const stats: Record<string, EvStats> = {}
  for (const d of (yearDuties as any[]) ?? []) {
    const s = (stats[d.event_id] ??= { total: 0, reviewed: 0, members: new Set() })
    s.total++
    if (dutyDisplayStatus(d) === 'reviewed') s.reviewed++
    if (d.assigned_to) s.members.add(d.assigned_to)
  }

  const rows = (events ?? []).map(e => {
    const s = stats[e.id] ?? { total: 0, reviewed: 0, members: new Set() }
    return [
      e.title,
      new Date(e.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
      STATUS_LABEL[e.status] ?? e.status,
      e.location ?? '—',
      s.total,
      s.reviewed,
      s.members.size,
    ]
  })

  const headers = ['Event', 'Date', 'Status', 'Location', 'Duties', 'Reviewed', 'Members Involved']

  return (
    <div className="page-enter">
      <ReportActions
        csvFilename={`obra-events-summary-${viewYear?.label?.replace(/[^\w-]+/g, '-') ?? 'no-year'}.csv`}
        csvHeaders={headers}
        csvRows={rows}
      />

      <div className="dash-card" style={{ padding: '26px 28px' }}>
        <ReportHeader
          title="Events Summary"
          yearLabel={viewYear?.label ?? null}
          subtitle="All events of the year with duty counts and participation"
        />

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarDays}
            title="No events for this year"
            description="Events created for this academic year will be summarized here."
          />
        ) : (
          <ReportTable headers={headers} rows={rows} numericFrom={4} />
        )}
      </div>
    </div>
  )
}
