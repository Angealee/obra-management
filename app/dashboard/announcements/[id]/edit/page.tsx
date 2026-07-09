import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import EditAnnouncementForm from './EditAnnouncementForm'

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { user, profile } = await requireProfile()

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