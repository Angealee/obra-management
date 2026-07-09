import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AcademicYear } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import { Pill } from '@/components/ui/StatusBadge'
import { CalendarRange } from 'lucide-react'

export default async function AcademicYearsPage() {
  const { profile } = await requireProfile()

  // Only consultants can access this page
  if (profile.system_role !== 'consultant') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Fetch all academic years, newest first
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('*')
    .order('is_active', { ascending: false })   // active year always first
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false }) as { data: AcademicYear[] | null }

  const dateRange = (ay: AcademicYear, style: 'short' | 'long') =>
    `${new Date(ay.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: style, day: 'numeric' })}`

  return (
    <div className="page-enter">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Academic Years</h1>
          <p className="page-subtitle">
            Each year keeps its own roster, events, and duties.
          </p>
        </div>
        <Link href="/dashboard/academic-years/new" className="btn-primary">
          + Add Academic Year
        </Link>
      </div>

      {/* Table */}
      {!academicYears || academicYears.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No academic years yet"
          description="Create one — e.g. “A.Y. 2026–2027” — then set it active."
          action={{ label: '+ Add your first academic year', href: '/dashboard/academic-years/new' }}
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div
            className="md:hidden"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}
          >
            {academicYears.map((ay, i) => (
              <Link
                key={ay.id}
                href={`/dashboard/academic-years/${ay.id}`}
                className="block hover:bg-gray-50/60 transition-colors"
                style={{ padding: '13px 16px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111', margin: 0 }}>{ay.label}</p>
                  <Pill label={ay.is_active ? 'Active' : 'Inactive'} bg={ay.is_active ? '#f0fdf4' : '#f3f4f6'} color={ay.is_active ? '#16a34a' : '#6b7280'} />
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0' }}>
                  {new Date(ay.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(ay.end_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop: Table */}
          <div
            className="hidden md:block"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Label', 'Start Date', 'End Date', 'Status', 'Actions'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '11px 20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {academicYears.map((ay, i) => (
                  <tr
                    key={ay.id}
                    className="hover:bg-gray-50/60 transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                  >
                    <td style={{ padding: '13px 20px', fontWeight: 500, color: '#111' }}>{ay.label}</td>
                    <td style={{ padding: '13px 20px', color: '#555', fontSize: '13px' }}>
                      {new Date(ay.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#555', fontSize: '13px' }}>
                      {new Date(ay.end_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <Pill label={ay.is_active ? 'Active' : 'Inactive'} bg={ay.is_active ? '#f0fdf4' : '#f3f4f6'} color={ay.is_active ? '#16a34a' : '#6b7280'} />
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <Link
                        href={`/dashboard/academic-years/${ay.id}`}
                        style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}
                        className="hover:text-gray-700 transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
