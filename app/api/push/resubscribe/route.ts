import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Called by the service worker's `pushsubscriptionchange` handler when the
// browser's push service rotates or expires a subscription. Without this, the
// old endpoint dies silently and the device stops receiving notifications
// until the user manually re-enables them.
//
// The SW fetch is same-origin, so the Supabase auth cookies ride along and
// the writes run under the user's own RLS policies (users manage only their
// own subscription rows). Category preferences carry over from the old row.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const oldEndpoint = String(body?.oldEndpoint ?? '')
    const endpoint = String(body?.subscription?.endpoint ?? '')
    const p256dh = String(body?.subscription?.keys?.p256dh ?? '')
    const auth = String(body?.subscription?.keys?.auth ?? '')

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
    }

    // Carry the old row's category prefs onto the replacement (if we still
    // have it — the push service may have already caused it to be pruned).
    let categories: Record<string, boolean> | undefined
    if (oldEndpoint) {
      const { data: oldRow } = await supabase
        .from('push_subscriptions')
        .select('categories')
        .eq('endpoint', oldEndpoint)
        .maybeSingle()
      if (oldRow?.categories) categories = oldRow.categories
    }

    const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
      {
        profile_id: user.id,
        endpoint,
        p256dh,
        auth,
        ...(categories ? { categories } : {}),
      },
      { onConflict: 'endpoint' },
    )
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    if (oldEndpoint && oldEndpoint !== endpoint) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', oldEndpoint)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push resubscribe route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
