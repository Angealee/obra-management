import { SkeletonHeader, SkeletonTable } from '@/components/Skeleton'

export default function MembersLoading() {
  return (
    <div>
      <SkeletonHeader />
      <SkeletonTable rows={8} withAvatar />
    </div>
  )
}
