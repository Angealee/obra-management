import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

// ───────────────────────────────────────────────────────────────────────────
// Per-request session + profile.
//
// `auth.getUser()` is a network round-trip to Supabase Auth (it verifies the
// JWT) and the profile fetch is a second round-trip. The dashboard renders the
// layout AND the page in the same request, and historically each one did both
// calls itself — 2–3× the auth traffic per navigation.
//
// Wrapping these in React `cache()` deduplicates them: the first caller in a
// render does the work, every other caller in that same request reuses the
// result. One auth round-trip + one profile fetch per page load, shared by the
// layout and the page.
//
// Security note: we keep `getUser()` (not `getSession()`) on purpose — only
// `getUser()` revalidates the token server-side. Caching does not weaken this;
// the cache lifetime is a single server request.
// ───────────────────────────────────────────────────────────────────────────

export const getSessionProfile = cache(async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null as Profile | null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  return { user, profile }
})

// Pages that require a logged-in profile. Redirects to /login when the session
// is missing or the profile row does not exist — the same guard the pages used
// to inline, now in one place and sharing the cached fetch above.
export const requireProfile = cache(async () => {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile) redirect('/login')
  return { user, profile }
})
