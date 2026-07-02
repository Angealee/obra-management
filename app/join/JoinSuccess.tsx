'use client'

import Image from 'next/image'
import { CheckCircle } from 'lucide-react'

// Post-submission screen: confirmation + the Messenger group-chat QR code.
export default function JoinSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center step-content">

      {/* Success icon */}
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
        <CheckCircle size={30} className="text-green-600" />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
        Application Submitted!
      </h3>
      <p style={{ fontSize: 13.5, color: '#666', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 28px' }}>
        Thank you for applying to Obra Creative Media Productions.
        We&apos;ll review your application and get back to you soon.
      </p>

      {/* Divider */}
      <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 28 }} />

      {/* QR Section */}
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
      }}>
        Next Step
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: '0 0 4px' }}>
        Join our Messenger Group Chat
      </p>

      <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
        Scan the QR code below to join the Obra applicants group chat
        and stay updated on your application status.
      </p>

      {/* QR Code */}
      <div style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        padding: 16,
        background: '#fff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        display: 'inline-block',
        marginBottom: 16,
      }}>
        <Image
          src="/qrgc.jpg"
          alt="Messenger Group Chat QR Code"
          width={200}
          height={200}
          style={{
            width: 200,
            height: 200,
            objectFit: 'contain',
            display: 'block',
            borderRadius: 8,
          }}
        />
      </div>

      <p style={{ fontSize: 12, color: '#bbb', marginBottom: 0 }}>
        Open your camera app and point it at the QR code
      </p>

      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 4px' }}>
        If QR code did not work, message me on Facebook: <a href="https://www.facebook.com/Angealeeeee/" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}><br></br>Mr. Koby Macale</a>
      </p>

    </div>
  )
}
