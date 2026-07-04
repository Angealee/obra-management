import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import PageWrapper from '@/components/PageWrapper'
import YearPicker from '@/components/YearPicker'
import EnablePushBanner from '@/components/EnablePushBanner'
import PushForegroundBanner from '@/components/PushForegroundBanner'
import GuidedTour from '@/components/GuidedTour'
import BottomNav from '@/components/BottomNav'
import { getAcademicYearContext } from '@/lib/academicYear'
import { getSessionProfile } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Shared (cached) per-request fetch — the page rendered into {children} reuses
  // this same auth + profile lookup instead of repeating it.
  const { user, profile } = await getSessionProfile()
  if (!user) redirect('/login')

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', padding: '32px', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#CC0000', marginBottom: '8px' }}>Profile Not Found</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Your account exists but has no profile record.</p>
          <p style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>ID: {user.id}</p>
        </div>
      </div>
    )
  }

  // System-wide academic-year picker — shown to the admins who manage data
  // across years. Members always see the active year (no picker).
  const showYearPicker =
    profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  const { years, viewYearId } = showYearPicker
    ? await getAcademicYearContext()
    : { years: [], viewYearId: null }

  // When the sticky year bar is shown, expose its height as a CSS variable so
  // page-level sticky headers (e.g. the applicant card) can park *below* it
  // instead of colliding at top:0. Falls back to 0 when the bar is absent.
  const hasTopBar = showYearPicker && years.length > 0
  const TOPBAR_H = 48

  // Server-read sidebar preference — first paint renders the right width.
  const cookieStore = await cookies()
  const sidebarCollapsed = cookieStore.get('obra-sidebar')?.value === '1'

  return (
    <div className="flex flex-col md:flex-row dashboard-shell" style={{ height: '100vh', overflow: 'hidden', background: '#F7F7F5' }}>
      <Sidebar profile={profile} initialCollapsed={sidebarCollapsed} />
      <main
        className="dashboard-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          minWidth: 0,
          ['--obra-topbar-h' as string]: hasTopBar ? `${TOPBAR_H}px` : '0px',
        } as React.CSSProperties}
      >
        {hasTopBar && (
          <div
            className="no-print"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              height: TOPBAR_H,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px',
              background: 'rgba(247,247,245,0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <YearPicker years={years} viewYearId={viewYearId} />
          </div>
        )}
        <EnablePushBanner />
        <PushForegroundBanner />
        <PageWrapper>{children}</PageWrapper>
        <GuidedTour role={profile.system_role} />
      </main>
      <BottomNav role={profile.system_role} />
    </div>
  )
}