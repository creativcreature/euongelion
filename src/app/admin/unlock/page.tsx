'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const response = await fetch('/api/admin/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-cream dark:bg-[#1a1a1a]">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-display text-5xl mb-4">EUONGELION</h1>
          <p className="text-label text-xs" style={{ color: '#B8860B' }}>ADMIN ACCESS</p>
        </div>

        <div className="bg-white p-8 shadow-sm">
          <p className="text-serif-italic text-lg mb-6 text-center">
            Enter password to unlock full site access.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-4 mb-4 text-black dark:text-cream bg-cream dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-gray-700 focus:border-[#B8860B] outline-none font-serif italic"
              autoFocus
            />

            {error && (
              <p className="text-red-600 mb-4 text-center text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-black p-4 text-label text-xs hover:bg-gray-800 transition-colors"
              style={{ color: '#FAF9F6' }}
            >
              UNLOCK
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Back to site
          </button>
        </div>
      </div>
    </div>
  )
}
