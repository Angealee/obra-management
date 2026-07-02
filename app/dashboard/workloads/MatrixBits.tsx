import type { LucideIcon } from 'lucide-react'

// Small presentational pieces shared by the matrix table, mobile cards, and
// summary row. Extracted unchanged from the original WorkLoadMatrix.

export const EVENT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  upcoming:  { bg: '#eff6ff', color: '#3b82f6' },
  ongoing:   { bg: '#fefce8', color: '#ca8a04' },
  completed: { bg: '#f0fdf4', color: '#16a34a' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
}

export function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width: 52, height: 5, borderRadius: 99, background: '#F1F1EF', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 99,
        background: value === 0 ? '#e9e9e7' : '#3b82f6',
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export function SkillTag({ name }: { name: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 500, color: '#888', background: '#F7F7F5',
      padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

export function StatCard({ icon: Icon, label, value, sub, accent, delay }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string; accent: string; delay?: string
}) {
  return (
    <div className="dash-card lift-hover fade-rise" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, animationDelay: delay }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: `${accent}1a`, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} strokeWidth={2.25} />
      </div>
      <div>
        <p className="section-label">{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#111', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

/** Member initial circle — dimmed for members with no duties. */
export function MemberDot({ name, total, size = 32 }: { name: string; total: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size >= 36 ? 13 : 12, fontWeight: 700,
      background: total === 0 ? '#F7F7F5' : '#111',
      color: total === 0 ? '#bbb' : '#fff',
    }}>
      {name.charAt(0)}
    </div>
  )
}
