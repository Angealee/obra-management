import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AcademicYear, Profile } from '@/types/database'

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
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Academic Years</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage academic years and set the active one.
          </p>
        </div>
        <Link
          href="/dashboard/academic-years/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          + Add Academic Year
        </Link>
      </div>

      {/* Table */}
      {!academicYears || academicYears.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No academic years yet.</p>
          <Link
            href="/dashboard/academic-years/new"
            className="mt-4 inline-block text-sm text-gray-600 underline"
          >
            Create your first academic year
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
      )}
    </div>
  )
}