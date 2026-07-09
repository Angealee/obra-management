'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarCheck, CheckSquare, Megaphone, User,
  BarChart2, MoreHorizontal, type LucideIcon,
} from 'lucide-react'

// Mobile primary navigation. Fixed bottom tab bar (thumb reach); the desktop
// sidebar is unchanged. Admin roles get 4 core tabs + "More" (which opens the
// existing drawer via the shared obra:drawer event, so the full nav still lives
// in one place). Members' whole nav fits in four tabs, so they get no "More".

type Tab =
  | { kind: 'link'; href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }
  | { kind: 'more'; label: string; icon: LucideIcon }

const dash: Tab = {
  kind: 'link', href: '/dashboard', label: 'Home', icon: LayoutDashboard,
  match: p => p === '/dashboard',
}
// Admin hub tab — also lights up on duty deep links (push notifications land
// on /dashboard/duties/[id], which is part of the hub's territory for admins).
const hub: Tab = {
  kind: 'link', href: '/dashboard/events', label: 'Duties·Events', icon: CalendarCheck,
  match: p => p.startsWith('/dashboard/events') || p.startsWith('/dashboard/duties'),
}
const workloads: Tab = {
  kind: 'link', href: '/dashboard/workloads', label: 'Workloads', icon: BarChart2,
  match: p => p.startsWith('/dashboard/workloads'),
}
const duties: Tab = {
  kind: 'link', href: '/dashboard/duties', label: 'Duties', icon: CheckSquare,
  match: p => p.startsWith('/dashboard/duties'),
}
const announcements: Tab = {
  kind: 'link', href: '/dashboard/announcements', label: 'News', icon: Megaphone,
  match: p => p.startsWith('/dashboard/announcements'),
}
const profile: Tab = {
  kind: 'link', href: '/dashboard/profile', label: 'Profile', icon: User,
  match: p => p.startsWith('/dashboard/profile'),
}
const more: Tab = { kind: 'more', label: 'More', icon: MoreHorizontal }

const TABS_BY_ROLE: Record<string, Tab[]> = {
  consultant:    [dash, hub, workloads, more],
  creative_head: [dash, hub, workloads, more],
  member:        [dash, duties, announcements, profile],
}

export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Reflect drawer state so the "More" tab highlights while it's open.
  useEffect(() => {
    const handler = (e: Event) => setDrawerOpen(!!(e as CustomEvent).detail)
    window.addEventListener('obra:drawer', handler)
    return () => window.removeEventListener('obra:drawer', handler)
  }, [])

  const tabs = TABS_BY_ROLE[role] ?? TABS_BY_ROLE.member

  return (
    <nav className="bottom-nav no-print" aria-label="Primary">
      {tabs.map(tab => {
        if (tab.kind === 'more') {
          return (
            <button
              key="more"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('obra:drawer', { detail: true }))}
              className={`bottom-nav-item ${drawerOpen ? 'active' : ''}`}
              aria-label="More"
            >
              <tab.icon size={22} strokeWidth={drawerOpen ? 2.4 : 1.9} />
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          )
        }
        const active = tab.match(pathname) && !drawerOpen
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <tab.icon size={22} strokeWidth={active ? 2.4 : 1.9} />
            <span className="bottom-nav-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
