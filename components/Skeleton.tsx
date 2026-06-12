import type { CSSProperties } from 'react'

// Pure presentational skeleton primitives for route-level loading.tsx files.
// Server-safe (no 'use client') — they render the same shimmer placeholders the
// page will be replaced by once its data resolves. Shapes here intentionally
// mirror the real layouts so the swap from skeleton → content doesn't jump.

export function Skeleton({
  w = '100%',
  h = 14,
  r = 8,
  style,
  className = '',
}: {
  w?: number | string
  h?: number | string
  r?: number | string
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  )
}

/** Page title + subtitle bars. */
export function SkeletonHeader() {
  return (
    <div style={{ marginBottom: 28 }}>
      <Skeleton w={220} h={26} r={7} />
      <Skeleton w={300} h={13} r={6} style={{ marginTop: 10 }} />
    </div>
  )
}

/** A single stat card placeholder (icon chip + number + label). */
export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <Skeleton w={36} h={36} r={10} />
      <div>
        <Skeleton w={70} h={10} r={4} />
        <Skeleton w={48} h={26} r={6} style={{ marginTop: 8 }} />
      </div>
    </div>
  )
}

/** A row of n stat cards (responsive grid matching the dashboard). */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

/** A card-framed list of rows (duties, events, members table, etc.). */
export function SkeletonTable({ rows = 6, withAvatar = false }: { rows?: number; withAvatar?: boolean }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="fade-rise"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '15px 20px',
            borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            animationDelay: `${i * 45}ms`,
          }}
        >
          {withAvatar && <Skeleton w={32} h={32} r={999} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton w={`${55 + ((i * 7) % 30)}%`} h={13} r={6} />
            <Skeleton w={`${30 + ((i * 5) % 20)}%`} h={11} r={5} style={{ marginTop: 7 }} />
          </div>
          <Skeleton w={64} h={22} r={999} />
        </div>
      ))}
    </div>
  )
}

/** A vertical stack of standalone cards (announcements list). */
export function SkeletonCardStack({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="fade-rise"
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 10,
            padding: '18px 22px',
            animationDelay: `${i * 55}ms`,
          }}
        >
          <Skeleton w={`${40 + ((i * 9) % 30)}%`} h={15} r={6} />
          <Skeleton w="92%" h={12} r={5} style={{ marginTop: 10 }} />
          <Skeleton w="80%" h={12} r={5} style={{ marginTop: 7 }} />
        </div>
      ))}
    </div>
  )
}
