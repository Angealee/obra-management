import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import SetActiveButton from './SetActiveButton'
import type { AcademicYear } from '@/types/database'
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

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link
          href="/dashboard/academic-years"
          className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block"
        >
          ← Back to Academic Years
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{academicYear.label}</h1>
        <p className="text-gray-500 text-sm mt-1">Academic Year Details</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">Label</span>
          <span className="text-sm font-medium text-gray-800">{academicYear.label}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">Start Date</span>
          <span className="text-sm text-gray-800">
            {new Date(academicYear.start_date).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">End Date</span>
          <span className="text-sm text-gray-800">
            {new Date(academicYear.end_date).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-500">Status</span>
          {academicYear.is_active ? (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
              Active
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
              Inactive
            </span>
          )}
        </div>
      </div>

        {/* Edit form */}
        <EditAcademicYearForm academicYear={academicYear} />

      {/* Active button */}
     <div className="mt-6 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-1">
          {academicYear.is_active ? 'Deactivate' : 'Set as Active'}
        </h2>
        <p className="text-gray-400 text-xs mb-4">
          {academicYear.is_active
            ? 'Mark this academic year as inactive if it was set by mistake.'
            : 'Make this the current active academic year for events and duties.'}
        </p>
        <SetActiveButton
          academicYearId={academicYear.id}
          isActive={academicYear.is_active}
        />
      </div>

      {/* warning bago delete */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Danger Zone</h2>
        <p className="text-gray-400 text-xs mb-4">
          Permanently delete this academic year from the system.
        </p>
        <DeleteAcademicYearButton
          academicYearId={academicYear.id}
          isActive={academicYear.is_active}
          label={academicYear.label}
        />
      </div>
    </div>
  )
}