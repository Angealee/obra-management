import { NextRequest, NextResponse } from 'next/server'
import { notifyDutiesDueOn } from '@/lib/notifyEvents'

// Daily duty-due-tomorrow reminders, driven by Vercel Cron (vercel.json runs
// this at 01:00 UTC = 09:00 Asia/Manila). Vercel automatically sends
// `Authorization: Bearer ${CRON_SECRET}` when that env var exists — the same
// header lets you trigger a run manually (curl) for testing.

/** Tomorrow's date in Asia/Manila (UTC+8, no DST), as YYYY-MM-DD. */
function phTomorrow(): string {
  const ph = new Date(Date.now() + 8 * 60 * 60 * 1000)
  ph.setUTCDate(ph.getUTCDate() + 1)
  return ph.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Refuse rather than run unauthenticated — set CRON_SECRET in the env.
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dueDate = phTomorrow()
  const result = await notifyDutiesDueOn(dueDate)
  return NextResponse.json({ dueDate, ...result })
}
