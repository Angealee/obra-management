export default function WorkloadBadge({ mark }: { mark: string | null | undefined }) {
  if (!mark) return <span style={{ color: '#ddd', fontSize: '12px' }}>—</span>

  const config: Record<string, { bg: string; color: string; label: string }> = {
    completed:    { bg: '#f0fdf4', color: '#16a34a', label: '✓ Completed' },
    late:         { bg: '#fefce8', color: '#ca8a04', label: '⏰ Late' },
    did_not_duty: { bg: '#fff1f2', color: '#CC0000',  label: '✗ Did Not Duty' },
  }

  const c = config[mark]
  if (!c) return null

  return (
    <span style={{
      fontSize: '11px', fontWeight: 600,
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: '99px',
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}