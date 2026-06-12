import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ApplicationsClient from '../ApplicationsClient'
import ApplicationActions from './ApplicationActions'
import ApplicationMenu from './ApplicationMenu'
import ScoreCard from './ScoreCard'
import StickyHeader from './StickyHeader'
import ForensicsPanel from './ForensicsPanel'
import { enrichApplications, getInitials, getAvatarColor, STATUS_ACCENTS } from '../utils'
import { ApplicationStatus } from '@/types/database'
import { Mail, Phone, GraduationCap, BookOpen, AlertTriangle, Star, ClipboardCheck, User } from 'lucide-react'

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

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#111', margin: 0,
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

  const enriched = await enrichApplications(supabase, (applications as any[]) || [])

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

  const { data: scores } = await supabase
    .from('application_scores')
    .select('id, scored_by, score, scorer:scored_by ( full_name )')
    .eq('application_id', id)

  // ── Forensics: correlate this submission with others, and read block state ──
  const app = application as any
  const submitIp: string | null = app.submit_ip ?? null
  const canonicalEmail: string | null = app.canonical_email ?? null
  const deviceHash: string | null = app.submit_meta?.device_hash ?? null
  const emailDomain: string | null =
    String(canonicalEmail ?? application.email ?? '').split('@')[1] || null

  const countWhere = async (col: string, val: string | null, isJson = false) => {
    if (!val) return 0
    const q = supabase
      .from('member_applications')
      .select('id', { count: 'exact', head: true })
      .neq('id', id)
    const { count } = isJson
      ? await q.filter(col, 'eq', val)
      : await q.eq(col, val)
    return count ?? 0
  }

  const [relatedIp, relatedEmail, relatedDevice] = await Promise.all([
    countWhere('submit_ip', submitIp),
    countWhere('canonical_email', canonicalEmail),
    countWhere('submit_meta->>device_hash', deviceHash, true),
  ])

  const blockValues = [submitIp, application.email?.toLowerCase(), canonicalEmail, emailDomain]
    .filter(Boolean) as string[]
  const { data: blocks } = blockValues.length
    ? await supabase.from('application_blocks').select('block_type, value').in('value', blockValues)
    : { data: [] as { block_type: string; value: string }[] }
  const isBlocked = (type: string, val: string | null) =>
    !!val && (blocks ?? []).some(b => b.block_type === type && b.value === val.toLowerCase())

  const status = application.status as ApplicationStatus
  const s = STATUS_COLORS[status]
  const reviewerName = (application.reviewer as any)?.full_name ?? null
  const ayLabel = (application.academic_year as any)?.label ?? null
  const isDuplicate = enriched.find(a => a.id === id)?.isDuplicate ?? false

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
        applications={enriched}
        selectedId={id}
        userRole={profile.system_role}
        userId={user.id}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Page header */}
          <StickyHeader accentColor={STATUS_ACCENTS[status]}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: getAvatarColor(application.full_name),
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700,
              }}>
                {getInitials(application.full_name)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>
                    {application.full_name}
                  </h2>
                  {isDuplicate && (
                    <span title="Possible duplicate application" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#fffbeb', color: '#ca8a04',
                      fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      <AlertTriangle size={10} /> Duplicate
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#888', margin: '4px 0 0' }}>
                  Applied {appliedDate}{ayLabel && ` · ${ayLabel}`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
              }}>
                {s.label}
              </span>
              {profile.system_role === 'consultant' && (
                <ApplicationMenu applicationId={id} applicantName={application.full_name} status={status} />
              )}
            </div>
          </StickyHeader>

          {/* Profile card */}
          <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} style={{ color: '#3b82f6' }} />
              <h3 style={cardTitleStyle}>Applicant Profile</h3>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{
              gap: '14px 24px',
              background: '#F7F7F5',
              borderRadius: 10,
              padding: '18px 20px',
            }}>
              {[
                { label: 'Email',            value: application.email,          icon: Mail },
                { label: 'Contact',          value: application.contact_number, icon: Phone },
                { label: 'Year Level',       value: application.year_level,     icon: GraduationCap },
                { label: 'Course & Section', value: application.course_section, icon: BookOpen },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <item.icon size={15} style={{ color: '#bbb', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="section-label" style={{ marginBottom: 3 }}>{item.label}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#111', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Positions */}
            <div>
              <p className="section-label" style={{ marginBottom: 8, color: '#555' }}>Applying For</p>
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
              <p className="section-label" style={{ marginBottom: 8, color: '#555' }}>Why They Want to Join</p>
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
                <p className="section-label" style={{ marginBottom: 8, color: '#555' }}>Portfolio</p>
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
          </div>

          {/* Evaluation card */}
          <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Star size={15} style={{ color: '#ca8a04' }} />
              <h3 style={cardTitleStyle}>Portfolio Evaluation</h3>
            </div>
            <ScoreCard
              applicationId={id}
              userId={user.id}
              userRole={profile.system_role}
              scores={(scores as any[]) || []}
            />
          </div>

          {/* Decision card */}
          <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <ClipboardCheck size={15} style={{ color: '#16a34a' }} />
              <h3 style={cardTitleStyle}>Decision &amp; Notes</h3>
            </div>
            <ApplicationActions
              application={application as any}
              userRole={profile.system_role}
            />
          </div>

          {/* Security & forensics */}
          <ForensicsPanel
            isConsultant={profile.system_role === 'consultant'}
            ip={submitIp}
            userAgent={app.user_agent ?? null}
            email={application.email}
            canonicalEmail={canonicalEmail}
            domain={emailDomain}
            meta={app.submit_meta ?? null}
            related={{ ip: relatedIp, email: relatedEmail, device: relatedDevice }}
            blocked={{
              ip: isBlocked('ip', submitIp),
              email: isBlocked('email', canonicalEmail ?? application.email),
              domain: isBlocked('domain', emailDomain),
            }}
          />

        </div>
      </ApplicationsClient>
    </div>
  )
}
