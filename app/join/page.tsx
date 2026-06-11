import JoinForm from './JoinForm'
import Slideshow from './Slideshow'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Obra Online Application Form',
  description: 'Apply for a position in Obra Creative Media Productions.',
  openGraph: {
    title: 'Join Obra Creative Media Productions',
    description: 'Apply for a position in Obra CMP — Photography, Videography, Graphic Design, Animation, and more.',
    url: 'https://your-vercel-domain.vercel.app/join',
    siteName: 'Obra Online Application Form',
    images: [
      {
        url: 'https://ccs-obra.vercel.app/join',
        width: 1200,
        height: 630,
        alt: 'Obra Creative Media Productions — Join Us',
      },
    ],
    locale: 'en_PH',
    type: 'website',
  },
}

async function getMemberCount(): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('member_status', 'active')
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function JoinPage() {
  const memberCount = await getMemberCount()

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">

      {/* =====================================================
          MOBILE SLIDESHOW
      ===================================================== */}
      <div className="relative h-55 w-full overflow-hidden bg-[#0A0A0A] lg:hidden">
        <Slideshow variant="panel" />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))',
            pointerEvents: 'none',
          }}
        />

        <div className="absolute left-4 top-4 z-10">
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: '#CC0000',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: 4,
            }}
          >
            Dominican College of Tarlac
          </span>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 42,
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              lineHeight: 0.9,
              letterSpacing: '0.03em',
            }}
          >
            OBRA <span style={{ color: '#CC0000' }}>CMP</span>
          </h1>
        </div>
      </div>

      {/* =====================================================
          DESKTOP LEFT PANEL — full-bleed slideshow with
          frosted-glass info overlay
      ===================================================== */}
      <div
        className="hidden lg:flex lg:w-1/2 lg:shrink-0 lg:flex-col lg:h-screen"
        style={{
          position: 'relative',
          background: '#0A0A0A',
          overflow: 'hidden',
        }}
      >
        {/* Slideshow — fills the entire panel */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Slideshow variant="panel" />
        </div>

        {/* Dark gradient accent — adds a black accent over the photos
            without obscuring or blurring them */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background:
              'linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.22) 32%, rgba(10,10,10,0.14) 65%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* Info section — sits over the gradient, no glass/blur */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '36px 40px 28px',
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            Dominican College of Tarlac
          </span>

          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 64,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 0.92,
              letterSpacing: '0.03em',
              margin: '10px 0 0',
              textTransform: 'uppercase',
            }}
          >
            OBRA
            <br />
            <span style={{ color: '#CC0000' }}>CREATIVE</span>
            <br />
            MEDIA PRODUCTIONS
          </h1>

          <div
            style={{
              marginTop: 16,
              height: 1.5,
              width: 40,
              background: '#CC0000',
              borderRadius: 9999,
            }}
          />

          <p
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.65,
              maxWidth: 320,
            }}
          >
            The official creative organization of CCS — handling photography,
            videography, design, and animation for all CCS events.
          </p>
        </div>

        {/* Spacer — lets the slideshow show through unobstructed below
            the frosted info panel */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }} />
      </div>

      {/* =====================================================
          FORM PANEL
      ===================================================== */}
      <div
        id="join-scroll-panel"
        className="flex-1 lg:h-screen lg:overflow-y-auto"
        style={{
          background: '#F7F7F5',
        }}
      >
        <div
          className="mx-auto w-full max-w-160 px-5 py-10 sm:px-8 lg:px-10 lg:py-12"
        >
          {/* Section eyebrow */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: 3,
                  width: 24,
                  borderRadius: 9999,
                  background: '#CC0000',
                }}
              />
              <span
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 10.5,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#999',
                }}
              >
                Membership Application
              </span>
            </div>

            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#111',
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Join our Family.
            </h2>

            <p
              style={{
                marginTop: 6,
                fontSize: 13.5,
                color: '#888',
                lineHeight: 1.6,
              }}
            >
              Apply for a position in Obra Creative Media Productions. Fields
              marked <span style={{ color: '#CC0000' }}>*</span> are required.
            </p>
          </div>

          {/* Stats strip */}
          <div
            style={{
              marginBottom: 28,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            {[
              {
                value: String(memberCount),
                label: 'Current Members',
              },
              {
                value: '6',
                label: 'Open Roles',
              },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  borderLeft:
                    i > 0
                      ? '1px solid rgba(0,0,0,0.06)'
                      : undefined,
                }}
              >
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#111',
                    margin: 0,
                  }}
                >
                  {s.value}
                </p>

                <p
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#aaa',
                    margin: '4px 0 0',
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.07)',
              background: '#fff',
              padding: '28px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.04)',
            }}
          >
            <JoinForm />
          </div>
        </div>
      </div>
    </div>
  )
}
