import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import EditAnnouncementForm from './EditAnnouncementForm'

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

  const { data: announcement } = await supabase
    .from('announcements').select('*').eq('id', id).single()
  if (!announcement) redirect('/dashboard/announcements')

  const canEdit = profile.system_role === 'consultant' || announcement.posted_by === user.id
  if (!canEdit) redirect(`/dashboard/announcements/${id}`)

  const { data: academicYears } = await supabase
    .from('academic_years').select('*').order('start_date', { ascending: false })

  return (
    <EditAnnouncementForm
      announcement={announcement}
      academicYears={academicYears ?? []}
    />
  )
}