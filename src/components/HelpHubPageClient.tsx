'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'

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
      'No. You can run a Soul Audit, preview options, and read everything first. Sign in is required to save bookmarks, highlights, notes, and synced reading progress.',
  },
  {
    category: 'Soul Audit',
    question: 'Why do I see three options first?',
    answer:
      'The flow is selection-first. The Soul Audit reads what you wrote and offers three reading paths — each grounded in Scripture and the historic voices of the church, with a short preview of why it fits. Your full devotional plan is composed only after you choose one.',
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
      'The Daily Bread is the daily edition: a front-page reading from the catalog each day (with a genuinely new Sunday feature), plus a daily practice, a Greek or Hebrew word of the day, a prayer printed straight from Scripture, puzzles, and The Gallery. Your saved things live in the Library.',
  },
  {
    category: 'Daily Bread',
    question: 'How do I replay the onboarding tutorial?',
    answer:
      'Open Settings and use the Tutorial section (Settings → Tutorial). The walkthrough link at the top of this page goes straight there.',
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

          {/* Sits above the product walkthrough on purpose: this hub is
              titled "Help", and some fraction of the people who search that
              word are not looking for a tutorial. */}
          <section className="mb-10 border-b border-[var(--color-border)] pb-8">
            <p className="text-label vw-small mb-3 text-gold">
              IF YOU NEED REAL-WORLD HELP
            </p>
            <p className="vw-body text-secondary mb-4">
              This page is about using the app. If you need a crisis line, a bed
              tonight, food, help with rent or power, a doctor, or a lawyer in
              Georgia, we keep a checked list of those numbers.
            </p>
            <Link
              href="/seeking-help-georgia"
              className="text-label vw-small link-highlight"
            >
              Seeking help in Georgia →
            </Link>
          </section>

          <section className="mb-10 border-b border-[var(--color-border)] pb-8">
            <p className="text-label vw-small mb-3 text-gold">WALKTHROUGH</p>
            <div className="flex flex-wrap items-center gap-4">
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
        <SiteBottom />
      </main>
    </div>
  )
}
