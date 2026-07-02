import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLog'

export async function POST(req: NextRequest) {
  try {
    // Verify the requester is a consultant
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.system_role !== 'consultant') {
      return NextResponse.json({ error: 'Only consultants can archive members.' }, { status: 403 })
    }

    const { memberId, action } = await req.json()
    // action: 'archive' | 'unarchive'

    if (!memberId || !action) {
      return NextResponse.json({ error: 'Missing memberId or action.' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'archive') {
      const { error } = await admin
        .from('profiles')
        .update({ member_status: 'archived', is_active: false })
        .eq('id', memberId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (action === 'unarchive') {
      const { error } = await admin
        .from('profiles')
        .update({ member_status: 'active', is_active: true })
        .eq('id', memberId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    }

    // Service-role write — the audit trigger skips it, so log here.
    const { data: member } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', memberId)
      .single()
    await logActivity({
      actorId: user.id,
      action: action === 'archive' ? 'archived' : 'unarchived',
      targetTable: 'profiles',
      targetId: memberId,
      details: { target_label: member?.full_name ?? 'Unknown member' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Archive error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}