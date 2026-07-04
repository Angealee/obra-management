// Shared page header: title + optional subtitle + right-aligned action slot,
// with the standard --space-header rhythm below. Server-safe (no hooks).
// Every screen opens with this so title size and spacing can't drift per page.

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div
      className="flex items-start justify-between flex-wrap"
      style={{ gap: 16, marginBottom: 'var(--space-header)' }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
