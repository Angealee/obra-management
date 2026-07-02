import {
  DUTY_DISPLAY_LABELS,
  DUTY_DISPLAY_STYLE,
  type DutyDisplayStatus,
} from '@/lib/dutyStatus'

// One pill-badge family for every status dialect in the app. The base Pill
// takes explicit colors; the wrappers below carry the domain maps. Kept
// separate on purpose: "completed" is GREEN for an event (it happened) but
// YELLOW for a duty (done, awaiting review) — one shared map would blur that.

export function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '99px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

// ── Events: upcoming / ongoing / completed / cancelled ──────────────────────
const EVENT_STATUS_STYLE: Record<string, [string, string]> = {
  upcoming:  ['#eff6ff', '#3b82f6'],
  ongoing:   ['#fefce8', '#ca8a04'],
  completed: ['#f0fdf4', '#16a34a'],
  cancelled: ['#f3f4f6', '#9ca3af'],
}
const EVENT_STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function EventStatusBadge({ status }: { status: string }) {
  const [bg, color] = EVENT_STATUS_STYLE[status] ?? ['#f3f4f6', '#6b7280']
  return <Pill label={EVENT_STATUS_LABEL[status] ?? status} bg={bg} color={color} />
}

// ── Duties: display status derived by lib/dutyStatus (merged-review model) ──
export function DutyStatusBadge({ display }: { display: DutyDisplayStatus }) {
  const [bg, color] = DUTY_DISPLAY_STYLE[display]
  return <Pill label={DUTY_DISPLAY_LABELS[display]} bg={bg} color={color} />
}
