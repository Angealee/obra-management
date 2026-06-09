`use client`
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ApplicationsClient from '../ApplicationsClient'
import ApplicationActions from './ApplicationActions'
import { ApplicationStatus } from '@/types/database'

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  shortlisted: { bg: '#dbeafe', color: '#1e40af', label: 'Shortlisted' },
  interviewed: { bg: '#f3e8ff', color: '#6b21a8', label: 'Interviewed' },
  approved:    { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected:    { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  withdrawn:   { bg: '#f3f4f6', color: '#4b5563', label: 'Withdrawn' },
}

const POSITION_LABELS: Record<string, string> = {
  photographer:     'Photographer',
  photo_editor:     'Photo Editor',
  videographer:     'Videographer',
  video_editor:     'Video Editor',
  graphic_designer: 'Graphic Designer',
  animator:         'Animator',
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['consultant', 'creative_head'].includes(profile.system_role)) {
    redirect('/dashboard')
  }

  const { data: applications } = await supabase
    .from('member_applications')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: application } = await supabase
    .from('member_applications')
    .select(`
      *,
      reviewer:reviewed_by ( full_name ),
      academic_year:academic_year_id ( label )
    `)
    .eq('id', id)
    .single()

  if (!application) notFound()

  const status = application.status as ApplicationStatus
  const s = STATUS_COLORS[status]
  const reviewerName = (application.reviewer as any)?.full_name ?? null
  const ayLabel = (application.academic_year as any)?.label ?? null

  const appliedDate = new Date(application.created_at).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Membership Applications</h1>
        <p className="page-subtitle">Review and evaluate applicants for Obra Creative Media Productions.</p>
      </div>

      <ApplicationsClient
        applications={(applications as any[]) ?? []}
        selectedId={id}
      >
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>
                {application.full_name}
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#888', margin: 0 }}>
                Applied {appliedDate}{ayLabel && ` · ${ayLabel}`}
              </p>
            </div>
            <span style={{
              background: s.bg,
              color: s.color,
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {s.label}
            </span>
          </div>

          {/* Info grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px 24px',
            background: '#F7F7F5',
            borderRadius: 10,
            padding: '18px 20px',
          }}>
            {[
              { label: 'Email',            value: application.email },
              { label: 'Contact',          value: application.contact_number },
              { label: 'Year Level',       value: application.year_level },
              { label: 'Course & Section', value: application.course_section },
            ].map(item => (
              <div key={item.label}>
                <p className="section-label" style={{ marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#111', fontWeight: 500, margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Positions */}
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Applying For</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(application.positions as string[]).map(pos => (
                <span key={pos} style={{
                  background: '#111',
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '4px 12px',
                  borderRadius: 999,
                }}>
                  {POSITION_LABELS[pos] ?? pos}
                </span>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Why They Want to Join</p>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              color: '#333',
              lineHeight: 1.7,
              background: '#F7F7F5',
              borderRadius: 8,
              padding: '14px 16px',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}>
              {application.motivation}
            </p>
          </div>

          {/* Portfolio */}
          {application.portfolio_url && (
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Portfolio</p>
              <a
                href={application.portfolio_url!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#CC0000',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13.5,
                  fontWeight: 500,
                  textDecoration: 'underline',
                }}
              >
                View Portfolio ↗
              </a>
            </div>
          )}

          {/* Reviewer */}
          {application.reviewed_by && reviewerName && (
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14 }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#999', margin: 0 }}>
                Last reviewed by <strong style={{ color: '#555' }}>{reviewerName}</strong>
                {application.reviewed_at && (
                  <> on {new Date(application.reviewed_at).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}</>
                )}
              </p>
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

          <ApplicationActions
            application={application as any}
            userRole={profile.system_role}
          />

        </div>
      </ApplicationsClient>
    </div>
  )
}