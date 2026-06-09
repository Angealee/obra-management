import JoinForm from './JoinForm'

export const metadata = {
  title: 'Join Obra — CCS Creative Media Productions',
}

export default function JoinPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F7F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 80px',
    }}>

      {/* Header / Branding */}
      <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 560 }}>
        <div style={{
          display: 'inline-block',
          background: '#CC0000',
          color: '#fff',
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.12em',
          padding: '4px 12px',
          borderRadius: 4,
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          College of Computer Studies
        </div>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 52,
          letterSpacing: '0.04em',
          color: '#111',
          lineHeight: 1,
          marginBottom: 12,
        }}>
          OBRA CREATIVE MEDIA PRODUCTIONS
        </h1>
        <p style={{
          fontFamily: 'DM Sans',
          fontSize: 15,
          color: '#666',
          lineHeight: 1.7,
          marginBottom: 0,
        }}>
          We are the official creative organization of the College of Computer Studies at
          Dominican College of Tarlac. We handle photography, videography, graphic design,
          animation, and all creative production needs for CCS events and activities.
        </p>
        <p style={{
          fontFamily: 'DM Sans',
          fontSize: 14,
          color: '#999',
          marginTop: 10,
          fontStyle: 'italic',
        }}>
          Fill out the form below to apply for membership.
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        width: '100%',
        maxWidth: 680,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 16,
        padding: '36px 40px',
      }}>
        <h2 style={{
          fontFamily: 'DM Sans',
          fontSize: 18,
          fontWeight: 700,
          color: '#111',
          marginBottom: 4,
        }}>
          Membership Application
        </h2>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: '#999', marginBottom: 28 }}>
          Fields marked with * are required.
        </p>
        <JoinForm />
      </div>

      {/* Footer note */}
      <p style={{
        fontFamily: 'DM Sans',
        fontSize: 12,
        color: '#BBBBBB',
        marginTop: 32,
        textAlign: 'center',
      }}>
        This form is for internal use by CCS — Obra Creative Media Productions
      </p>
    </div>
  )
}