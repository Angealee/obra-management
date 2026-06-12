import { createAdminClient } from '@/lib/supabase/admin'

// Manual block list for the /join form. A consultant bans an IP, an email
// (raw or canonical), or a whole domain; this is checked before sending an OTP
// and before inserting an application. Service-role only.

export type BlockType = 'ip' | 'email' | 'domain'

export type BlockCheckInput = {
  ip?: string | null
  email?: string | null
  canonical?: string | null
  domain?: string | null
}

/**
 * Returns true if any of the request's identifiers is on the block list.
 * Fails OPEN on infrastructure errors — a DB hiccup should never hard-stop the
 * whole form (the other gates still apply).
 */
export async function isRequestBlocked(input: BlockCheckInput): Promise<boolean> {
  const candidates: { type: BlockType; value: string }[] = []
  if (input.ip) candidates.push({ type: 'ip', value: input.ip })
  if (input.email) candidates.push({ type: 'email', value: input.email.toLowerCase() })
  if (input.canonical && input.canonical.toLowerCase() !== (input.email ?? '').toLowerCase()) {
    candidates.push({ type: 'email', value: input.canonical.toLowerCase() })
  }
  if (input.domain) candidates.push({ type: 'domain', value: input.domain.toLowerCase() })

  if (candidates.length === 0) return false

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('application_blocks')
    .select('block_type, value')
    .in('value', candidates.map(c => c.value))

  if (error) {
    console.error('Block-list check failed:', error)
    return false
  }

  return (data ?? []).some(row =>
    candidates.some(c => c.type === row.block_type && c.value === row.value),
  )
}
