import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from './ApplicationsClient'
import { enrichApplications } from './utils'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'

// Shared layout for the Applications split view.
//
// The list + filters live here (inside ApplicationsClient) instead of in each
// route's page, so that navigating between the index (empty state) and a
// specific applicant only swaps `children` — the layout, and therefore the
// client component's filter/search/scroll state, is preserved by the App
// Router. This fixes the "filters reset when you open an applicant" bug at the
// root, and means the applicant list is fetched + enriched ONCE per visit
// instead of on every click.
export default async function ApplicationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireProfile()
  if (!['consultant', 'creative_head'].includes(profile.system_role)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
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
  const enriched = await enrichApplications(supabase, (applications as any[]) || [], user.id)

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Membership Applications</h1>
        <p className="page-subtitle">
          Review and evaluate applicants for Obra Creative Media Productions.
        </p>
      </div>

      <ApplicationsClient
        applications={enriched}
        userRole={profile.system_role}
        userId={user.id}
      >
        {children}
      </ApplicationsClient>
    </div>
  )
}
