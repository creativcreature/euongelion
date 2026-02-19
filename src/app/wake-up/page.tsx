import Link from 'next/link'
import Image from 'next/image'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import { scriptureLeadFromFramework } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'
import { WAKEUP_SERIES_ORDER, SERIES_DATA } from '@/data/series'

const HOW_STEPS = [
  {
    num: '1. Pick it.',
    body: 'Pick a question that speaks to where you are.',
    image: '/images/illustrations/euangelion-homepage-engraving-09.svg',
  },
  {
    num: '2. Read it.',
    body: 'Read one devotional per day for 5 days.',
    image: '/images/illustrations/euangelion-homepage-engraving-10.svg',
  },
  {
    num: '3. Walk it.',
    body: 'Reflect, journal, and let God reorder your heart.',
    image: '/images/illustrations/euangelion-homepage-engraving-11.svg',
  },
]

export default function WakeUpPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader brandWord="WAKE UP" tone="wake" />
        <Breadcrumbs
          className="mock-breadcrumb-row"
          items={[{ label: 'HOME', href: '/' }, { label: 'WAKE-UP' }]}
        />

        {/* Hero */}
        <section className="mock-section-center" style={{ minHeight: '260px' }}>
          <p className="text-label mock-kicker">
            {WAKEUP_SERIES_ORDER.length} SERIES &middot;{' '}
            {WAKEUP_SERIES_ORDER.length * 5} DEVOTIONALS &middot; 5 DAYS EACH
          </p>
          <h1 className="mock-title-center">Wake Up.</h1>
          <p className="mock-subcopy-center">
            {typographer(
              'In a world drowning in noise, Wake Up offers something rare: clarity, rest, and truth. Seven questions for the searching. Five days per question. Ancient structure. Modern urgency.',
            )}
          </p>
        </section>

        {/* Problem Statement */}
        <section className="mock-section-center">
          <p className="mock-subcopy-center">
            {typographer(
              'We live in apocalyptic times. Political violence. Economic collapse. 43% more anxious than last year. The ground beneath us is shaking.',
            )}
          </p>
          <p
            className="mock-body"
            style={{ fontStyle: 'italic', marginTop: '0.6rem' }}
          >
            {typographer(
              'The seven questions below aren\u2019t easy. But they\u2019re honest. Each one invites you into a 5-day journey to seek first the kingdom\u2014and discover that everything else gets added.',
            )}
          </p>
        </section>

        {/* How It Works */}
        <section className="mock-section-center">
          <p className="text-label mock-kicker">HOW IT WORKS</p>
          <h2 className="mock-title-center">Three steps.</h2>
          <p className="mock-subcopy-center">
            {typographer(
              'Each series follows a chiastic arc\u2014building toward a revelation, then reflecting back. Ancient structure. Modern questions.',
            )}
          </p>
        </section>

        <section className="mock-steps-grid">
          {HOW_STEPS.map((step) => (
            <article key={step.num} className="mock-step-card">
              <div className="mock-step-image-wrap" aria-hidden="true">
                <div className="mock-step-image">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 100vw, 320px"
                  />
                </div>
              </div>
              <div className="mock-step-copy">
                <h3>{step.num}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Seven Questions */}
        <section className="mock-section-center">
          <p className="text-label mock-kicker">
            SEVEN QUESTIONS FOR THE SEARCHING
          </p>
          <h2 className="mock-title-center">Featured Series</h2>
          <p className="mock-subcopy-center">
            Seven questions. Five days each. Honest paths for wherever you are.
          </p>
        </section>

        <section className="mock-featured-grid mock-wakeup-series-grid">
          {WAKEUP_SERIES_ORDER.map((slug) => {
            const info = SERIES_DATA[slug]
            if (!info) return null

            return (
              <Link
                href={`/wake-up/series/${slug}`}
                key={slug}
                className="mock-featured-card mock-wakeup-series-card"
              >
                <p className="mock-scripture-lead">
                  {typographer(scriptureLeadFromFramework(info.framework))}
                </p>
                <h3>{info.title}.</h3>
                <p>{info.question}</p>
                <p className="mock-featured-preview">
                  {typographer(info.introduction.slice(0, 140).trim())}...
                </p>
                <p className="mock-featured-day text-label">
                  START WITH: {info.days[0]?.title || 'DAY 1'}
                </p>
                <span className="mock-featured-days text-label">
                  {info.days.length || 5} DAYS
                </span>
              </Link>
            )
          })}
        </section>

        {/* More */}
        <section className="mock-more-row">
          <Link href="/series" className="mock-btn text-label">
            ALL DEVOTIONALS
          </Link>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
        </section>

        {/* Bottom Brand */}
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
