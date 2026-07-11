/**
 * /design/imagery-samples — internal founder-review surface for the
 * 2026-07-10 imagery run (Task 6 Phase 1). Noindexed; not linked from any
 * navigation. Shows the one-sample-per-format set live in production so the
 * full generation run can be approved or redirected at the final gate.
 * Plan + ledger: docs/run/IMAGERY_PLAN.md.
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Imagery Samples (internal review)',
  robots: { index: false, follow: false },
}

const SAMPLES = [
  {
    src: '/images/site/samples/genesis-first-light-wide.webp',
    width: 1600,
    height: 686,
    format: 'Wide header · 21:9',
    subject: 'Genesis 1 — first light over the deep',
    slot: 'Format sample for series/plan wide headers (e.g. Bible-in-a-Year detail). Left third stays cream for headline overlay.',
  },
  {
    src: '/images/site/samples/inkwell-name-it.webp',
    width: 900,
    height: 657,
    format: 'Card · 4:3',
    subject: 'Inkwell + dip pen — "Name it"',
    slot: 'WIRED LIVE: homepage “How it works” step 1 (replaced the mismatched bread bowl).',
  },
  {
    src: '/images/site/samples/oil-lamp-thumb.webp',
    width: 480,
    height: 480,
    format: 'Thumbnail · 1:1',
    subject: 'Clay oil lamp, single flame',
    slot: 'Format sample for Bible-365 per-day thumbnails (Phase 2 fill).',
  },
  {
    src: '/images/site/samples/empty-bookmarks.webp',
    width: 900,
    height: 657,
    format: 'Empty state · single object',
    subject: 'Ribbon holding a place in a closed book',
    slot: 'WIRED LIVE: Library → Bookmarks tab when empty.',
  },
  {
    src: '/images/site/samples/empty-clippings.webp',
    width: 900,
    height: 657,
    format: 'Empty state · single object',
    subject: 'Editor’s scissors + blank clipping',
    slot: 'WIRED LIVE: Library → Clippings tab when empty.',
  },
]

export default function ImagerySamplesPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="mx-auto w-full max-w-4xl shell-content-pad">
            <header className="mb-10 text-center">
              <p className="text-label vw-small mb-3 text-gold">
                INTERNAL REVIEW · IMAGERY RUN 2026-07-10
              </p>
              <h1 className="vw-heading-md">One sample per format.</h1>
              <p className="vw-small mt-3 text-secondary">
                Approve or redirect at the final gate — the full run (~112–130
                credits of the 500 cap) executes only after approval. The
                animated “grain shimmer” test is a CSS treatment, shown on the
                header sample below.
              </p>
            </header>

            {SAMPLES.map((sample) => (
              <figure key={sample.src} className="mb-12">
                <div
                  className={
                    sample.src.includes('genesis')
                      ? 'grain-shimmer-test'
                      : undefined
                  }
                >
                  <Image
                    src={sample.src}
                    alt={sample.subject}
                    width={sample.width}
                    height={sample.height}
                    className="w-full border"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
                <figcaption className="mt-3">
                  <p className="text-label vw-small text-gold">
                    {sample.format}
                  </p>
                  <p className="vw-body mt-1">{sample.subject}</p>
                  <p className="vw-small mt-1 text-muted">{sample.slot}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
