import Link from 'next/link'
import type { Module } from '@/types'
import { typographer } from '@/lib/typographer'

export default function JourneyModule({ module }: { module: Module }) {
  if (!module.journeyToday) return null

  const yesterday = module.journeyYesterday
  const today = module.journeyToday
  const tomorrow = module.journeyTomorrow

  return (
    <section className="journey-module my-12 md:my-16">
      <p
        className="module-sublabel mb-5"
        style={{ color: 'var(--color-gold)' }}
      >
        THIS WEEK&rsquo;S JOURNEY
      </p>

      <div
        className="grid gap-4 md:grid-cols-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {yesterday ? (
          <Link
            href={`/devotional/${yesterday.slug}`}
            className="journey-cell journey-yesterday block py-4 type-prose link-highlight"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <p className="text-label vw-small mb-1" style={{ opacity: 0.7 }}>
              YESTERDAY · DAY {yesterday.day}
            </p>
            <p className="vw-body" style={{ fontStyle: 'italic' }}>
              {typographer(yesterday.title)}
            </p>
          </Link>
        ) : (
          <div className="journey-cell journey-yesterday py-4">
            <p className="text-label vw-small mb-1" style={{ opacity: 0.5 }}>
              FIRST DAY OF THE WEEK
            </p>
          </div>
        )}

        <div
          className="journey-cell journey-today py-4"
          style={{
            borderTop: '2px solid var(--color-gold)',
            borderBottom: '2px solid var(--color-gold)',
          }}
        >
          <p
            className="text-label vw-small mb-1"
            style={{ color: 'var(--color-gold)' }}
          >
            TODAY · DAY {today.day}
          </p>
          <p className="vw-body type-prose" style={{ fontStyle: 'italic' }}>
            {typographer(today.title)}
          </p>
        </div>

        {tomorrow ? (
          <Link
            href={`/devotional/${tomorrow.slug}`}
            className="journey-cell journey-tomorrow block py-4 type-prose link-highlight"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <p className="text-label vw-small mb-1" style={{ opacity: 0.7 }}>
              TOMORROW · DAY {tomorrow.day}
            </p>
            <p className="vw-body" style={{ fontStyle: 'italic' }}>
              {typographer(tomorrow.title)}
            </p>
          </Link>
        ) : (
          <div className="journey-cell journey-tomorrow py-4">
            <p className="text-label vw-small mb-1" style={{ opacity: 0.5 }}>
              END OF THE WEEK
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
