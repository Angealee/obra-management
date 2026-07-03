import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendPushToProfiles } from '@/lib/push'
import {
  notifyAnnouncementCreated,
  notifyDutyAssigned,
  notifyEventCreated,
  notifyWorkloadMarked,
} from '@/lib/notifyEvents'

// LEGACY push-notification trigger endpoint.
//
// Notifications are now sent in-process by the mutation routes themselves
// (/api/announcements/create, /api/events/create, /api/duties/create,
// /api/workloads/save) via after() + lib/notifyEvents. This route remains for
// two reasons:
//   1. The 'test' type powers the profile card's verification button.
//   2. Users whose installed PWA still runs pre-refactor cached JS keep
//      triggering notifications through here until their app updates.
// Once the fleet is confirmed updated, everything except 'test' can go.
//
// Design (unchanged): the client only reports THAT something happened
// ({ type, id }); permissions are verified against database truth here, and
// lib/notifyEvents rebuilds the payload from the DB — a client can never
// forge content or notify arbitrary people. All sends are best-effort.

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

    // ── TEST (permanent verification tool for the profile card) ──
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
        .select('id, posted_by')
        .eq('id', id)
        .single()
      if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      if (a.posted_by !== user.id && caller.system_role !== 'consultant') {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      }
      await notifyAnnouncementCreated(a.id)
      return NextResponse.json({ success: true })
    }

    if (type === 'duty_assigned') {
      const id = String(body?.id ?? '')
      const { data: d } = await admin
        .from('duties')
        .select('id, assigned_by')
        .eq('id', id)
        .single()
      if (!d) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      if (d.assigned_by !== user.id && caller.system_role !== 'consultant') {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      }
      await notifyDutyAssigned(d.id)
      return NextResponse.json({ success: true })
    }

    if (type === 'event_created') {
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      const id = String(body?.id ?? '')
      const { data: ev } = await admin.from('events').select('id').eq('id', id).single()
      if (!ev) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      await notifyEventCreated(ev.id, user.id)
      return NextResponse.json({ success: true })
    }

    if (type === 'workload_marked') {
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
      const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 100) : []
      if (entries.length === 0) return NextResponse.json({ sent: 0 })
      // notifyWorkloadMarked only sends for mark rows this caller actually
      // wrote, so no further verification is needed here.
      await notifyWorkloadMarked(
        entries.map((e: any) => ({ memberId: String(e.memberId), eventId: String(e.eventId) })),
        user.id,
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown notification type.' }, { status: 400 })
  } catch (err) {
    console.error('Notification route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
