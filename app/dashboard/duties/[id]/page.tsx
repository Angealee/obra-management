import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import { DutyStatusBadge } from '@/components/ui/StatusBadge'
import BackLink from '@/components/BackLink'
import DutyDetailBody, { fetchDutyDetail } from './DutyDetailBody'

const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

// Standalone duty detail — the push-notification deep-link target, and the
// member's normal view. Admins usually open duties in the hub's slide-over,
// but this page stays fully functional for direct URLs.
export default async function DutyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await requireProfile()
  const supabase = await createClient()

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  const backHref = isHead ? '/dashboard/events?tab=duties' : '/dashboard/duties'

  const detail = await fetchDutyDetail(supabase, id)
  if (!detail) redirect(backHref)
  const { duty, workloadMark } = detail

  // Members can only view their own duties
  if (!isHead && duty.assigned_to !== user.id) redirect('/dashboard/duties')

  const display = dutyDisplayStatus(duty)
  const [pbg, ptc] = priorityStyle[duty.priority] ?? priorityStyle.normal

  return (
    <div className="page-narrow" style={{ maxWidth: 640 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <BackLink href={backHref}>{isHead ? 'Back to Duties & Events' : 'Back to My Duties'}</BackLink>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.15, margin: 0 }}>
            {duty.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' }}>
              {duty.priority}
            </span>
            <DutyStatusBadge display={display} />
          </div>
        </div>
      </div>

      <DutyDetailBody duty={duty} workloadMark={workloadMark} profile={profile} isHead={isHead} />
    </div>
  )
}
