// Guided-tour config + local persistence. Pure module (no React) so the step
// list and the visit-counting rules stay testable and out of the engine.
//
// Storage is per-device localStorage (no DB). Auto-launch fires on a user's
// first 5 VISIT-DAYS (a fresh page load on a new calendar day), and stops for
// good once they finish it or tick "don't show again". Skipping just dismisses
// for the session — it returns on the next visit-day until the 5 are used up.

export type TourRole = 'consultant' | 'creative_head' | 'member'

export type TourStep = {
  id: string
  type: 'welcome' | 'spotlight' | 'finish'
  title: string
  body: string
  roles: TourRole[]
  /** Navigate here before showing the step (list pages the tour walks). */
  route?: string
  /** Element to spotlight (a data-tour anchor on a real UI element). */
  selector?: string
  /** Mobile only: open the sidebar drawer so the nav anchor is on-screen. */
  openDrawerOnMobile?: boolean
}

export const MAX_AUTO_VISITS = 5
const KEY = 'obra_tour_v1'

export type TourState = {
  visitDays: number
  lastDay: string | null
  completed: boolean
  dismissed: boolean
}

const DEFAULT_STATE: TourState = {
  visitDays: 0,
  lastDay: null,
  completed: false,
  dismissed: false,
}

export function readTourState(): TourState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_STATE }
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function writeTourState(next: TourState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — tour just won't persist, no crash */
  }
}

/** Calendar day in Manila as YYYY-MM-DD (visit-day granularity). */
export function manilaDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Record a visit and decide whether the tour should auto-launch. Called once
 * per fresh page load. Returns the updated state and whether to open the tour.
 */
export function registerVisit(prev: TourState, today: string = manilaDay()): {
  state: TourState
  shouldAutoLaunch: boolean
} {
  if (prev.completed || prev.dismissed) {
    return { state: prev, shouldAutoLaunch: false }
  }
  let state = prev
  if (prev.lastDay !== today) {
    state = { ...prev, visitDays: prev.visitDays + 1, lastDay: today }
  }
  return { state, shouldAutoLaunch: state.visitDays <= MAX_AUTO_VISITS }
}

// ── Steps ────────────────────────────────────────────────────────────────
// Ordered; filtered by role. Copy is plain-language and points at the real
// buttons the person will press.
const ALL: TourRole[] = ['consultant', 'creative_head', 'member']
const ADMINS: TourRole[] = ['consultant', 'creative_head']

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    type: 'welcome',
    roles: ALL,
    title: 'Welcome to Obra',
    body: 'Take a quick two-minute walkthrough and we’ll show you around — where things live and what to press. You can skip anytime.',
  },
  {
    id: 'nav',
    type: 'spotlight',
    roles: ALL,
    selector: '[data-tour="nav"]',
    openDrawerOnMobile: true,
    title: 'Your navigation',
    body: 'Every section of the system lives in this menu — Members, Events, Duties, and more. On phones, tap the ☰ menu button to open it.',
  },
  {
    id: 'stats',
    type: 'spotlight',
    roles: ALL,
    route: '/dashboard',
    selector: '[data-tour="stats"]',
    title: 'Your day at a glance',
    body: 'These cards summarize what matters right now. Tap any card to jump straight to the full list behind it.',
  },
  {
    id: 'quick',
    type: 'spotlight',
    roles: ADMINS,
    route: '/dashboard',
    selector: '[data-tour="quick-actions"]',
    title: 'Quick actions',
    body: 'The jobs you’ll do most — create an event, assign a duty, post an announcement — are one tap away right here.',
  },
  {
    id: 'events',
    type: 'spotlight',
    roles: ADMINS,
    route: '/dashboard/events',
    selector: '[data-tour="add-event"]',
    title: 'Start with an event',
    body: 'An event is the container everything hangs on. Press “+ Add Event” to create one — give it a title, date, and place. Duties get attached to it next.',
  },
  {
    id: 'duties-manage',
    type: 'spotlight',
    roles: ADMINS,
    route: '/dashboard/duties',
    selector: '[data-tour="add-duty"]',
    title: 'Assign the work',
    body: 'Press “+ Assign Duty” to give a member a task for an event. They mark it in progress and done; you review it afterwards.',
  },
  {
    id: 'duties-member',
    type: 'spotlight',
    roles: ['member'],
    route: '/dashboard/duties',
    selector: '[data-tour="my-duties"]',
    title: 'Your duties',
    body: 'Tasks assigned to you appear here. Use the buttons on each one to mark it In Progress, then Done — your creative head reviews it after.',
  },
  {
    id: 'workloads',
    type: 'spotlight',
    roles: ADMINS,
    route: '/dashboard/workloads',
    selector: '[data-tour="matrix"]',
    title: 'Review at a glance',
    body: 'The workload matrix shows every member against every event. Tap a cell to mark how they did — completed, late, or did not duty. Drag to pan around.',
  },
  {
    id: 'announce-manage',
    type: 'spotlight',
    roles: ADMINS,
    route: '/dashboard/announcements',
    selector: '[data-tour="add-announcement"]',
    title: 'Keep everyone posted',
    body: 'Press “+ Post Announcement” to reach members and heads. It lands on their dashboards, and you can see who’s read it.',
  },
  {
    id: 'announce-read',
    type: 'spotlight',
    roles: ['member'],
    route: '/dashboard/announcements',
    selector: '[data-tour="announcements-list"]',
    title: 'Stay in the loop',
    body: 'Announcements from your creative heads show up here. Unread ones are marked with a red dot — open one to read it and acknowledge.',
  },
  {
    id: 'notifications',
    type: 'spotlight',
    roles: ALL,
    route: '/dashboard/profile',
    selector: '[data-tour="notifications"]',
    title: 'Turn on notifications',
    body: 'Enable push notifications on your device so you never miss a new duty, event, or announcement — even when the app is closed.',
  },
  {
    id: 'finish',
    type: 'finish',
    roles: ALL,
    title: 'You’re all set',
    body: 'That’s the tour. You can replay it anytime from your Profile page under “System walkthrough”. Welcome aboard!',
  },
]

export function stepsForRole(role: TourRole): TourStep[] {
  return TOUR_STEPS.filter(s => s.roles.includes(role))
}
