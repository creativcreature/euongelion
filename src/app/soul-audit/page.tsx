'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  questions,
  categories,
  calculatePathway,
  getRecommendedSeries,
  type Pathway,
  type Category,
} from '@/lib/soul-audit-questions'
import { saveSoulAuditResult } from '@/lib/db/soul-audit'

type Step = 'intro' | 'questions' | 'results'

export default function SoulAuditPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, Pathway>>({})
  const [results, setResults] = useState<{
    pathway: Pathway
    scores: Record<Pathway, number>
    breakdown: Record<Category, Pathway>
    recommended: string[]
  } | null>(null)

  const handleAnswer = useCallback(async (pathway: Pathway) => {
    const question = questions[currentQuestion]
    const newResponses = { ...responses, [question.id]: pathway }
    setResponses(newResponses)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Calculate results
      const { pathway: resultPathway, scores, breakdown } = calculatePathway(newResponses)
      const recommended = getRecommendedSeries(resultPathway)
      setResults({ pathway: resultPathway, scores, breakdown, recommended })
      setStep('results')

      // Save results to database
      await saveSoulAuditResult(resultPathway, scores, breakdown, newResponses)
    }
  }, [currentQuestion, responses])

  const pathwayNames: Record<Pathway, string> = {
    sleep: 'Seeker',
    awake: 'Growing',
    shepherd: 'Mature',
  }

  const pathwayDescriptions: Record<Pathway, string> = {
    sleep: "You're at the beginning of exploring faith. Our Seeker pathway offers foundational content that explains core concepts without assuming prior knowledge.",
    awake: "You have a foundation and are actively growing in your faith. Our Growing pathway provides deeper content with practical application for your daily walk.",
    shepherd: "You have a mature faith and are ready to go deeper. Our Mature pathway offers rich theological content to equip you for teaching and leading others.",
  }

  // Intro Screen
  if (step === 'intro') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Link href="/" className="text-[#c19a6b] hover:underline mb-8 inline-block">
            ← Back
          </Link>

          <h1 className="text-4xl font-bold text-[#f7f3ed] mb-4">Soul Audit</h1>
          <p className="text-xl text-gray-400 mb-8">
            Discover your spiritual pathway
          </p>

          <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-[#f7f3ed] mb-4">What to expect:</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="text-[#c19a6b]">•</span>
                24 questions across 6 categories
              </li>
              <li className="flex gap-3">
                <span className="text-[#c19a6b]">•</span>
                Takes about 5-7 minutes
              </li>
              <li className="flex gap-3">
                <span className="text-[#c19a6b]">•</span>
                No right or wrong answers
              </li>
              <li className="flex gap-3">
                <span className="text-[#c19a6b]">•</span>
                Personalized content recommendations
              </li>
            </ul>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8 border border-[#c19a6b]/20">
            <p className="text-gray-300 text-sm">
              <strong className="text-[#c19a6b]">Genesis 3:9</strong> — "Where are you?"
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This is the question God asked Adam. Not because He didn't know, but because Adam needed to know. This audit helps you honestly assess where you are in your spiritual journey.
            </p>
          </div>

          <button
            onClick={() => setStep('questions')}
            className="w-full py-4 px-6 rounded-xl bg-[#c19a6b] text-[#0a0a0a] font-semibold text-lg hover:bg-[#d4ad7e] transition"
          >
            Begin Soul Audit
          </button>
        </div>
      </main>
    )
  }

  // Questions Screen
  if (step === 'questions') {
    const question = questions[currentQuestion]
    const category = categories.find((c) => c.id === question.category)
    const progress = ((currentQuestion + 1) / questions.length) * 100

    return (
      <main className="min-h-screen bg-[#0a0a0a] p-4">
        <div className="max-w-2xl mx-auto pt-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{category?.name}</span>
              <span>{currentQuestion + 1} of {questions.length}</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c19a6b] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#f7f3ed] mb-2">
              {question.text}
            </h2>
            <p className="text-gray-500 text-sm">{category?.description}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option.pathway)}
                className="w-full text-left p-4 rounded-xl bg-[#1a1a1a] border border-transparent hover:border-[#c19a6b]/50 text-gray-300 hover:text-[#f7f3ed] transition"
              >
                {option.text}
              </button>
            ))}
          </div>

          {/* Back button */}
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="mt-6 text-gray-500 hover:text-[#c19a6b] transition"
            >
              ← Previous question
            </button>
          )}
        </div>
      </main>
    )
  }

  // Results Screen
  if (step === 'results' && results) {
    const { pathway, scores, recommended } = results
    const total = scores.sleep + scores.awake + scores.shepherd

    return (
      <main className="min-h-screen bg-[#0a0a0a] p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="text-center mb-8">
            <p className="text-[#c19a6b] text-sm uppercase tracking-wider mb-2">Your Pathway</p>
            <h1 className="text-5xl font-bold text-[#f7f3ed] mb-4">
              {pathwayNames[pathway]}
            </h1>
            <p className="text-gray-400 max-w-md mx-auto">
              {pathwayDescriptions[pathway]}
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-[#f7f3ed] mb-4">Your Profile</h3>
            <div className="space-y-4">
              {(['sleep', 'awake', 'shepherd'] as Pathway[]).map((p) => (
                <div key={p}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{pathwayNames[p]}</span>
                    <span className="text-gray-500">{Math.round((scores[p] / total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        p === pathway ? 'bg-[#c19a6b]' : 'bg-gray-700'
                      }`}
                      style={{ width: `${(scores[p] / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Series */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#f7f3ed] mb-4">
              Recommended for You
            </h3>
            <div className="grid gap-3">
              {recommended.map((slug) => (
                <Link
                  key={slug}
                  href={`/series/${slug}`}
                  className="block p-4 bg-[#1a1a1a] rounded-xl hover:bg-[#252525] transition border border-transparent hover:border-[#c19a6b]/30"
                >
                  <span className="text-[#f7f3ed]">
                    {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  <span className="text-[#c19a6b] ml-2">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href={`/series/${recommended[0]}`}
              className="block w-full py-4 px-6 rounded-xl bg-[#c19a6b] text-[#0a0a0a] font-semibold text-center hover:bg-[#d4ad7e] transition"
            >
              Start Your Journey
            </Link>
            <Link
              href="/"
              className="block w-full py-4 px-6 rounded-xl bg-[#1a1a1a] text-[#f7f3ed] font-semibold text-center hover:bg-[#252525] transition"
            >
              Explore All Series
            </Link>
          </div>

          {/* Retake */}
          <button
            onClick={() => {
              setStep('intro')
              setCurrentQuestion(0)
              setResponses({})
              setResults(null)
            }}
            className="w-full mt-6 text-gray-500 hover:text-[#c19a6b] transition text-sm"
          >
            Retake Soul Audit
          </button>
        </div>
      </main>
    )
  }

  return null
}
