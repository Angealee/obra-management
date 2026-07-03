import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import { BarChart2, CalendarDays, ChevronRight, UserCheck } from 'lucide-react'
import MemberReportPicker from './MemberReportPicker'

// Reports hub — consultant + creative heads. Each report is scoped to the
// viewing year (year picker in the top bar) and offers print + CSV output.
export default async function ReportsPage() {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()

  // Members of the viewing year for the accomplishment-report picker.
  let members: { id: string; full_name: string }[] = []
  if (viewYearId) {
    const { data } = await supabase
      .from('academic_year_members')
      .select('profiles!inner ( id, full_name, system_role )')
      .eq('academic_year_id', viewYearId)
      .neq('profiles.system_role', 'consultant')
    members = ((data as any[]) ?? [])
      .map(r => ({ id: r.profiles.id, full_name: r.profiles.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">
          {viewYear
            ? <>Printable summaries and CSV exports for <strong>{viewYear.label}</strong>.</>
            : 'Create an academic year first — reports are scoped to a year.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>

        <Link href="/dashboard/reports/workload" className="dash-card lift-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart2 size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Workload Summary</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>
              One row per member: duties, reviews, and outcome marks for the whole year.
            </p>
          </div>
          <ChevronRight size={16} style={{ color: '#bbb', flexShrink: 0 }} />
        </Link>

        <Link href="/dashboard/reports/events" className="dash-card lift-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Events Summary</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>
              Every event of the year with its duty counts and member participation.
            </p>
          </div>
          <ChevronRight size={16} style={{ color: '#bbb', flexShrink: 0 }} />
        </Link>

        <div className="dash-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', flexWrap: 'wrap' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={17} />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0 }}>Member Accomplishment Report</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>
              One member&apos;s reviewed duties and outcomes — portfolio / certificate ready.
            </p>
          </div>
          <MemberReportPicker members={members} />
        </div>

      </div>
    </div>
  )
}
