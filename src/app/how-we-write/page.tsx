/**
 * /how-we-write — Editorial transparency page.
 *
 * Explains how devotionals are composed: AI as composer/arranger (not
 * author), creedal anchoring, historic voices, plain-language Soul Audit
 * explanation, and privacy-honest statement about what is / is not stored.
 *
 * Server-rendered. No client JavaScript required.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { SERIES_COUNT } from '@/data/series'

export const metadata: Metadata = {
  title: 'How We Write',
  description:
    'How Euangelion devotionals are composed: AI as arranger, Scripture as authority, thirty-plus historic voices, creedal grounding, and plain-language Soul Audit transparency.',
  alternates: { canonical: '/how-we-write' },
  openGraph: {
    title: 'How We Write | Euangelion',
    description:
      'AI as composer and arranger — not author. Scripture verbatim. Thirty-plus historic voices. Creedal anchoring. Full transparency.',
    type: 'website',
    url: 'https://euangelion.app/how-we-write',
  },
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const HISTORIC_VOICES: Array<{ name: string; dates: string; note: string }> = [
  {
    name: 'Augustine of Hippo',
    dates: '354–430',
    note: 'Confessions, City of God',
  },
  {
    name: 'Thomas à Kempis',
    dates: '1380–1471',
    note: 'The Imitation of Christ',
  },
  { name: 'Martin Luther', dates: '1483–1546', note: 'Reformation theology' },
  {
    name: 'John Calvin',
    dates: '1509–1564',
    note: 'Institutes of the Christian Religion',
  },
  { name: 'John Bunyan', dates: '1628–1688', note: "The Pilgrim's Progress" },
  { name: 'Blaise Pascal', dates: '1623–1662', note: 'Pensées' },
  {
    name: 'Brother Lawrence',
    dates: 'c. 1614–1691',
    note: 'The Practice of the Presence of God',
  },
  { name: 'Matthew Henry', dates: '1662–1714', note: 'Biblical Commentary' },
  {
    name: 'Jonathan Edwards',
    dates: '1703–1758',
    note: 'Religious Affections, sermons',
  },
  {
    name: 'John Wesley',
    dates: '1703–1791',
    note: 'Journals, sermons on holiness',
  },
  {
    name: 'George Whitefield',
    dates: '1714–1770',
    note: 'Field preaching, revival sermons',
  },
  {
    name: 'William Wilberforce',
    dates: '1759–1833',
    note: 'Real Christianity',
  },
  { name: 'William Cowper', dates: '1731–1800', note: 'Olney Hymns' },
  {
    name: 'Charles Spurgeon',
    dates: '1834–1892',
    note: 'Morning & Evening, The Prince of Preachers',
  },
  { name: 'D. L. Moody', dates: '1837–1899', note: 'Evangelistic ministry' },
  {
    name: 'Andrew Murray',
    dates: '1828–1917',
    note: 'Abide in Christ, With Christ in the School of Prayer',
  },
  { name: 'E. M. Bounds', dates: '1835–1913', note: 'Power Through Prayer' },
  { name: 'F. B. Meyer', dates: '1847–1929', note: 'Devotional classics' },
  { name: 'G. K. Chesterton', dates: '1874–1936', note: 'Orthodoxy, Heretics' },
  {
    name: 'Oswald Chambers',
    dates: '1874–1917',
    note: 'My Utmost for His Highest',
  },
  {
    name: 'C. S. Lewis',
    dates: '1898–1963',
    note: 'Mere Christianity, The Screwtape Letters',
  },
  {
    name: 'A. W. Tozer',
    dates: '1897–1963',
    note: 'The Pursuit of God, The Knowledge of the Holy',
  },
  { name: 'Corrie ten Boom', dates: '1892–1983', note: 'The Hiding Place' },
  {
    name: 'Dietrich Bonhoeffer',
    dates: '1906–1945',
    note: 'The Cost of Discipleship, Life Together',
  },
  {
    name: 'Francis Schaeffer',
    dates: '1912–1984',
    note: 'True Spirituality, He Is There and He Is Not Silent',
  },
  { name: 'Jim Elliot', dates: '1927–1956', note: 'Journals' },
  { name: 'John Stott', dates: '1921–2011', note: 'The Cross of Christ' },
  { name: 'J. I. Packer', dates: '1926–2020', note: 'Knowing God' },
  {
    name: 'Henri Nouwen',
    dates: '1932–1996',
    note: 'The Return of the Prodigal Son',
  },
  {
    name: 'Eugene Peterson',
    dates: '1932–2018',
    note: 'A Long Obedience in the Same Direction',
  },
  {
    name: 'Dallas Willard',
    dates: '1935–2013',
    note: 'The Spirit of the Disciplines',
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionRule() {
  return <div className="how-we-rule mock-rule" aria-hidden="true" />
}

function SectionHeader({
  kicker,
  headline,
}: {
  kicker: string
  headline: string
}) {
  return (
    <div className="how-we-section-head">
      <p className="text-label mock-kicker text-gold">{kicker}</p>
      <h2 className="how-we-h2 mock-title">{headline}</h2>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HowWeWritePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'How We Write | Euangelion',
    description:
      'Editorial transparency statement for Euangelion — how devotionals are composed, what AI does and does not do, creedal anchoring, historic voices, and Soul Audit privacy.',
    url: 'https://euangelion.app/how-we-write',
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
  }

  return (
    <div className="mock-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main-content" className="mock-paper">
        <h1 className="sr-only">
          How We Write — Editorial Transparency | Euangelion
        </h1>

        <EuangelionShellHeader />

        {/* Page masthead */}
        <div className="how-we-masthead">
          <p className="text-label mock-kicker">EDITORIAL TRANSPARENCY</p>
          <p className="how-we-display mock-title-center">How we write</p>
          <p className="how-we-dek mock-subcopy-center">
            The devotionals on this site are composed from real sources —
            verbatim Scripture, the church&rsquo;s historic voices, and creedal
            conviction. Here is exactly how that works.
          </p>
        </div>

        <SectionRule />

        {/* Section A: AI as composer/arranger, not author */}
        <section className="how-we-section" aria-labelledby="sec-ai-role">
          <SectionHeader
            kicker="THE ROLE OF AI"
            headline="Composer and arranger — not author."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              Every devotional on Euangelion is assembled from pre-existing
              material: verbatim Scripture, historical quotations, and
              theological reflection drawn from the church&rsquo;s 2,000-year
              tradition. The AI does not invent content from nothing. It
              arranges, sequences, and bridges what is already there.
            </p>
            <p className="how-we-body">
              Think of it like a typesetter or an editor who selects the
              readings for morning prayer — the Scripture is not rewritten; the
              sermon is not fabricated. What is arranged is the order, the
              framing, and the connective tissue between passages that have
              always existed.
            </p>
            <ul className="how-we-list">
              <li>
                <strong>Scripture is always verbatim.</strong> No paraphrase, no
                invented quotations, no composite verses. The text is the text.
              </li>
              <li>
                <strong>The AI never adjudicates contested debates</strong>{' '}
                within Christianity. On questions where orthodox traditions
                disagree — free will, the exact nature of the Eucharist, modes
                of baptism, eschatological timelines — the devotionals present
                what Scripture says and let the reader stand in their tradition.
              </li>
              <li>
                <strong>Historic voices are used accurately.</strong> When the
                prose draws on Augustine, Spurgeon, or Tozer, it stays inside
                what those writers actually said. It does not put words in their
                mouths.
              </li>
            </ul>
          </div>
        </section>

        <SectionRule />

        {/* Section B: Creedal anchoring */}
        <section className="how-we-section" aria-labelledby="sec-creeds">
          <SectionHeader
            kicker="THEOLOGICAL ANCHOR"
            headline="Anchored in the ancient creeds."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              Every devotional is evaluated against two doctrinal benchmarks
              that the church has used for 1,700 years to define orthodox
              Christian conviction:
            </p>
            <div className="how-we-creed-row">
              <div className="how-we-creed-card">
                <p className="text-label how-we-creed-name">
                  Apostles&rsquo; Creed
                </p>
                <p className="how-we-creed-date vw-small">c. 2nd–8th century</p>
                <p className="how-we-creed-body">
                  The oldest summary of Christian faith — the Father as creator,
                  the Son incarnate, crucified, risen, and coming again; the
                  Holy Spirit, the church, the forgiveness of sins, the
                  resurrection of the body, and life everlasting.
                </p>
              </div>
              <div className="how-we-creed-card">
                <p className="text-label how-we-creed-name">Nicene Creed</p>
                <p className="how-we-creed-date vw-small">325 AD / 381 AD</p>
                <p className="how-we-creed-body">
                  The ecumenical confession of the Trinity — the Son as fully
                  God and fully man (homoousios), born of the Virgin, crucified,
                  risen on the third day, ascended, and returning in glory; the
                  Holy Spirit as Lord and giver of life.
                </p>
              </div>
            </div>
            <p className="how-we-body">
              These are not partisan positions within modern Christianity. They
              are the shared bedrock of Catholic, Orthodox, and Protestant
              traditions alike — the inherited grammar of Christian speech that
              every denomination that calls itself Christian affirms.
            </p>
          </div>
        </section>

        <SectionRule />

        {/* Section C: Historic voices */}
        <section className="how-we-section" aria-labelledby="sec-voices">
          <SectionHeader
            kicker="THE VOICES"
            headline="Thirty-plus witnesses across twenty centuries."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              The devotionals draw on a canon of writers who have stood the test
              of time — not influencers or contemporary trending voices, but
              people whose work has been read, tested, and returned to by the
              church for generations. They include Fathers of the early church,
              Reformers, Puritan divines, Victorian evangelists, and
              twentieth-century thinkers.
            </p>
          </div>
          <ol
            className="how-we-voices-grid"
            aria-label="Historic voices referenced"
          >
            {HISTORIC_VOICES.map((v) => (
              <li key={v.name} className="how-we-voice-item">
                <p className="how-we-voice-name">{v.name}</p>
                <p className="how-we-voice-dates text-label">{v.dates}</p>
                <p className="how-we-voice-note vw-small">{v.note}</p>
              </li>
            ))}
          </ol>
        </section>

        <SectionRule />

        {/* Section D: Soul Audit — plain language */}
        <section className="how-we-section" aria-labelledby="sec-soul-audit">
          <SectionHeader
            kicker="THE SOUL AUDIT"
            headline="How your edition is composed."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              The Soul Audit is the tool that matches a personal seven-day
              reading plan to what you are carrying. Here is exactly what
              happens, in plain language.
            </p>

            <div className="how-we-audit-steps">
              <div className="how-we-audit-step">
                <p className="text-label how-we-audit-step-num">01</p>
                <div>
                  <p className="how-we-audit-step-title">
                    You write one honest sentence.
                  </p>
                  <p className="how-we-audit-step-body">
                    Whatever you are actually carrying — anxiety, doubt, grief,
                    numbness, searching. One honest sentence is enough.
                  </p>
                </div>
              </div>

              <div className="how-we-audit-step">
                <p className="text-label how-we-audit-step-num">02</p>
                <div>
                  <p className="how-we-audit-step-title">
                    The AI reads it — once — to compose your edition.
                  </p>
                  <p className="how-we-audit-step-body">
                    Your reflection is sent to the model as a single input. It
                    composes three reading paths matched to what you described —
                    grounded in real Scripture and the reference library, not
                    platitudes. The reflection itself is not stored, indexed, or
                    retained after this single composition request completes.
                  </p>
                </div>
              </div>

              <div className="how-we-audit-step">
                <p className="text-label how-we-audit-step-num">03</p>
                <div>
                  <p className="how-we-audit-step-title">
                    You choose one path.
                  </p>
                  <p className="how-we-audit-step-body">
                    Three matched plans appear. You select the one that speaks
                    to where you actually are. Your choice is stored only in
                    your browser&rsquo;s local session so the app knows which
                    day you are on.
                  </p>
                </div>
              </div>

              <div className="how-we-audit-step">
                <p className="text-label how-we-audit-step-num">04</p>
                <div>
                  <p className="how-we-audit-step-title">
                    The devotional is drawn from the catalog verbatim.
                  </p>
                  <p className="how-we-audit-step-body">
                    The daily readings in your plan were written before you
                    arrived. Scripture passages are reproduced exactly.
                    Historical quotes are taken from the original sources. The
                    AI arranges and sequences; it does not improvise theology to
                    match your mood.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy statement */}
            <div className="how-we-privacy-block">
              <p className="text-label how-we-privacy-kicker">
                WHAT IS NEVER STORED
              </p>
              <ul className="how-we-list">
                <li>
                  Your reflection text is read once, then discarded. It is not
                  saved to a database, attached to a user profile, or held
                  between sessions.
                </li>
                <li>
                  Your reflection is never used to train any AI model — ours or
                  anyone else&rsquo;s.
                </li>
                <li>
                  Your reflection is never shared with third parties,
                  advertisers, or data brokers.
                </li>
                <li>
                  No account is required. Without an account, nothing about you
                  is transmitted beyond the single composition request.
                </li>
              </ul>
              <p className="how-we-body">
                <strong>What we do store (with an account):</strong> which day
                of your plan you are on, bookmarked devotionals, and optionally
                highlights or notes you add. This progress data is stored in our
                secure database so it syncs across your devices. It is not
                shared or sold.
              </p>
              <p className="how-we-privacy-honest vw-small">
                We do not claim your words &ldquo;never leave your device&rdquo;
                — they are transmitted to complete the composition request. What
                we claim is that they are not retained, stored, or reused after
                that request completes. See our{' '}
                <Link href="/privacy" className="link-highlight">
                  privacy policy
                </Link>{' '}
                for the full technical details.
              </p>
            </div>
          </div>
        </section>

        <SectionRule />

        {/* Founder 2026-08-16: "How we write page is outdated and therefore
            untruthful." It was untruthful mainly by OMISSION — two things had
            shipped that a transparency page has no business leaving out.
            Added here rather than rewritten around, because everything already
            on the page still holds. */}
        <section className="how-we-section" aria-labelledby="sec-red-letter">
          <SectionHeader
            kicker="THE WORDS OF CHRIST"
            headline="Red letter, marked by hand — never guessed."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              Where a reading quotes Christ directly, his words are set in red.
              No published red-letter data exists for the translations we use,
              so we built the attribution ourselves: the King James OSIS carries
              speaker markers, and those were cross-referenced onto the Berean
              Standard wording our readings actually quote.
            </p>
            <p className="how-we-body">
              Nothing is inferred from quotation marks. A passage can hold three
              quoted spans where only two are Christ speaking — Luke 10 does
              exactly that, and a naive pass would put his colour on another
              man&rsquo;s words. So spans are attributed explicitly and anything
              unmatched is simply left black. A missing red word is a
              typographic omission; a wrongly red word is a false attribution,
              and only one of those is recoverable.
            </p>
          </div>
        </section>

        <SectionRule />

        <section className="how-we-section" aria-labelledby="sec-audio">
          <SectionHeader
            kicker="THE AUDIO EDITION"
            headline="Read aloud by a machine, and said so."
          />
          <div className="how-we-body-col">
            <p className="how-we-body">
              Every reading can be listened to as well as read. The narration is
              synthetic — a text-to-speech voice, not a person in a booth — and
              we would rather say that plainly than let a warm voice imply a
              reader who does not exist.
            </p>
            <p className="how-we-body">
              The audio is generated from the same text you see on the page, in
              full. It is not an abridgement, a summary, or a different edition
              of the reading. Where a reading has chapters, the transport marks
              them so you can move within it rather than scrubbing blindly.
            </p>
          </div>
        </section>

        <SectionRule />

        {/* Closing colophon */}
        <section className="how-we-closing" aria-label="Editorial commitment">
          <blockquote className="how-we-closing-quote">
            <p>The gospel does its own work when given honest space to land.</p>
            <footer className="text-label how-we-closing-attr">
              Editorial conviction — Euangelion
            </footer>
          </blockquote>
          <p className="how-we-body how-we-closing-body">
            This site exists because we believe the accumulated wisdom of
            Scripture and the church&rsquo;s 2,000 years of living with it is
            already sufficient for every question a person can carry. The
            technology is in service of that material — not the other way
            around.
          </p>
          <div className="how-we-closing-links">
            <Link
              href="/soul-audit"
              className="mock-btn mock-btn-inline text-label"
            >
              START THE SOUL AUDIT
            </Link>
            <Link href="/series" className="text-label how-we-browse-link">
              Browse all {SERIES_COUNT} series &rarr;
            </Link>
          </div>
        </section>

        <SiteBottom />
      </main>
    </div>
  )
}
