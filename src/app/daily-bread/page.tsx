'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { getRecommendedSeries, type Pathway } from '@/lib/soul-audit-questions'

interface SoulAuditResult {
  pathway: Pathway
  scores: Record<Pathway, number>
  recommended?: string[]
  created_at?: string
}

export default function DailyBreadPage() {
  const [soulAuditResult, setSoulAuditResult] = useState<SoulAuditResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recommended, setRecommended] = useState<string[]>([])

  useEffect(() => {
    // Check localStorage for Soul Audit result
    const stored = localStorage.getItem('soul_audit_result')
    if (stored) {
      try {
        const result = JSON.parse(stored) as SoulAuditResult
        setSoulAuditResult(result)
        // Get recommended series based on pathway
        const recs = result.recommended || getRecommendedSeries(result.pathway)
        setRecommended(recs)
      } catch (e) {
        console.error('Failed to parse Soul Audit result:', e)
      }
    }
    setIsLoading(false)
  }, [])

  const pathwayNames: Record<Pathway, string> = {
    sleep: 'Seeker',
    awake: 'Growing',
    shepherd: 'Mature',
  }

  const pathwayDescriptions: Record<Pathway, string> = {
    sleep: "You're exploring faith with fresh eyes. These devotionals will guide you gently through foundational truths.",
    awake: "You're actively growing in your walk. These devotionals will deepen your understanding and application.",
    shepherd: "You're ready for deeper waters. These devotionals will equip you for teaching and leading others.",
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-[#FAF9F6] dark:bg-[#0a0a0a] p-4">
          <div className="max-w-2xl mx-auto pt-12 text-center">
            <p className="text-stone-500 dark:text-stone-400">Loading...</p>
          </div>
        </main>
      </>
    )
  }

  // No Soul Audit taken yet
  if (!soulAuditResult) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-[#FAF9F6] dark:bg-[#0a0a0a] p-4">
          <div className="max-w-2xl mx-auto pt-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-stone-900 dark:text-[#f7f3ed] mb-4">
                Your Daily Bread
              </h1>
              <p className="text-xl text-stone-600 dark:text-stone-400">
                Personalized devotionals for your journey
              </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-sm border border-stone-200 dark:border-stone-700 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#c19a6b]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-[#f7f3ed] mb-3">
                Start Your Journey
              </h2>
              <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
                Take the Soul Audit to discover which devotionals are best suited for where you are in your spiritual journey.
              </p>
              <Link
                href="/soul-audit"
                className="inline-block px-8 py-4 bg-[#c19a6b] text-white rounded-xl font-medium hover:bg-[#a88756] transition"
              >
                Take the Soul Audit
              </Link>
              <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
                Or{' '}
                <Link href="/all-devotionals" className="text-[#c19a6b] hover:underline">
                  browse all devotionals
                </Link>
              </p>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Soul Audit completed - show personalized recommendations
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-[#FAF9F6] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-2xl mx-auto pt-12">
          {/* Pathway Badge */}
          <div className="text-center mb-8">
            <span className="text-sm text-[#c19a6b] uppercase tracking-wider">
              Your Pathway
            </span>
            <h1 className="text-4xl font-bold text-stone-900 dark:text-[#f7f3ed] mt-2 mb-3">
              {pathwayNames[soulAuditResult.pathway]}
            </h1>
            <p className="text-stone-600 dark:text-stone-400 max-w-md mx-auto">
              {pathwayDescriptions[soulAuditResult.pathway]}
            </p>
          </div>

          {/* Today's Bread */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 mb-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-[#f7f3ed] mb-4">
              Your Recommended Series
            </h2>
            <div className="space-y-3">
              {recommended.map((slug, index) => (
                <Link
                  key={slug}
                  href={`/series/${slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-[#252525] hover:bg-stone-100 dark:hover:bg-[#2a2a2a] transition group"
                >
                  <span className="w-8 h-8 rounded-full bg-[#c19a6b]/20 text-[#c19a6b] flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-stone-900 dark:text-[#f7f3ed] group-hover:text-[#c19a6b] transition">
                    {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  <span className="text-[#c19a6b]">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`/series/${recommended[0]}`}
              className="block p-4 bg-[#c19a6b] text-white rounded-xl text-center font-medium hover:bg-[#a88756] transition"
            >
              Start Your First Devotional
            </Link>
            <Link
              href="/all-devotionals"
              className="block p-4 bg-white dark:bg-[#1a1a1a] text-stone-900 dark:text-[#f7f3ed] rounded-xl text-center font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-[#252525] transition"
            >
              Browse All Devotionals
            </Link>
          </div>

          {/* Retake Option */}
          <p className="mt-8 text-center text-sm text-stone-500 dark:text-stone-400">
            Not quite right?{' '}
            <Link href="/soul-audit" className="text-[#c19a6b] hover:underline">
              Retake the Soul Audit
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
