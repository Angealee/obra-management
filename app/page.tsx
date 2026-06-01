'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [animating, setAnimating] = useState(false)

  const handleGetIn = () => {
    setAnimating(true)
    setTimeout(() => {
      router.push('/login')
    }, 800)
  }

  return (
    
    <main className="min-h-screen bg-white flex flex-col relative overflow-hidden">

      {/* swipe */}
      <div
        className={`absolute inset-0 bg-gray-900 z-50 transition-transform duration-900 ease-in-out ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
      />



      {/* Nav */}
      <nav className="flex justify-end p-5">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs">
          N
        </div>
      </nav>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <Image
          src="/obralogo.png"
          alt="Obra"
          width={420}
          height={106}
          className="mb-4"
        />
        <div className="w-lg h-px bg-gray-400 mb-1" />
        <p className="text-gray-700 text-lg mb-6 tracking-wide">
          A Member Management System.
        </p>
        <button
          onClick={handleGetIn}
          className="bg-gray-900 text-white text-sm tracking-wider px-9 py-3 rounded hover:bg-red-700 transition-colors"
        >
          Get In
        </button>
      </div>
      
      {/* Footer */}
      <p className="text-center text-sm text-gray-600 font-light tracking-widest pb-6 mb-5">
        © 2026 Obra Creative Media Productions
      </p>

    </main>
  )
}