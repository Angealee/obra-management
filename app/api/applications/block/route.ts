import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Manage the /join block list. Consultant-only (verified server-side via the
// caller's session); writes go through the service-role client.
//
//   POST { action: 'block',   block_type, value, reason? }
//   POST { action: 'unblock', block_type, value }

const VALID_TYPES = ['ip', 'email', 'domain'] as const
type BlockType = (typeof VALID_TYPES)[number]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.system_role !== 'consultant') {
      return NextResponse.json({ error: 'Only a consultant can manage blocks.' }, { status: 403 })
    }

    const body = await req.json()
    const action = String(body?.action ?? '')
    const block_type = String(body?.block_type ?? '') as BlockType
    const value = String(body?.value ?? '').trim().toLowerCase()

    if (!VALID_TYPES.includes(block_type)) {
      return NextResponse.json({ error: 'Invalid block type.' }, { status: 400 })
    }
    if (!value) {
      return NextResponse.json({ error: 'Nothing to block.' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'unblock') {
      const { error } = await admin
        .from('application_blocks')
        .delete()
        .eq('block_type', block_type)
        .eq('value', value)
      if (error) {
        console.error('Unblock error:', error)
        return NextResponse.json({ error: 'Failed to remove block.' }, { status: 500 })
      }
      return NextResponse.json({ success: true, blocked: false })
    }

    if (action === 'block') {
      const reason = String(body?.reason ?? '').trim().slice(0, 300) || null
      const { error } = await admin
        .from('application_blocks')
        .upsert(
          { block_type, value, reason, created_by: user.id },
          { onConflict: 'block_type,value' },
        )
      if (error) {
        console.error('Block error:', error)
        return NextResponse.json({ error: 'Failed to add block.' }, { status: 500 })
      }
      return NextResponse.json({ success: true, blocked: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    console.error('Block route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
