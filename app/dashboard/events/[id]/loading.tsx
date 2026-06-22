import { SkeletonBackHeader, SkeletonDetailCard, SkeletonTable } from '@/components/Skeleton'

export default function EventDetailLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader badge />
      {/* Event details */}
      <SkeletonDetailCard rows={6} />
      {/* Duties list */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 24 }}>
        <SkeletonTable rows={3} />
      </div>
    </div>
  )
}
