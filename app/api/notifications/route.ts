import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendPushToProfiles, type PushPayload } from '@/lib/push'

// Push-notification trigger endpoint. The client only reports THAT something
// happened ({ type, id }); this route re-fetches the record with the service
// role, verifies the caller was allowed to cause that event, and builds the
// notification text from database truth — a client can never forge content
// or notify arbitrary people. All sends are best-effort.

const WORKLOAD_LABEL: Record<string, string> = {
  completed: 'Completed',
  late: 'Late',
  did_not_duty: 'Did Not Duty',
}

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await serverSupabase
      .from('profiles')
      .select('system_role, full_name')
      .eq('id', user.id)
      .single()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = caller.system_role === 'consultant' || caller.system_role === 'creative_head'

    // Modest per-user throttle — notifications ride on real mutations, which
    // don't happen 30×/minute legitimately.
    const limit = await checkRateLimit(`notify:${user.id}`, 30, 60)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many notification requests.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')
    const admin = createAdminClient()

    // ── TEST (temporary — remove after push is proven in production) ──
    if (type === 'test') {
      // Small delay so the tester can background/close the app first and
      // prove delivery does not depend on the page being open.
      await new Promise(r => setTimeout(r, 4000))
      const result = await sendPushToProfiles([user.id], 'test', {
        title: '✅ Obra push is working',
        body: 'This test notification was delivered by the push service — even with the app closed.',
        url: '/dashboard/profile',
        tag: 'obra-test',
      })
      return NextResponse.json(result)
    }

    if (type === 'announcement') {
      const id = String(body?.id ?? '')
      const { data: a } = await admin
        .from('announcements')
        .select('id, title, visibility, posted_by')
        .eq('id', id)
        .single()
      if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      if (a.posted_by !== user.id && caller.system_role !== 'consultant') {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      }

      let audience = admin.from('profiles').select('id').eq('is_active', true)
      if (a.visibility === 'creative_heads') audience = audience.eq('system_role', 'creative_head')
      else if (a.visibility === 'members') audience = audience.eq('system_role', 'member')
      else audience = audience.in('system_role', ['creative_head', 'member'])
      const { data: recipients } = await audience.neq('id', a.posted_by)

      const result = await sendPushToProfiles(
        (recipients ?? []).map(r => r.id),
        'announcements',
        {
          title: '📣 New announcement',
          body: a.title,
          url: `/dashboard/announcements/${a.id}`,
          tag: `announcement-${a.id}`,
        },
      )
      return NextResponse.json(result)
    }

    if (type === 'duty_assigned') {
      const id = String(body?.id ?? '')
      const { data: d } = await admin
        .from('duties')
        .select('id, title, assigned_to, assigned_by, events ( title )')
        .eq('id', id)
        .single()
      if (!d) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      if (d.assigned_by !== user.id && caller.system_role !== 'consultant') {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      }
      if (!d.assigned_to) return NextResponse.json({ sent: 0 })

      const eventTitle = (d as any).events?.title
      const result = await sendPushToProfiles([d.assigned_to], 'duties', {
        title: '📋 New duty assigned',
        body: `${d.title}${eventTitle ? ` — ${eventTitle}` : ''}`,
        url: `/dashboard/duties/${d.id}`,
        tag: `duty-${d.id}`,
      })
      return NextResponse.json(result)
    }

    if (type === 'event_created') {
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      const id = String(body?.id ?? '')
      const { data: ev } = await admin
        .from('events')
        .select('id, title, event_date, academic_year_id')
        .eq('id', id)
        .single()
      if (!ev) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

      // Whole roster of the event's academic year, minus the creator.
      const { data: roster } = await admin
        .from('academic_year_members')
        .select('profile_id, profiles!inner ( is_active )')
        .eq('academic_year_id', ev.academic_year_id)
        .eq('profiles.is_active', true)
      const recipients = (roster ?? []).map(r => r.profile_id).filter(pid => pid !== user.id)

      const when = new Date(ev.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
      const result = await sendPushToProfiles(recipients, 'events', {
        title: '📅 New event',
        body: `${ev.title} · ${when}`,
        url: `/dashboard/events/${ev.id}`,
        tag: `event-${ev.id}`,
      })
      return NextResponse.json(result)
    }

    if (type === 'workload_marked') {
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 100) : []
      if (entries.length === 0) return NextResponse.json({ sent: 0 })

      const memberIds = [...new Set(entries.map((e: any) => String(e.memberId)))]
      const eventIds = [...new Set(entries.map((e: any) => String(e.eventId)))]

      // Verify against the database: only marks that really exist AND were
      // recorded by this caller produce notifications.
      const [{ data: marks }, { data: events }] = await Promise.all([
        admin
          .from('workload_marks')
          .select('member_id, event_id, mark')
          .eq('marked_by', user.id)
          .in('member_id', memberIds)
          .in('event_id', eventIds),
        admin.from('events').select('id, title').in('id', eventIds),
      ])
      const eventTitle = new Map((events ?? []).map(e => [e.id, e.title]))

      let sent = 0
      for (const m of marks ?? []) {
        const label = WORKLOAD_LABEL[m.mark] ?? m.mark
        const payload: PushPayload = {
          title: '⭐ Duty outcome recorded',
          body: `Your duty for ${eventTitle.get(m.event_id) ?? 'an event'} was marked: ${label}`,
          url: `/dashboard/workloads?member=${m.member_id}&event=${m.event_id}`,
          tag: `mark-${m.member_id}-${m.event_id}`,
        }
        const r = await sendPushToProfiles([m.member_id], 'workload', payload)
        sent += r.sent
      }
      return NextResponse.json({ sent })
    }

    return NextResponse.json({ error: 'Unknown notification type.' }, { status: 400 })
  } catch (err) {
    console.error('Notification route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
