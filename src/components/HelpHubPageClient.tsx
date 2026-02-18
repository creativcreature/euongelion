'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

type HelpFaq = {
  category: 'Getting Started' | 'Soul Audit' | 'Daily Bread' | 'Account'
  question: string
  answer: string
}

const FAQ_ITEMS: HelpFaq[] = [
  {
    category: 'Getting Started',
    question: 'Do I need to sign up first?',
    answer:
      'No. You can run a Soul Audit and preview options first. Sign in is required when you save progress, highlights, notes, or chat.',
  },
  {
    category: 'Soul Audit',
    question: 'Why do I see five options first?',
    answer:
      'The flow is selection-first: 3 AI-curated options and 2 curated prefab options. The full plan is only built after selection.',
  },
  {
    category: 'Soul Audit',
    question: 'Can I reroll options?',
    answer:
      'Yes, once per audit run. Reroll replaces the current options and cannot be undone.',
  },
  {
    category: 'Daily Bread',
    question: 'What is Daily Bread?',
    answer:
      'Daily Bread is your devotional home after activation. It centralizes active day, archive, bookmarks, highlights, notes, and chat history.',
  },
  {
    category: 'Daily Bread',
    question: 'How do I replay the onboarding tutorial?',
    answer:
      'Open Daily Bread and select “Replay Tutorial,” or use the replay link in Settings.',
  },
  {
    category: 'Account',
    question: 'Can I use dark mode and system mode?',
    answer:
      'Yes. Theme mode is available from the shell and Settings. Mobile mode controls are inside the menu panel.',
  },
]

const CATEGORIES = [
  'All',
  'Getting Started',
  'Soul Audit',
  'Daily Bread',
  'Account',
] as const

export default function HelpHubPageClient() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')

  const filteredFaq = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return FAQ_ITEMS.filter((item) => {
      const categoryMatch = category === 'All' || item.category === category
      if (!categoryMatch) return false
      if (!normalized) return true
      return (
        item.question.toLowerCase().includes(normalized) ||
        item.answer.toLowerCase().includes(normalized)
      )
    })
  }, [category, query])

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-5xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'HELP' }]}
          />

          <header className="mb-10 border-b border-[var(--color-border)] pb-7">
            <p className="text-label vw-small mb-3 text-gold">HELP CENTER</p>
            <h1 className="vw-heading-md mb-4">Get answers and keep moving.</h1>
            <p className="vw-body text-secondary">
              Search help topics, review the homepage FAQ answers, and replay
              the devotional walkthrough anytime.
            </p>
          </header>

          <section className="mb-10 border-b border-[var(--color-border)] pb-8">
            <p className="text-label vw-small mb-3 text-gold">WALKTHROUGH</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/daily-bread?tutorial=1"
                className="mock-btn text-label"
              >
                REPLAY DAILY BREAD TUTORIAL
              </Link>
              <Link
                href="/settings#tutorial"
                className="text-label vw-small link-highlight"
              >
                Open settings guidance
              </Link>
            </div>
          </section>

          <section id="faq" className="pb-16">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-label vw-small text-gold">FAQ</p>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search FAQ..."
                className="w-full max-w-sm border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                aria-label="Search help FAQ"
              />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
                  onClick={() => setCategory(item)}
                  style={
                    category === item
                      ? {
                          borderColor: 'var(--color-border-strong)',
                          color: 'var(--color-gold)',
                        }
                      : undefined
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {filteredFaq.length === 0 ? (
                <p className="vw-small text-muted">
                  No FAQ results matched this search.
                </p>
              ) : (
                filteredFaq.map((item) => (
                  <article
                    key={`${item.category}-${item.question}`}
                    className="border border-[var(--color-border)] p-4"
                  >
                    <p className="text-label vw-small mb-2 text-gold">
                      {item.category}
                    </p>
                    <h2 className="vw-body mb-2">{item.question}</h2>
                    <p className="vw-small text-secondary">{item.answer}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
