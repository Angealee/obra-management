import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToProfiles, type PushPayload } from '@/lib/push'
import { logError } from '@/lib/logger'

// SERVER-ONLY notification builders — one function per domain event.
//
// Each function re-fetches the record with the service role and builds the
// payload from database truth, so callers only pass ids. They are the single
// source of audience + wording, shared by:
//   • the mutation API routes (announcements/events/duties/workloads), which
//     call these inside `after()` so the response is never delayed, and
//   • the legacy /api/notifications trigger route (kept for clients still
//     running cached pre-refactor JS), which adds its own permission checks.
//
// All best-effort: a notification failure must never fail the mutation.

const WORKLOAD_LABEL: Record<string, string> = {
  completed: 'Completed',
  late: 'Late',
  did_not_duty: 'Did Not Duty',
}

/** Announcement created → its visibility audience, minus the poster. */
export async function notifyAnnouncementCreated(announcementId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: a } = await admin
      .from('announcements')
      .select('id, title, visibility, posted_by')
      .eq('id', announcementId)
      .single()
    if (!a) return

    let audience = admin.from('profiles').select('id').eq('is_active', true)
    if (a.visibility === 'creative_heads') audience = audience.eq('system_role', 'creative_head')
    else if (a.visibility === 'members') audience = audience.eq('system_role', 'member')
    else audience = audience.in('system_role', ['creative_head', 'member'])
    const { data: recipients } = await audience.neq('id', a.posted_by)

    await sendPushToProfiles(
      (recipients ?? []).map(r => r.id),
      'announcements',
      {
        title: '📣 New announcement',
        body: a.title,
        url: `/dashboard/announcements/${a.id}`,
        tag: `announcement-${a.id}`,
      },
    )
  } catch (err) {
    logError('notify_announcement_failed', err, { announcementId })
  }
}

/** Duty assigned → its assignee. */
export async function notifyDutyAssigned(dutyId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: d } = await admin
      .from('duties')
      .select('id, title, assigned_to, events ( title )')
      .eq('id', dutyId)
      .single()
    if (!d || !d.assigned_to) return

    const eventTitle = (d as any).events?.title
    await sendPushToProfiles([d.assigned_to], 'duties', {
      title: '📋 New duty assigned',
      body: `${d.title}${eventTitle ? ` — ${eventTitle}` : ''}`,
      url: `/dashboard/duties/${d.id}`,
      tag: `duty-${d.id}`,
    })
  } catch (err) {
    logError('notify_duty_failed', err, { dutyId })
  }
}

/** Event created → the whole roster of its academic year, minus the creator. */
export async function notifyEventCreated(eventId: string, creatorId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: ev } = await admin
      .from('events')
      .select('id, title, event_date, academic_year_id')
      .eq('id', eventId)
      .single()
    if (!ev) return

    const { data: roster } = await admin
      .from('academic_year_members')
      .select('profile_id, profiles!inner ( is_active )')
      .eq('academic_year_id', ev.academic_year_id)
      .eq('profiles.is_active', true)
    const recipients = (roster ?? []).map(r => r.profile_id).filter(pid => pid !== creatorId)

    const when = new Date(ev.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
    await sendPushToProfiles(recipients, 'events', {
      title: '📅 New event',
      body: `${ev.title} · ${when}`,
      url: `/dashboard/events/${ev.id}`,
      tag: `event-${ev.id}`,
    })
  } catch (err) {
    logError('notify_event_failed', err, { eventId })
  }
}

/**
 * Workload outcomes recorded → each marked member. Only marks that actually
 * exist AND were recorded by `markedBy` produce a notification.
 */
export async function notifyWorkloadMarked(
  entries: { memberId: string; eventId: string }[],
  markedBy: string,
): Promise<void> {
  try {
    if (entries.length === 0) return
    const admin = createAdminClient()

    const memberIds = [...new Set(entries.map(e => e.memberId))]
    const eventIds = [...new Set(entries.map(e => e.eventId))]

    const [{ data: marks }, { data: events }] = await Promise.all([
      admin
        .from('workload_marks')
        .select('member_id, event_id, mark')
        .eq('marked_by', markedBy)
        .in('member_id', memberIds)
        .in('event_id', eventIds),
      admin.from('events').select('id, title').in('id', eventIds),
    ])
    const eventTitle = new Map((events ?? []).map(e => [e.id, e.title]))
    // Only the pairs the caller actually touched in this save.
    const requested = new Set(entries.map(e => `${e.memberId}_${e.eventId}`))

    for (const m of marks ?? []) {
      if (!requested.has(`${m.member_id}_${m.event_id}`)) continue
      const label = WORKLOAD_LABEL[m.mark] ?? m.mark
      const payload: PushPayload = {
        title: '⭐ Duty outcome recorded',
        body: `Your duty for ${eventTitle.get(m.event_id) ?? 'an event'} was marked: ${label}`,
        url: `/dashboard/workloads?member=${m.member_id}&event=${m.event_id}`,
        tag: `mark-${m.member_id}-${m.event_id}`,
      }
      await sendPushToProfiles([m.member_id], 'workload', payload)
    }
  } catch (err) {
    logError('notify_workload_failed', err, { count: entries.length })
  }
}
