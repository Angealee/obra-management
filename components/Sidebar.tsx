'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  BarChart2, GraduationCap, LogOut,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  system_role: string
  creative_head_role: string | null
  email: string
}

const NAV = [
  { href: '/dashboard',                label: 'Dashboard',      icon: LayoutDashboard, roles: ['consultant','creative_head','member'] },
  { href: '/dashboard/members',        label: 'Members',        icon: Users,           roles: ['consultant','creative_head'] },
  { href: '/dashboard/events',         label: 'Events',         icon: Calendar,        roles: ['consultant','creative_head'] },
  { href: '/dashboard/duties',         label: 'Duties',         icon: CheckSquare,     roles: ['consultant','creative_head','member'] },
  { href: '/dashboard/workloads',      label: 'Workloads',      icon: BarChart2,       roles: ['consultant','creative_head'] },
  { href: '/dashboard/academic-years', label: 'Academic Years', icon: GraduationCap,   roles: ['consultant'] },
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

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('obra-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('obra-sidebar-collapsed', String(next))
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

  const width = !mounted ? '232px' : collapsed ? '67px' : '250px'

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} shrink-0 flex flex-col h-screen sticky top-0`}
      style={{ width, background: '#0D0D0D', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* logo + collapse button */}
      <div
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 8px' : '0 10px 0 14px',
          flexShrink: 0,
          background: '#0D0D0D',
          gap: '8px',
          overflow: 'hidden',
          transition: 'padding 0.25s ease, justify-content 0.25s ease',
        }}
      >
        {/* Animated Logo */}
        <button
          type="button"
          onClick={collapsed ? toggle : undefined}
          title={collapsed ? 'Expand sidebar' : 'Obra Logo'}
          style={{
            width: collapsed ? '40px' : '96px',
            height: collapsed ? '40px' : '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: collapsed ? 'pointer' : 'default',
            transition:
              'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: collapsed ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <img
            src="/whiteobralogo.png"
            alt="Obra Logo"
            style={{
              width: collapsed ? '36px' : '96px',
              height: collapsed ? '36px' : '76px',
              objectFit: 'contain',
              display: 'block',
              opacity: collapsed ? 0.95 : 1,
              transform: collapsed
                ? 'scale(0.9) rotate(-3deg)'
                : 'scale(1) rotate(0deg)',
              transition:
                'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
            }}
          />
        </button>

        {/* Collapse toggle button */}
        {!collapsed && (
          <button
            onClick={toggle}
            title="Collapse sidebar"
            style={{
              flexShrink: 0,
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              opacity: collapsed ? 0 : 1,
              transform: collapsed ? 'translateX(8px) scale(0.9)' : 'translateX(0) scale(1)',
              transition:
                'background 0.15s ease, color 0.15s ease, opacity 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
            }}
          >
            <PanelLeftClose size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
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
                  size={ collapsed ? 18 : 16}
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

      {/* ── User and sign out ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px', flexShrink: 0 }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px', marginBottom: '2px' }}>
          <div style={{
            width: '28px', height: '28px', flexShrink: 0,
            borderRadius: '50%', background: '#CC0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <div className="sidebar-label" style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12.5px', fontWeight: 500, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.full_name}
            </p>
            <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '1px', whiteSpace: 'nowrap' }}>
              {displayRole}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <form action="/auth/signout" method="post">
          <button type="submit" className="sidebar-nav-item" style={{ width: '100%' }}>
            <LogOut size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span className="sidebar-label">Sign out</span>
            <span className="nav-tooltip">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  )
}