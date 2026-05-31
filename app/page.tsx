import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Obra</h1>
        <p className="text-gray-500 mb-8">Creative Media Productions — Management System</p>
        <Link
          href="/login"
          className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}