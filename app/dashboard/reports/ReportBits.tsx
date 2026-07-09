// Shared presentation pieces for report pages (server-safe).

/** Letterhead-style header printed at the top of every report. */
export function ReportHeader({
  title,
  yearLabel,
  subtitle,
}: {
  title: string
  yearLabel: string | null
  subtitle?: string
}) {
  return (
    <div className="print-avoid-break" style={{ borderBottom: '2px solid #111', paddingBottom: 14, marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>
        Dominican College of Tarlac · College of Computer Studies
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.02em', color: '#111', margin: '4px 0 0' }}>
        OBRA <span style={{ color: '#CC0000' }}>CMP</span>
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111', margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>{subtitle}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111', margin: 0 }}>{yearLabel ?? 'No academic year'}</p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
            Generated {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '9px 12px',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#374151',
  borderBottom: '1.5px solid rgba(0,0,0,0.25)',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: 12.5,
  color: '#222',
  borderBottom: '1px solid rgba(0,0,0,0.07)',
  verticalAlign: 'top',
}

/** Dense, print-friendly data table. Numeric columns can be right-aligned via `numericFrom`. */
export function ReportTable({
  headers,
  rows,
  numericFrom,
}: {
  headers: string[]
  /** Pre-stringified display rows. */
  rows: (string | number)[][]
  /** Column index from which cells right-align (counts, percentages). */
  numericFrom?: number
}) {
  return (
    // On phones the wide tables scroll inside this container instead of
    // crushing; the print stylesheet resets overflow so paper output is
    // unaffected (report-table-scroll rule in globals.css).
    <div className="report-table-scroll" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(560, headers.length * 96) }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h} style={{ ...th, textAlign: numericFrom != null && i >= numericFrom ? 'right' : 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ ...td, textAlign: numericFrom != null && ci >= numericFrom ? 'right' : 'left' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
