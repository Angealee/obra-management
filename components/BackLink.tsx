import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// A visible, touchable "back" control (bordered chip) — replaces the faint
// gray text links that were easy to miss. Styling lives in .back-link.
export default function BackLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="back-link">
      <ArrowLeft size={15} strokeWidth={2.2} />
      <span>{children}</span>
    </Link>
  )
}
