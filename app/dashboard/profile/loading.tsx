import { Skeleton } from '@/components/Skeleton'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: 24 }}>
      {children}
    </div>
  )
}

export default function ProfileLoading() {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <Skeleton w={160} h={26} r={7} />
        <Skeleton w={320} h={13} r={6} style={{ marginTop: 10 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Identity card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Skeleton w={72} h={72} r={999} />
            <div style={{ flex: 1 }}>
              <Skeleton w={180} h={18} r={6} />
              <Skeleton w={120} h={12} r={5} style={{ marginTop: 8 }} />
              <Skeleton w={220} h={20} r={999} style={{ marginTop: 12 }} />
            </div>
          </div>
        </Card>

        {/* Form + skills + password cards */}
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton w={140} h={12} r={5} />
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton h={38} r={8} />
              <Skeleton h={38} r={8} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
