import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from './ApplicationsClient'
import { enrichApplications } from './utils'
import { getAcademicYearContext } from '@/lib/academicYear'

export default async function ApplicationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['consultant', 'creative_head'].includes(profile.system_role)) {
    redirect('/dashboard')
  }

  const { viewYearId } = await getAcademicYearContext()

  // Applications for the chosen year, plus legacy/untagged ones.
  let applicationsQuery = supabase
    .from('member_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (viewYearId) {
    applicationsQuery = applicationsQuery.or(
      `academic_year_id.eq.${viewYearId},academic_year_id.is.null`
    )
  }

  const { data: applications } = await applicationsQuery

  const enriched = await enrichApplications(supabase, (applications as any[]) || [])

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Membership Applications</h1>
        <p className="page-subtitle">Review and evaluate applicants for Obra Creative Media Productions.</p>
      </div>

      <ApplicationsClient
        applications={enriched}
        selectedId={null}
        userRole={profile.system_role}
        userId={user.id}
      >
        <div className="dash-card" style={{
          height: '100%',
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#bbb', fontWeight: 500 }}>
              Select an applicant to view details
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#ddd', marginTop: 4 }}>
              Use the list on the left to browse
            </p>
          </div>
        </div>
      </ApplicationsClient>
    </div>
  )
}
