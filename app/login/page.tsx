'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Mail, Lock, ArrowRight, FolderOpen, Users, Calendar, Play, Users2, SkipForward, Calendar1, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#f9f9f8] flex flex-col lg:flex-row">

      {/* Left — form panel */}
      <div className="w-full lg:w-2/5 xl:w-1/3 min-h-screen bg-black flex flex-col px-12 sm:px-12 py-10 shrink-0">
        <div className="flex-1">

          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/whiteobralogo.jpg"
              alt="Obra"
              width={300}
              height={60}
              className="w-40 sm:w-52 h-auto"
            />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-medium text-white mb-1">Welcome!</h1>
          <p className="text-sm sm:text-base text-gray-300 font-light">
            Sign in to your account to continue
          </p>

          {/* Fields */}
          <div className="mt-7 space-y-5">

            <div>
              <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white font-normal mb-2">
                <Mail size={13} /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sample@gmail.com"
                className="w-full h-11 border border-gray-700 rounded-md px-4 text-sm bg-gray-900 text-white focus:bg-gray-800 focus:border-gray-400 focus:outline-none transition-colors placeholder:text-gray-600"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white font-normal mb-2">
                <Lock size={13} /> Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full h-11 border border-gray-700 rounded-md px-4 pr-12 text-sm bg-gray-900 text-white focus:bg-gray-800 focus:border-gray-400 focus:outline-none transition-colors placeholder:text-gray-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-right mt-2 cursor-pointer hover:text-gray-300 transition-colors">
                Forgot password?
              </p>
            </div>

            {error && (
              <div className="flex w-full items-center gap-2 text-xs text-red-400 bg-red-950 border border-red-900 rounded px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 bg-white hover:bg-red-600 text-black hover:text-white text-[11px] tracking-widest uppercase font-normal rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : <><span>Sign In</span> <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-800 mt-8">
          <p className="text-[11px] text-gray-600 tracking-wide">
            © 2026 Obra Creative Media Productions
          </p>
        </div>
      </div>

      {/* Right — decorative panel (hidden on mobile) */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(#e8e8e6 1px, transparent 1px), linear-gradient(90deg, #e8e8e6 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      >
        <div className="relative z-10 text-center px-8">
          <div className="w-24 h-24 rounded-full bg-black border border-gray-200 flex items-center justify-center mx-auto mb-6">
            <Play size={40} className="text-red-600" />
          </div>

          <p className="text-lg font-medium text-gray-900 mb-3">Creative Media Productions</p>
          <p className="text-m text-gray-900 font- max-w-xs mx-auto leading-relaxed">
            Manage members, events and duties in one platform.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
            {[
              { icon: <Users2 size={24} />, label: 'Members' },
              { icon: <Calendar size={24} />, label: 'Events' },
              { icon: <Calendar1 size={24} />, label: 'Schedule' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[14px] text-gray-500 bg-white border border-gray-200 rounded-full px-4 py-1.5"
              >
                <span className="text-red-600">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}