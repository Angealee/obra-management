'use client'

import { usePathname } from 'next/navigation'

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {children}
    </div>
  )
}