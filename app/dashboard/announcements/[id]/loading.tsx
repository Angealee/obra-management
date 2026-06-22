import { Skeleton, SkeletonBackHeader } from '@/components/Skeleton'

export default function AnnouncementDetailLoading() {
  return (
    <div className="max-w-2xl">
      <SkeletonBackHeader badge />
      {/* Announcement body */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 24 }}>
        <Skeleton w="92%" h={13} r={6} />
        <Skeleton w="98%" h={13} r={6} style={{ marginTop: 10 }} />
        <Skeleton w="85%" h={13} r={6} style={{ marginTop: 10 }} />
        <Skeleton w="70%" h={13} r={6} style={{ marginTop: 10 }} />
      </div>
    </div>
  )
}
