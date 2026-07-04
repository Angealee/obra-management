'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  BarChart2, GraduationCap, LogOut,
  PanelLeftClose, PanelLeftOpen,
  BarChart3,
  ClipboardList,
  FileText,
  History,
  X,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  system_role: string
  creative_head_role: string | null
  email: string
  avatar_url: string | null
}

const NAV = [
  { href: '/dashboard',                label: 'Dashboard',      icon: LayoutDashboard, roles: ['consultant','creative_head','member'] },
  { href: '/dashboard/announcements', label: 'Announcements', icon:  BarChart3,       roles: ['consultant','creative_head','member'] },
  { href: '/dashboard/members',        label: 'Members',        icon: Users,           roles: ['consultant','creative_head'] },
  { href: '/dashboard/events',         label: 'Events',         icon: Calendar,        roles: ['consultant','creative_head'] },
  { href: '/dashboard/duties',         label: 'Duties',         icon: CheckSquare,     roles: ['consultant','creative_head','member'] },
  { href: '/dashboard/workloads',      label: 'Workloads',      icon: BarChart2,       roles: ['consultant','creative_head'] },
  { href: '/dashboard/academic-years', label: 'Academic Years', icon: GraduationCap,   roles: ['consultant'] },
  { href: '/dashboard/applications',   label: 'Applications',   icon: ClipboardList,   roles: ['consultant','creative_head'] },
  { href: '/dashboard/reports',        label: 'Reports',        icon: FileText,        roles: ['consultant','creative_head'] },
  { href: '/dashboard/activity',       label: 'Activity',       icon: History,         roles: ['consultant'] },
]

const ROLE_LABEL: Record<string, string> = {
  consultant:    'Consultant',
  creative_head: 'Creative Head',
  member:        'Member',
}

const CREATIVE_LABEL: Record<string, string> = {
  creative_producer: 'Creative Producer',
  creative_writer:   'Creative Writer',
  creative_director: 'Creative Director',
}

export default function Sidebar({
  profile,
  initialCollapsed = false,
}: {
  profile: Profile
  initialCollapsed?: boolean
}) {
  const pathname = usePathname()
  // Collapsed state persists in a COOKIE so the server renders the correct
  // width on first paint — no post-mount width jump (the old localStorage
  // approach flashed 232px before snapping to collapsed).
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Shared drawer channel: the bottom-nav "More" tab and the guided tour both
  // open/close the mobile drawer through this event.
  useEffect(() => {
    const handler = (e: Event) => setMobileOpen(!!(e as CustomEvent).detail)
    window.addEventListener('obra:drawer', handler)
    return () => window.removeEventListener('obra:drawer', handler)
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `obra-sidebar=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const visibleNav = NAV.filter(item => item.roles.includes(profile.system_role))

  const displayRole =
    profile.system_role === 'creative_head' &&
    profile.creative_head_role &&
    profile.creative_head_role !== 'none'
      ? CREATIVE_LABEL[profile.creative_head_role] ?? ROLE_LABEL[profile.system_role]
      : ROLE_LABEL[profile.system_role]

  const initials = profile.full_name
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const width = collapsed ? '67px' : '250px'

  // Inside the mobile drawer, always render as if expanded — the desktop
  // collapsed/expanded preference shouldn't affect the mobile layout.
  const effectiveCollapsed = collapsed && !mobileOpen

  return (
    <>
      {/* Mobile top bar — visible below md breakpoint only */}
      <div
        className="flex md:hidden no-print"
        style={{
          height: 'calc(52px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '14px',
          paddingRight: '14px',
          background: '#0D0D0D',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Image
          src="/whiteobralogo.png"
          alt="Obra Logo"
          width={90}
          height={30}
          style={{ height: '30px', width: 'auto', objectFit: 'contain' }}
        />

        <Link href="/dashboard/profile" style={{ display: 'flex', alignItems: 'center' }}>
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={30}
              height={30}
              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {initials}
            </div>
          )}
        </Link>
      </div>

      {/* Backdrop for mobile drawer */}
      <div
        className="md:hidden"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''} shrink-0 flex flex-col h-screen sticky top-0`}
        style={{ width, background: '#0D0D0D', borderRight: '1px solid rgba(255,255,255,0.05)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
      {/* logo + collapse button */}
      <div
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          padding: effectiveCollapsed ? '0 8px' : '0 10px 0 14px',
          flexShrink: 0,
          background: '#0D0D0D',
          gap: '8px',
          overflow: 'hidden',
          transition: 'padding 0.25s ease, justify-content 0.25s ease',
        }}
      >

        {/* menu hide button */}
        <button
          type="button"
          onClick={effectiveCollapsed ? toggle : undefined}
          title={effectiveCollapsed ? 'Expand sidebar' : 'Obra Logo'}
          style={{
            width: effectiveCollapsed ? '40px' : '96px',
            height: effectiveCollapsed ? '40px' : '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: effectiveCollapsed ? 'pointer' : 'default',
            transition:
              'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: effectiveCollapsed ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <Image
            src="/whiteobralogo.png"
            alt="Obra Logo"
            width={96}
            height={76}
            style={{
              width: effectiveCollapsed ? '36px' : '96px',
              height: effectiveCollapsed ? '36px' : '76px',
              objectFit: 'contain',
              display: 'block',
              opacity: effectiveCollapsed ? 0.95 : 1,
              transform: effectiveCollapsed
                ? 'scale(0.9) rotate(-3deg)'
                : 'scale(1) rotate(0deg)',
              transition:
                'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
            }}
          />
        </button>

        {/* Mobile drawer close button */}
        <button
          type="button"
          className="flex md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
          }}
        >
          <X size={16} strokeWidth={2.2} />
        </button>

        {/* Collapse toggle button (desktop only) */}
        {!collapsed && (
          <button
            onClick={toggle}
            title="Collapse sidebar"
            className="hidden md:flex sidebar-icon-btn"
            style={{
              flexShrink: 0,
              width: '28px',
              height: '28px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              opacity: collapsed ? 0 : 1,
              transform: collapsed ? 'translateX(8px) scale(0.9)' : 'translateX(0) scale(1)',
            }}
          >
            <PanelLeftClose size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav data-tour="nav" style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {visibleNav.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
              >
                <item.icon
                  size={effectiveCollapsed ? 18 : 16}
                  style={{ flexShrink: 0 }}
                  strokeWidth={active ? 2.2 : 1.75}
                  color={active ? '#CC0000' : 'rgba(255,255,255,0.55)'}
                />
                <span className="sidebar-label">{item.label}</span>
                <span className="nav-tooltip">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── User + sign out ── */}
      <Link href="/dashboard/profile" style={{ textDecoration: 'none', display: 'block' }}>
        <div className="sidebar-user-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px', marginBottom: '2px' }}>
          {/* Avatar — show image if exists, otherwise initials */}
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={28}
              height={28}
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {initials}
            </div>
          )}
          <div className="sidebar-label" style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12.5px', fontWeight: 500, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.full_name}
            </p>
            <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '1px', whiteSpace: 'nowrap' }}>
              {displayRole}
            </p>
          </div>
        </div>
      </Link>

        

        {/* Sign out */}
        <form action="/auth/signout" method="post">
          <button type="submit" className="sidebar-nav-item" style={{ width: '100%' }}>
            <LogOut size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span className="sidebar-label">Sign out</span>
            <span className="nav-tooltip">Sign out</span>
          </button>
        </form>
      </aside>
    </>
  )
}