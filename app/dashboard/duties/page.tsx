import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import PageHeader from '@/components/PageHeader'
import { getAcademicYearContext } from '@/lib/academicYear'
import DutiesBoard, { fetchDutiesBoardData } from './DutiesBoard'

// MY DUTIES — members only. Admins manage duties from the Duties & Events hub;
// the redirect below is the single choke point that retargets every legacy
// admin link (dashboard stat hrefs, overdue strip, push deep links to the
// list) to the hub's All Duties tab, pagination carried along.
export default async function DutiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { user, profile } = await requireProfile()

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  if (isHead) {
    redirect('/dashboard/events?tab=duties' + (page > 1 ? `&dpage=${page}` : ''))
  }

  const supabase = await createClient()
  const { viewYearId } = await getAcademicYearContext()

  const data = await fetchDutiesBoardData(supabase, {
    viewYearId,
    userId: user.id,
    isHead: false,
    page,
  })

  return (
    <div>
      <PageHeader
        title="My Duties"
        subtitle={`${data.counts.pending} pending · ${data.counts.in_progress} in progress · ${data.counts.awaiting_review} awaiting review · ${data.reviewedTotal} reviewed`}
      />

      <div data-tour="my-duties">
        <DutiesBoard
          data={data}
          isHead={false}
          userId={user.id}
          page={page}
          pagerHrefFor={p => '/dashboard/duties' + (p > 1 ? `?page=${p}` : '')}
          empty={{
            title: 'You have no duties yet',
            description: 'Duties assigned to you appear here.',
          }}
        />
      </div>
    </div>
  )
}
