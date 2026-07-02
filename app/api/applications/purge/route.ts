import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'
import { APPLICATION_RETENTION_DAYS } from '@/lib/privacyPolicy'

// Retention purge for the /join privacy policy: rejected/withdrawn
// applications are deleted one (1) year after the decision. Consultant-only,
// human-triggered from /dashboard/activity, and always in two steps —
// { mode: 'count' } first (how many qualify), then { mode: 'purge' }.
// Each purge is recorded in the activity log.

const PURGEABLE_STATUSES = ['rejected', 'withdrawn']

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.system_role !== 'consultant') {
      return NextResponse.json({ error: 'Only consultants can purge applications.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const mode = body?.mode === 'purge' ? 'purge' : 'count'

    const cutoff = new Date(
      Date.now() - APPLICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    // Decision date = reviewed_at; older rows that were never stamped fall
    // back to created_at so they can't linger forever.
    const admin = createAdminClient()
    const { data: expired, error } = await admin
      .from('member_applications')
      .select('id')
      .in('status', PURGEABLE_STATUSES)
      .or(`reviewed_at.lt.${cutoff},and(reviewed_at.is.null,created_at.lt.${cutoff})`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const ids = (expired ?? []).map(r => r.id)

    if (mode === 'count') {
      return NextResponse.json({ count: ids.length })
    }

    if (ids.length === 0) {
      return NextResponse.json({ purged: 0 })
    }

    const { error: delError } = await admin
      .from('member_applications')
      .delete()
      .in('id', ids)

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    // Service-role write — the audit trigger skips it, so log here.
    await logActivity({
      actorId: user.id,
      action: 'deleted',
      targetTable: 'member_applications',
      details: {
        target_label: `${ids.length} expired application${ids.length !== 1 ? 's' : ''}`,
        purged: ids.length,
        retention_policy: `rejected/withdrawn, ${APPLICATION_RETENTION_DAYS} days after decision`,
      },
    })

    return NextResponse.json({ purged: ids.length })
  } catch (err) {
    console.error('Purge applications error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
