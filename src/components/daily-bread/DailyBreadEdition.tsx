/**
 * The Daily Bread V2 paper (SA-142 / F-184). Renders one FROZEN edition in its
 * archetype. Server component; the only client islands are the puzzles, the
 * gallery lightbox and the procedural scene (which paints a static poster
 * first and never blocks reading).
 */
import Link from 'next/link'
import { Fragment } from 'react'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { ARCHETYPES } from '@/lib/daily-bread/composition/archetypes'
import { serialLabel } from '@/lib/daily-bread/read'
import { addDays, formatEditorialDate } from '@/lib/daily-bread/time'
import type { ArchiveEntry, DailyEdition, EditionModule, Placement } from '@/lib/daily-bread/types'
import { MODULE_ANCHORS, ModuleView } from './ModuleViews'

const SITE = 'https://euangelion.app'

const QUALITY_NOTE: Record<DailyEdition['quality'], string | null> = {
  normal: null,
  fallback:
    'Some of this edition’s usual sources were unavailable when it was set, so parts of it come from the standing library.',
  minimum:
    'A shorter edition today: several of the paper’s usual sections could not be prepared. The Scripture and the reading are complete.',
}

function spanClass(span: Placement['span']) {
  return `db2-cell db2-span--${span}`
}

function groupBands(placements: Placement[]) {
  const bands: { band: number; beat: Placement['beat']; region: Placement['region']; items: Placement[] }[] = []
  for (const p of placements) {
    const last = bands[bands.length - 1]
    if (last && last.band === p.band) last.items.push(p)
    else bands.push({ band: p.band, beat: p.beat, region: p.region, items: [p] })
  }
  return bands
}

