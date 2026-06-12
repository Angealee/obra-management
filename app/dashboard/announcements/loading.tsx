import { SkeletonHeader, SkeletonCardStack } from '@/components/Skeleton'

export default function AnnouncementsLoading() {
  return (
    <div>
      <SkeletonHeader />
      <SkeletonCardStack count={5} />
    </div>
  )
}
