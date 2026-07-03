import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import { memberRoleLabel, dutyTypeLabel } from '@/lib/memberRole'
import EmptyState from '@/components/EmptyState'
import { UserCheck } from 'lucide-react'
import { ReportHeader, ReportTable } from '../../ReportBits'
import ReportActions from '../../ReportActions'

const NONE_UUID = '00000000-0000-0000-0000-000000000000'

// Accomplishment report for one member: their reviewed duties for the viewing
// year plus assignment/outcome totals. Portfolio / certificate ready.
export default async function MemberReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const yearId = viewYearId ?? NONE_UUID

  const [{ data: member }, { data: duties }, { data: marks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, system_role, creative_head_role, member_role, course_section, year_level')
      .eq('id', id)
      .single(),
    supabase
      .from('duties')
      .select('title, duty_type, status, reviewed_by, reviewed_at, events!inner(title, event_date, academic_year_id)')
      .eq('assigned_to', id)
      .eq('events.academic_year_id', yearId)
      .order('created_at', { ascending: true })
      .limit(2000),
    supabase
      .from('workload_marks')
      .select('mark, events!inner(academic_year_id)')
      .eq('member_id', id)
      .eq('events.academic_year_id', yearId),
  ])

  if (!member) notFound()

  const all = ((duties as any[]) ?? [])
  const reviewed = all.filter(d => dutyDisplayStatus(d) === 'reviewed')
  const markCount = (m: string) => ((marks as any[]) ?? []).filter(x => x.mark === m).length
  const completionRate = all.length > 0 ? `${Math.round((reviewed.length / all.length) * 100)}%` : '—'

  const roleLine =
    member.system_role === 'creative_head'
      ? 'Creative Head'
      : member.member_role && member.member_role !== 'none'
        ? memberRoleLabel(member.member_role)
        : 'Member'

  const rows = reviewed.map(d => [
    d.events?.title ?? '—',
    d.events?.event_date
      ? new Date(d.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    d.title,
    dutyTypeLabel(d.duty_type),
    d.reviewed_at
      ? new Date(d.reviewed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
  ])

  const headers = ['Event', 'Event Date', 'Duty', 'Type', 'Reviewed On']

  const summary = [
    { label: 'Duties assigned', value: all.length },
    { label: 'Duties reviewed', value: reviewed.length },
    { label: 'Completion rate', value: completionRate },
    { label: 'Marked completed', value: markCount('completed') },
    { label: 'Marked late', value: markCount('late') },
    { label: 'Did not duty', value: markCount('did_not_duty') },
  ]

  return (
    <div className="page-enter">
      <ReportActions
        csvFilename={`obra-accomplishments-${member.full_name.replace(/[^\w-]+/g, '-')}-${viewYear?.label?.replace(/[^\w-]+/g, '-') ?? 'no-year'}.csv`}
        csvHeaders={headers}
        csvRows={rows}
      />

      <div className="dash-card" style={{ padding: '26px 28px' }}>
        <ReportHeader
          title="Member Accomplishment Report"
          yearLabel={viewYear?.label ?? null}
          subtitle={`${member.full_name} · ${roleLine}${member.course_section ? ` · ${member.course_section}` : ''}${member.year_level ? ` · ${member.year_level}` : ''}`}
        />

        {/* Summary strip */}
        <div className="print-avoid-break grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 1, background: 'rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden', marginBottom: 22 }}>
          {summary.map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10.5, color: '#6b7280', margin: '3px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p className="section-label" style={{ marginBottom: 10 }}>Reviewed Accomplishments</p>
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={UserCheck}
            title="No reviewed duties yet this year"
            description="Duties appear here once a creative head reviews them."
          />
        ) : (
          <ReportTable headers={headers} rows={rows} />
        )}
      </div>
    </div>
  )
}
