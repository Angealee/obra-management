import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import SetActiveButton from './SetActiveButton'
import type { AcademicYear } from '@/types/database'
import { Pill } from '@/components/ui/StatusBadge'
import DeleteAcademicYearButton from './DeleteAcademicYearButton'
import EditAcademicYearForm from './EditAcademicYearForm'

export default async function AcademicYearDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { profile } = await requireProfile()
  if (profile.system_role !== 'consultant') {
    redirect('/dashboard')
  }

  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('*')
    .eq('id', id)
    .single() as { data: AcademicYear | null }

  if (!academicYear) redirect('/dashboard/academic-years')

  const rows: [string, React.ReactNode][] = [
    ['Label', academicYear.label],
    ['Start Date', new Date(academicYear.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['End Date', new Date(academicYear.end_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Status', <Pill key="s" label={academicYear.is_active ? 'Active' : 'Inactive'} bg={academicYear.is_active ? '#f0fdf4' : '#f3f4f6'} color={academicYear.is_active ? '#16a34a' : '#6b7280'} />],
  ]

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/dashboard/academic-years"
          style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}
        >
          ← Back to Academic Years
        </Link>
        <h1 className="page-title">{academicYear.label}</h1>
        <p className="page-subtitle">Academic year details</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="dash-card">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
              <span style={{ fontSize: '13.5px', color: '#111', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <EditAcademicYearForm academicYear={academicYear} />

        {/* Active button */}
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 4 }}>
            {academicYear.is_active ? 'Deactivate' : 'Set as Active'}
          </p>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
            {academicYear.is_active
              ? 'Mark this academic year as inactive if it was set by mistake.'
              : 'Make this the current active academic year for events and duties.'}
          </p>
          <SetActiveButton academicYearId={academicYear.id} isActive={academicYear.is_active} />
        </div>

        {/* Danger zone */}
        <div className="dash-card" style={{ borderColor: 'rgba(204,0,0,0.15)' }}>
          <p className="section-label" style={{ marginBottom: 4, color: '#CC0000' }}>Danger Zone</p>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
            Permanently delete this academic year from the system.
          </p>
          <DeleteAcademicYearButton
            academicYearId={academicYear.id}
            isActive={academicYear.is_active}
            label={academicYear.label}
          />
        </div>
      </div>
    </div>
  )
}