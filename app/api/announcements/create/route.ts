import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyAnnouncementCreated } from '@/lib/notifyEvents'

// Create an announcement AND notify its audience in one server round trip.
//
// The insert runs with the CALLER's session client — RLS decides who may post
// (same as the old client-side insert) and the activity-log trigger still sees
// an authenticated user. The push is scheduled with `after()`, so delivery no
// longer depends on the poster's browser surviving past the mutation (the old
// fire-and-forget /api/notifications hop) and never delays the response.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const title = String(body?.title ?? '').trim()
    const content = String(body?.content ?? '').trim()
    const visibility = String(body?.visibility ?? 'all')
    const academicYearId = body?.academicYearId ? String(body.academicYearId) : null

    if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    if (!content) return NextResponse.json({ error: 'Content is required.' }, { status: 400 })
    if (!['all', 'creative_heads', 'members'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility.' }, { status: 400 })
    }

    const { data: created, error: insertError } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        visibility,
        academic_year_id: academicYearId,
        posted_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create announcement.' }, { status: 400 })
    }

    after(() => notifyAnnouncementCreated(created.id))

    return NextResponse.json({ success: true, id: created.id })
  } catch (err) {
    console.error('Announcement create route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
