import Image from 'next/image'

// Shared avatar: photo when available, initials fallback otherwise.
// Server-safe (no hooks). Replaces the hand-rolled copies that lived in the
// dashboard, activity feed, and members table.
export default function Avatar({
  name,
  src = null,
  size = 28,
  bg = '#111',
}: {
  name: string
  src?: string | null
  size?: number
  bg?: string
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(9, Math.round(size * 0.38)),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials || '•'}
    </div>
  )
}
