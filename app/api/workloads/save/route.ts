import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyWorkloadMarked } from '@/lib/notifyEvents'

// Save workload outcomes AND notify the marked members in one server round
// trip. Shared by the Workload Matrix save bar and the duty detail page's
// "Mark Outcome" buttons.
//
// All writes run with the CALLER's session client — RLS decides who may mark
// (same as the old client-side writes) and the audit trigger still fires.
// Pushes are scheduled with `after()` so delivery doesn't depend on the
// reviewer's browser surviving past the save.
//
// Per entry: upsert (or delete, when mark is null) the workload_marks row,
// then keep the member's duties for that event in sync — recording an outcome
// stamps them reviewed (status='completed' + reviewed_by/reviewed_at);
// clearing a mark reverts the review. `remarks` is applied to the synced
// duties only when the request includes it (the duty detail flow does, the
// matrix doesn't).

type MarkValue = 'completed' | 'late' | 'did_not_duty' | null
const MARKS: MarkValue[] = ['completed', 'late', 'did_not_duty', null]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const remarksProvided = typeof body?.remarks === 'string'
    const remarks = remarksProvided ? String(body.remarks).trim() : ''
    const rawEntries = Array.isArray(body?.entries) ? body.entries.slice(0, 200) : []

    const entries: { memberId: string; eventId: string; mark: MarkValue }[] = []
    for (const e of rawEntries as any[]) {
      const memberId = String(e?.memberId ?? '')
      const eventId = String(e?.eventId ?? '')
      const mark = (e?.mark ?? null) as MarkValue
      if (memberId && eventId && MARKS.includes(mark)) entries.push({ memberId, eventId, mark })
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No changes to save.' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const errors: string[] = []
    const results: { memberId: string; eventId: string; id: string | null; mark: MarkValue }[] = []

    // Keep the matching duty records in sync with the mark (see header note).
    async function syncDuties(memberId: string, eventId: string, reviewed: boolean) {
      const { data: cellDuties, error } = await supabase
        .from('duties')
        .select('id, status, completed_at')
        .eq('event_id', eventId)
        .eq('assigned_to', memberId)
      if (error) { errors.push(error.message); return }

      for (const d of cellDuties ?? []) {
        const upd: Record<string, any> = reviewed
          ? { status: 'completed', reviewed_by: user!.id, reviewed_at: nowIso }
          : { reviewed_by: null, reviewed_at: null, remarks: null }
        // Stamp completion time only on the transition into completed.
        if (reviewed && d.status !== 'completed' && d.status !== 'reviewed') {
          upd.completed_at = d.completed_at ?? nowIso
        }
        if (reviewed && remarksProvided) upd.remarks = remarks || null
        // Demote legacy status='reviewed' back to 'completed' when un-reviewing.
        if (!reviewed && d.status === 'reviewed') upd.status = 'completed'

        const { error: dutyError } = await supabase.from('duties').update(upd).eq('id', d.id)
        if (dutyError) errors.push(dutyError.message)
      }
    }

    for (const { memberId, eventId, mark } of entries) {
      const { data: existing } = await supabase
        .from('workload_marks')
        .select('id')
        .eq('member_id', memberId)
        .eq('event_id', eventId)
        .maybeSingle()

      if (mark === null) {
        if (existing?.id) {
          const { error } = await supabase.from('workload_marks').delete().eq('id', existing.id)
          if (error) { errors.push(error.message); continue }
          await syncDuties(memberId, eventId, false)
        }
        results.push({ memberId, eventId, id: null, mark: null })
      } else if (existing?.id) {
        const { error } = await supabase
          .from('workload_marks')
          .update({ mark, marked_by: user.id })
          .eq('id', existing.id)
        if (error) { errors.push(error.message); continue }
        results.push({ memberId, eventId, id: existing.id, mark })
        await syncDuties(memberId, eventId, true)
      } else {
        const { data: created, error } = await supabase
          .from('workload_marks')
          .insert({ member_id: memberId, event_id: eventId, mark, marked_by: user.id })
          .select('id')
          .single()
        if (error || !created) { errors.push(error?.message ?? 'Insert failed.'); continue }
        results.push({ memberId, eventId, id: created.id, mark })
        await syncDuties(memberId, eventId, true)
      }
    }

    // Notify the members whose outcome was recorded (cleared marks don't
    // notify). notifyWorkloadMarked re-verifies each mark row in the DB.
    const marked = results.filter(r => r.mark !== null).map(r => ({ memberId: r.memberId, eventId: r.eventId }))
    if (marked.length > 0) after(() => notifyWorkloadMarked(marked, user.id))

    if (errors.length > 0) {
      return NextResponse.json({ error: `Some changes failed: ${errors[0]}`, results }, { status: 400 })
    }
    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Workload save route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