/** "August 2" — the short date the plan's ending uses. */
function shortDate(dateSlug: string): string {
  return new Date(`${dateSlug}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The edition's ending (plan §15). Today's paper closes with
 *   That’s today’s bread.   ← Yesterday   Browse the archive
 * and a past paper with
 *   This was the Daily Bread for August 3, 2026.   ← August 2   August 4 →
 * Links only ever point at published editions.
 */
function EditionEnding({
  editionDate,
  current,
  previous,
  next,
}: {
  editionDate: string
  current: boolean
  previous: ArchiveEntry | null
  next: ArchiveEntry | null
}) {
  const previousLabel = previous
    ? current && previous.editionDate === addDays(editionDate, -1)
      ? '← Yesterday'
      : `← ${shortDate(previous.editionDate)}`
    : null
  return (
    <section className="db2-ending" aria-label="End of this edition">
      <p className="db2-ending-line">
        {current
          ? 'That’s today’s bread.'
          : `This was the Daily Bread for ${formatEditorialDate(editionDate).replace(/^[A-Za-z]+, /, '')}.`}
      </p>
      <nav className="db2-editionnav" aria-label="Other editions">
        {previous ? (
          <Link href={`/daily-bread/${previous.editionDate}`} className="db2-editionnav-link" rel="prev">
            <span className="db2-editionnav-dir">{previousLabel}</span>
            <span className="db2-editionnav-title">{previous.title}</span>
            <span className="db2-editionnav-meta">{serialLabel(previous)}</span>
          </Link>
        ) : (
          <span className="db2-editionnav-link db2-editionnav-link--none">The first edition</span>
        )}
        <Link href="/daily-bread/archive" className="db2-editionnav-archive text-label">
          Browse the archive
        </Link>
        {next && !current ? (
          <Link
            href={`/daily-bread/${next.editionDate}`}
            className="db2-editionnav-link db2-editionnav-link--next"
            rel="next"
          >
            <span className="db2-editionnav-dir">{`${shortDate(next.editionDate)} →`}</span>
            <span className="db2-editionnav-title">{next.title}</span>
            <span className="db2-editionnav-meta">{serialLabel(next)}</span>
          </Link>
        ) : (
          <span className="db2-editionnav-link db2-editionnav-link--blank" aria-hidden="true" />
        )}
      </nav>
    </section>
  )
}

export default function DailyBreadEdition({
  edition,
  neighbors,
  mode,
  current = false,
  notice,
}: {
  edition: DailyEdition
  neighbors: { previous: ArchiveEntry | null; next: ArchiveEntry | null }
  mode: 'live' | 'archive' | 'preview'
  /** This is today's paper (the ending says so and offers no "next"). */
  current?: boolean
  notice?: string
}) {
  const archetype = ARCHETYPES[edition.composition.archetype]
  const byType = new Map<EditionModule['type'], EditionModule>(
    edition.modules.map((m) => [m.type, m]),
  )
  const placements = edition.composition.placements.filter((p) => byType.has(p.module))
  const bands = groupBands(placements)
  const withdrawn = edition.lifecycle === 'superseded'
  const canonical = `${SITE}/daily-bread/${edition.editionDate}`
  const serial = serialLabel(edition)
  const dateLabel = formatEditorialDate(edition.editionDate)
  const qualityNote = QUALITY_NOTE[edition.quality]
  const anchors = placements
    .map((p) => MODULE_ANCHORS[p.module])
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: edition.title,
    description: edition.deck,
    datePublished: edition.publishedAt ?? undefined,
    url: canonical,
    publisher: { '@type': 'Organization', name: 'Euangelion', url: SITE },
    isPartOf: {
      '@type': 'PublicationIssue',
      ...(edition.issue !== null ? { issueNumber: String(edition.issue) } : {}),
      datePublished: edition.editionDate,
      isPartOf: {
        '@type': 'Periodical',
        name: 'The Daily Bread',
        ...(edition.volume !== null ? { volumeNumber: String(edition.volume) } : {}),
      },
    },
    about: { '@type': 'Book', name: 'Bible', description: edition.primaryScripture.reference },
  }

  return (
    <div className="mock-home">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <main
        id="main-content"
        className={`mock-paper db2 db2-arch db2-arch--${archetype.id} db2-quality--${edition.quality}`}
        data-archetype={archetype.id}
        data-edition={edition.editionDate}
      >
        <h1 className="sr-only">{`The Daily Bread — ${serial} — ${edition.title}`}</h1>
        <EuangelionShellHeader />

        {notice ? (
          <p className="db2-notice" role="status">
            {notice}
          </p>
        ) : null}
        {mode === 'preview' ? (
          <p className="db2-notice db2-notice--preview" role="status">
            Preview — {edition.lifecycle}, quality {edition.quality}, set as {archetype.name}. Readers cannot see this page.
          </p>
        ) : null}

        <header className="edition-masthead db2-masthead">
          <div className="edition-rule-top" aria-hidden="true" />
          <p className="edition-name">The Daily Bread</p>
          <div className="edition-dateline">
            <span className="db2-serial">{serial}</span>
            <time dateTime={edition.editionDate}>{dateLabel}</time>
            <span>{edition.liturgical.feast ?? edition.liturgical.dayLabel}</span>
          </div>
          <div className="edition-rule-bottom" aria-hidden="true" />
        </header>
        <div className="edition-spine" aria-hidden="true" />

        {withdrawn ? (
          <section className="db2-withdrawn" role="alert">
            <h2 className="edition-section-head">This edition was withdrawn</h2>
            <p>{edition.supersededReason}</p>
            <p>Its number stays retired so the run of the paper remains honest.</p>
          </section>
        ) : (
          <>
            {anchors.length > 1 ? (
              <nav className="edition-contents" aria-label="In this edition">
                {anchors.map((a) => (
                  <a key={a.id} href={`#${a.id}`}>
                    {a.label}
                  </a>
                ))}
              </nav>
            ) : null}

            <div className="db2-body">
              {bands.map((band) => (
                <div
                  key={band.band}
                  className={`db2-band db2-band--${band.beat} db2-region--${band.region}`}
                >
                  {band.items.map((p) => {
                    const placed = byType.get(p.module)
                    if (!placed) return null
                    return (
                      <Fragment key={p.module}>
                        <div className={`${spanClass(p.span)} db2-cell--${p.module} db2-tier--${p.tier}`}>
                          <ModuleView module={placed} placement={p} edition={edition} />
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        <EditionEnding
          editionDate={edition.editionDate}
          current={current}
          previous={neighbors.previous}
          next={neighbors.next}
        />

        <footer className="today-colophon db2-colophon">
          <p className="vw-small text-secondary">
            <time dateTime={edition.editionDate}>{dateLabel}</time> · {serial} · {archetype.description}
          </p>
          {qualityNote ? <p className="vw-small text-secondary db2-quality-note">{qualityNote}</p> : null}
          {edition.activeRevision > 1 ? (
            <p className="vw-small text-secondary">Corrected edition (revision {edition.activeRevision}).</p>
          ) : null}
          <p className="vw-small text-secondary">
            <Link href="/how-we-write" className="link-highlight">
              How we write
            </Link>
          </p>
        </footer>

        <SiteBottom />
      </main>
    </div>
  )
}

/** The visible state when V2 is on but no edition has been published yet. */
export function DailyBreadUnavailable({ reason }: { reason: 'none-published' | 'read-failed' }) {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper db2">
        <EuangelionShellHeader />
        <div className="edition-broken" role="alert">
          <p className="edition-broken-head">
            {reason === 'none-published'
              ? 'The Daily Bread has no published edition yet.'
              : 'The Daily Bread could not be loaded.'}
          </p>
          <p className="edition-broken-body">
            {reason === 'none-published'
              ? 'The first edition is being set. '
              : 'This failure has been recorded, not hidden. '}
            <Link href="/daily-bread/archive">The archive</Link>
          </p>
        </div>
        <SiteBottom />
      </main>
    </div>
  )
}
