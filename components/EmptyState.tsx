import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

// A shared, humanized empty state. Instead of a terse "No data" line, it gives
// the reader a quiet icon, a plain-language title, a sentence explaining what
// will show up here and when, and (optionally) the action that fills it.
//
// Design values are inline per the project convention; layout uses .dash-card.
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
  // compact = sits inside an existing card (no own border/padding chrome)
  compact?: boolean
}) {
  const body = (
    <>
      {Icon && (
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: '#F4F4F2',
            color: '#bcbcbc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Icon size={21} strokeWidth={1.75} />
        </div>
      )}
      <p style={{ fontSize: 14.5, fontWeight: 600, color: '#444', margin: 0 }}>{title}</p>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: '#6b7280',
            margin: '6px 0 0',
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <Link href={action.href} className="btn-secondary" style={{ marginTop: 18 }}>
          {action.label}
        </Link>
      )}
    </>
  )

  const layout: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: compact ? '28px 20px' : '52px 32px',
  }

  if (compact) return <div style={layout}>{body}</div>

  return (
    <div className="dash-card" style={layout}>
      {body}
    </div>
  )
}
