'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_MB = 9
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  fullName,
}: {
  userId: string
  currentAvatarUrl: string | null
  fullName: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    // Validate size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`)
      return
    }

    setError('')
    setUploading(true)

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const ext = file.name.split('.').pop()
      const filePath = `${userId}/avatar.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        setError(uploadError.message)
        setPreview(currentAvatarUrl)
        setUploading(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Add cache buster so browser picks up the new image
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId)

      if (updateError) {
        setError(updateError.message)
        setUploading(false)
        return
      }

      setPreview(urlWithCacheBust)
      router.refresh()
    } catch {
      setError('Upload failed. Please try again.')
      setPreview(currentAvatarUrl)
    }

    setUploading(false)
  }

  async function handleRemove() {
    setUploading(true)
    setError('')

    // Delete from storage
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    for (const ext of extensions) {
      await supabase.storage.from('avatars').remove([`${userId}/avatar.${ext}`])
    }

    // Clear from profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setPreview(null)
      router.refresh()
    }

    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Avatar display */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
          cursor: uploading ? 'not-allowed' : 'pointer',
          position: 'relative', flexShrink: 0,
          border: '2px solid rgba(0,0,0,0.08)',
          transition: 'border-color 0.15s ease',
        }}
        title="Click to change photo"
      >
        {preview ? (
          <img src={preview} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {initials}
          </div>
        )}

        {/* Overlay on hover */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: uploading ? 1 : 0, transition: 'opacity 0.15s ease',
          color: '#fff', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
        }}
          className="hover:opacity-100"
        >
          {uploading ? '...' : 'EDIT'}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Action links */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ fontSize: '11.5px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >
          {uploading ? 'Uploading...' : 'Change'}
        </button>
        {preview && !uploading && (
          <>
            <span style={{ color: '#ddd', fontSize: '11px' }}>·</span>
            <button
              onClick={handleRemove}
              style={{ fontSize: '11.5px', color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Remove
            </button>
          </>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '11px', color: '#CC0000', textAlign: 'center', maxWidth: '140px' }}>{error}</p>
      )}
    </div>
  )
}