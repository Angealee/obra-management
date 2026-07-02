import Link from 'next/link'

// Shared numbered pagination for server-rendered lists (Activity feed, duty /
// event history sections). Windowed numbers: 1 … page−1 page page+1 … last.
// Server component — hrefFor is called during the same server render.
export default function Pager({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null

  const numbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn-secondary" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
          ← Prev
        </Link>
      )}
      {numbers.map((p, i) => (
        <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && numbers[i - 1] !== p - 1 && (
            <span style={{ fontSize: '12px', color: '#8a8a8a' }}>…</span>
          )}
          {p === page ? (
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', background: '#111', borderRadius: '8px', padding: '6px 12px' }}>{p}</span>
          ) : (
            <Link href={hrefFor(p)} style={{ fontSize: '12.5px', color: '#666', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="btn-secondary" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
          Next →
        </Link>
      )}
    </div>
  )
}
