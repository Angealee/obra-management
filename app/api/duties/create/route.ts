import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyDutyAssigned } from '@/lib/notifyEvents'
import { memberRoleLabel } from '@/lib/memberRole'

// Assign duties (one per selected member) AND notify each assignee in one
// server round trip.
//
// Inserts run with the CALLER's session client — RLS decides who may assign
// (same as the old client-side inserts) and the audit trigger still fires.
// Title + duty_type are derived here from the event and each member's primary
// creative role, exactly as the form used to do. Pushes are scheduled with
// `after()` so delivery doesn't depend on the assigner's browser.

const PRIORITIES = ['low', 'normal', 'high', 'urgent']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const eventId = String(body?.eventId ?? '')
    const description = String(body?.description ?? '').trim()
    const priority = PRIORITIES.includes(body?.priority) ? String(body.priority) : 'normal'
    const dueDate = body?.dueDate ? String(body.dueDate) : null
    const memberIds: string[] = Array.isArray(body?.memberIds)
      ? [...new Set(body.memberIds.map((m: unknown) => String(m)))].slice(0, 100) as string[]
      : []

    if (!eventId) return NextResponse.json({ error: 'Please select an event.' }, { status: 400 })
    if (memberIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one member.' }, { status: 400 })
    }

    const [{ data: event }, { data: members }] = await Promise.all([
      supabase.from('events').select('id, title').eq('id', eventId).single(),
      supabase.from('profiles').select('id, member_role').in('id', memberIds),
    ])
    if (!event) return NextResponse.json({ error: 'Selected event not found.' }, { status: 404 })

    const roleOf = new Map((members ?? []).map(m => [m.id, m.member_role]))
    const createdIds: string[] = []

    for (const memberId of memberIds) {
      const memberRole = roleOf.get(memberId)
      const dutyType = memberRole && memberRole !== 'none' ? memberRole : 'other'
      const roleLabel = dutyType === 'other' ? 'General Duty' : memberRoleLabel(dutyType)

      const { data: created, error: dutyError } = await supabase
        .from('duties')
        .insert({
          title: `${event.title} — ${roleLabel}`,
          description: description || null,
          duty_type: dutyType,
          priority,
          due_date: dueDate,
          event_id: eventId,
          assigned_to: memberId,
          assigned_by: user.id,
          status: 'pending',
        })
        .select('id')
        .single()

      if (dutyError || !created) {
        return NextResponse.json(
          { error: dutyError?.message ?? 'Failed to assign duty.', createdIds },
          { status: 400 },
        )
      }
      createdIds.push(created.id)
    }

    after(async () => {
      for (const id of createdIds) await notifyDutyAssigned(id)
    })

    return NextResponse.json({ success: true, createdIds })
  } catch (err) {
    console.error('Duty create route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
