import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await requireProfile()

  // Only consultants + creative heads can edit events.
  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  if (!canManage) redirect(`/dashboard/events/${id}`)

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events').select('*').eq('id', id).single()
  if (!event) redirect('/dashboard/events')

  return <EditEventForm event={event} />
}
