import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyEventCreated } from '@/lib/notifyEvents'

// Create an event AND notify the year's roster in one server round trip.
//
// The insert runs with the CALLER's session client (RLS + audit trigger behave
// exactly like the old client-side insert). The duplicate-title guard moved
// here from the form so it can't be skipped. Push is scheduled with `after()`
// so delivery doesn't depend on the creator's browser.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const title = String(body?.title ?? '').trim()
    const description = String(body?.description ?? '').trim()
    const eventDate = String(body?.eventDate ?? '')
    const eventTime = String(body?.eventTime ?? '')
    const location = String(body?.location ?? '').trim()
    const academicYearId = String(body?.academicYearId ?? '')

    if (!title) return NextResponse.json({ error: 'Event title is required.' }, { status: 400 })
    if (!eventDate) return NextResponse.json({ error: 'Event date is required.' }, { status: 400 })
    if (!academicYearId) return NextResponse.json({ error: 'Please select an academic year.' }, { status: 400 })

    // Guard against duplicate events: same title + date within the same year.
    const { data: dup } = await supabase
      .from('events')
      .select('id')
      .eq('academic_year_id', academicYearId)
      .eq('event_date', eventDate)
      .ilike('title', title)
      .maybeSingle()
    if (dup) {
      return NextResponse.json(
        { error: 'An event with this title already exists on this date for this academic year.' },
        { status: 409 },
      )
    }

    const { data: created, error: insertError } = await supabase
      .from('events')
      .insert({
        title,
        description: description || null,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        academic_year_id: academicYearId,
        status: 'upcoming',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create event.' }, { status: 400 })
    }

    after(() => notifyEventCreated(created.id, user.id))

    return NextResponse.json({ success: true, id: created.id })
  } catch (err) {
    console.error('Event create route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
