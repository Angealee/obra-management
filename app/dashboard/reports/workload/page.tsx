import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import { memberRoleLabel } from '@/lib/memberRole'
import EmptyState from '@/components/EmptyState'
import { BarChart2 } from 'lucide-react'
import { ReportHeader, ReportTable } from '../ReportBits'
import ReportActions from '../ReportActions'

const NONE_UUID = '00000000-0000-0000-0000-000000000000'

// End-of-AY workload summary: one row per member of the viewing year with
// duty totals, review counts, and workload-mark outcomes.
export default async function WorkloadReportPage() {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const yearId = viewYearId ?? NONE_UUID

  const [{ data: roster }, { data: duties }, { data: marks }] = await Promise.all([
    supabase
      .from('academic_year_members')
      .select('profiles!inner ( id, full_name, system_role, creative_head_role, member_role, course_section )')
      .eq('academic_year_id', yearId)
      .neq('profiles.system_role', 'consultant'),
    supabase
      .from('duties')
      .select('assigned_to, status, reviewed_by, events!inner(academic_year_id)')
      .eq('events.academic_year_id', yearId)
      .not('assigned_to', 'is', null)
      .limit(5000),
    supabase
      .from('workload_marks')
      .select('member_id, mark, events!inner(academic_year_id)')
      .eq('events.academic_year_id', yearId),
  ])

  const members = ((roster as any[]) ?? [])
    .map(r => r.profiles)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  type Stats = { total: number; reviewed: number; completed: number; late: number; dnd: number }
  const stats: Record<string, Stats> = {}
  const get = (id: string) => (stats[id] ??= { total: 0, reviewed: 0, completed: 0, late: 0, dnd: 0 })

  for (const d of (duties as any[]) ?? []) {
    const s = get(d.assigned_to)
    s.total++
    if (dutyDisplayStatus(d) === 'reviewed') s.reviewed++
  }
  for (const m of (marks as any[]) ?? []) {
    const s = get(m.member_id)
    if (m.mark === 'completed') s.completed++
    else if (m.mark === 'late') s.late++
    else if (m.mark === 'did_not_duty') s.dnd++
  }

  const roleLabel = (m: any) =>
    m.system_role === 'creative_head'
      ? 'Creative Head'
      : m.member_role && m.member_role !== 'none'
        ? memberRoleLabel(m.member_role)
        : 'Member'

  const rows = members.map(m => {
    const s = stats[m.id] ?? { total: 0, reviewed: 0, completed: 0, late: 0, dnd: 0 }
    const rate = s.total > 0 ? `${Math.round((s.reviewed / s.total) * 100)}%` : '—'
    return [m.full_name, roleLabel(m), m.course_section ?? '—', s.total, s.reviewed, rate, s.completed, s.late, s.dnd]
  })

  // Aggregate footer row.
  const sum = (i: number) => rows.reduce((acc, r) => acc + (typeof r[i] === 'number' ? (r[i] as number) : 0), 0)
  const totalDuties = sum(3)
  const totalReviewed = sum(4)
  const totalsRow = [
    `TOTAL (${members.length} member${members.length !== 1 ? 's' : ''})`, '', '',
    totalDuties, totalReviewed,
    totalDuties > 0 ? `${Math.round((totalReviewed / totalDuties) * 100)}%` : '—',
    sum(6), sum(7), sum(8),
  ]

  const headers = ['Member', 'Role', 'Section', 'Duties', 'Reviewed', 'Completion', 'Completed', 'Late', 'Did Not Duty']

  return (
    <div className="page-enter">
      <ReportActions
        csvFilename={`obra-workload-summary-${viewYear?.label?.replace(/[^\w-]+/g, '-') ?? 'no-year'}.csv`}
        csvHeaders={headers}
        csvRows={[...rows, totalsRow]}
      />

      <div className="dash-card" style={{ padding: '26px 28px' }}>
        <ReportHeader
          title="Workload Summary"
          yearLabel={viewYear?.label ?? null}
          subtitle="Duties, reviews, and outcome marks per member"
        />

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={BarChart2}
            title="No members active for this year"
            description="Add members to the academic year roster and their workload will show up here."
          />
        ) : (
          <>
            <ReportTable headers={headers} rows={[...rows, totalsRow]} numericFrom={3} />
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 14, lineHeight: 1.6 }}>
              Completion = reviewed ÷ assigned.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
