'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('Login result:', { data, error })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to dashboard after login
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Obra Creative Media Productions</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="sample@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </main>
  )
}