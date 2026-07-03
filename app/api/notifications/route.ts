import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendPushToProfiles } from '@/lib/push'

// Push utility endpoint.
//
// GET  → the VAPID public key, read from the SERVER env at runtime.
//        NEXT_PUBLIC_* values are inlined into the client bundle at build
//        time; a deployment built before the env var existed (or a redeploy
//        that reused the build cache) ships a bundle without it. The
//        NotificationsCard falls back to this endpoint, so enabling push
//        survives stale client bundles. The public key is public by design.
//
// POST → { type: 'test' }: sends the caller a test notification after a short
//        delay (time to background the app), proving closed-app delivery.
//
// The mutation trigger types that used to live here (announcement,
// duty_assigned, event_created, workload_marked) were removed 2026-07-04:
// notifications are sent in-process by the mutation routes themselves
// (/api/announcements/create, /api/events/create, /api/duties/create,
// /api/workloads/save) via after() + lib/notifyEvents.

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
  return NextResponse.json(
    { publicKey },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = await checkRateLimit(`notify:${user.id}`, 10, 60)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    if (String(body?.type ?? '') !== 'test') {
      return NextResponse.json({ error: 'Unknown notification type.' }, { status: 400 })
    }

    // Small delay so the tester can background/close the app first and prove
    // delivery does not depend on the page being open.
    await new Promise(r => setTimeout(r, 4000))
    const result = await sendPushToProfiles([user.id], 'test', {
      title: '✅ Obra push is working',
      body: 'This test notification was delivered by the push service — even with the app closed.',
      url: '/dashboard/profile',
      tag: 'obra-test',
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Notification route error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
