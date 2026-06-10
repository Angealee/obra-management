import JoinForm from './JoinForm'
import Slideshow from './Slideshow'

export const metadata = {
  title: 'Obra Online Application Form',
}

async function getMemberCount(): Promise<number> {
  return 42
}

export default async function JoinPage() {
  const memberCount = await getMemberCount()

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">

      {/* =====================================================
          MOBILE SLIDESHOW (from 2nd set)
      ===================================================== */}
      <div className="relative h-[220px] w-full overflow-hidden bg-[#0A0A0A] lg:hidden">
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
          DESKTOP LEFT PANEL (your original)
      ===================================================== */}
      <div
        className="hidden lg:flex lg:w-[42%] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen"
        style={{
          background: '#0A0A0A',
          overflow: 'hidden',
        }}
      >
        {/* Dark info section */}
        <div
          style={{
            padding: '36px 40px 28px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
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
            MEDIA
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
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.65,
              maxWidth: 280,
            }}
          >
            The official creative organization of CCS — handling photography,
            videography, design, and animation for all CCS events.
          </p>
        </div>

        {/* Slideshow */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <Slideshow variant="panel" />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.5) 100%)',
              zIndex: 1,
            }}
          />
        </div>
      </div>

      {/* =====================================================
          FORM PANEL
      ===================================================== */}
      <div
        className="flex-1"
        style={{
          background: '#F7F7F5',
          overflowY: 'auto',
        }}
      >
        <div
          className="mx-auto w-full max-w-[640px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12"
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
                value: 'secret muna',
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