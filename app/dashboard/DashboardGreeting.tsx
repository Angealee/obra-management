'use client'

import { useEffect, useState } from 'react'

function greetingWord(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Time-aware dashboard greeting.
 *
 * Hydration-safe by construction: the first client render uses `serverHour`
 * (the Manila hour the server already computed), so the server HTML and the
 * initial client render are identical — no mismatch. Only AFTER mount does it
 * refine to the viewer's own local hour, which is a normal post-hydration
 * update rather than a hydration error.
 *
 * Font intentionally matches the rest of the app's page titles (DM Sans 700)
 * instead of the thin Bebas Neue display face.
 */
export default function DashboardGreeting({
  name,
  serverHour,
}: {
  name: string
  serverHour: number
}) {
  const [hour, setHour] = useState(serverHour)

  useEffect(() => {
    setHour(new Date().getHours())
  }, [])

  return (
    <h1
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 'clamp(27px, 4.2vw, 34px)',
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: '#111',
        lineHeight: 1.08,
        margin: 0,
      }}
    >
      {greetingWord(hour)}, {name}.
    </h1>
  )
}
