import { SkeletonBackHeader, SkeletonDetailCard } from '@/components/Skeleton'

export default function DutyDetailLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader badge />
      {/* Context (read-only details) */}
      <SkeletonDetailCard rows={4} />
      {/* Editable description / priority / due date */}
      <SkeletonDetailCard rows={3} />
    </div>
  )
}
