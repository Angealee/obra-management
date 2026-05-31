import { createClient } from '@supabase/supabase-js'

// This client bypasses ALL Row Level Security
// Only use this in server actions or API routes — never in client components
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}