import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AcademicYear, Profile } from '@/types/database'
import EmptyState from '@/components/EmptyState'
import { CalendarRange } from 'lucide-react'

export default async function AcademicYearsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Only consultants can access this page
  if (!profile || profile.system_role !== 'consultant') {
    redirect('/dashboard')
  }

  // Fetch all academic years, newest first
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('*')
    .order('is_active', { ascending: false })   // active year always first
    .order('start_date', { ascending: false }) 
    .order('created_at', { ascending: false }) as { data: AcademicYear[] | null }

  return (
    <div className="page-enter">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Academic Years</h1>
          <p className="page-subtitle">
            Each year keeps its own roster, events, and duties. The active year is what new records attach to.
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
          title="No academic years set up yet"
          description="Create your first academic year — for example “A.Y. 2026–2027” — then set it active so members, events, and duties have a year to attach to."
          action={{ label: '+ Add your first academic year', href: '/dashboard/academic-years/new' }}
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="md:hidden bg-white rounded-xl border border-black/[0.06] overflow-hidden">
            {academicYears.map((ay) => (
              <Link
                key={ay.id}
                href={`/dashboard/academic-years/${ay.id}`}
                className="block px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-800 text-sm">{ay.label}</p>
                  {ay.is_active ? (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {new Date(ay.start_date).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                  {' – '}
                  {new Date(ay.end_date).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white rounded-xl border border-black/[0.06] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Label</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Start Date</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">End Date</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{ay.label}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(ay.start_date).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(ay.end_date).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {ay.is_active ? (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/academic-years/${ay.id}`}
                        className="text-gray-600 hover:text-gray-900 underline text-xs"
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