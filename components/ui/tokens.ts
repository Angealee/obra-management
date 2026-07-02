// Shared design tokens for dashboard-style pages. Extracted from the local
// `T` object app/dashboard/page.tsx carried — now importable anywhere so the
// card/label/row dialect can't drift per page.
//
// Convention reminder (CLAUDE.md): Tailwind classes for LAYOUT utilities only;
// design values (colors, sizes) stay inline — `label` is a style object for
// that reason.

export const T = {
  /** White card: rounded 10px + hairline border. */
  card: 'bg-white rounded-[10px] border border-black/[0.06]',
  /** Hover lift for interactive cards. */
  cardHov:
    'hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] hover:border-black/[0.10] transition-all duration-200',
  /** Uppercase section label — #6b7280 meets WCAG AA on white. */
  label: {
    fontSize: '10.5px',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: '#6b7280',
  },
  /** Hoverable list row inside a card. */
  row: 'flex items-center justify-between p-3 rounded-lg hover:bg-black/[0.025] transition-colors duration-150 group',
}
