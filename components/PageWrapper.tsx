'use client'

import { usePathname } from 'next/navigation'

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter" style={{ padding: '32px', maxWidth: '1100px' }}>
      {children}
    </div>
  )
}