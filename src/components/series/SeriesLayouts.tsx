'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SERIES_DATA } from '@/data/series'
import { dayCountLabel, seriesRecencyRank } from '@/lib/series/catalog'

/**
 * Ten ways to display the catalog (F-094).
 *
 * Founder: "I would like to see several layout options live on site for the
 * series page. lets say 10 distinct and unique ways of displaying the info that
 * is super sortable and searchable… BEAUTIFULLY DESIGNED WITH ATTENTION TO
 * DETAILS LIKE A WORLD CLASS UX UI DESIGNER."
 *
 * THE ORGANISING IDEA. Ten arbitrary CSS grids would be ten arbitrary CSS
 * grids. The founder's own words for this page are "a library of magazines" and
 * "each devotional is a newspaper on the rack" — so every view here is a real
 * way PRINT gets displayed, and takes its proportions and furniture from that
 * form rather than from a component library:
 *
 *   FEATURE     Monocle's front-of-book — one lead plate, varied tiles around it
 *   RACK        a kiosk rail — folded papers overlapping, mastheads showing
 *   COVERS      a Phaidon monograph plate wall — uniform, roomy, quiet
 *   SPINES      a shelf — titles running up the spine, pulled out on hover
 *   LIST        a stock list / departure board — dense, scannable, no art
 *   INDEX       a back-of-book index — dot leaders, pure typography
 *   CONTACT     a Magnum contact sheet — small frames, frame numbers, marks
 *   MOSAIC      Richter's Atlas wall — varied heights, no grid rhythm
 *   BROADSHEET  a newspaper page — column rules, a lede, running entries
 *   ISSUES      an issue chronology — numbered by release, newest first
 *
 * Where a view carries a number, the number means something true: the contact
 * sheet numbers frames by their position in the CURRENT sort, and ISSUES
 * numbers by release order. Nothing is numbered decoratively.
 */

export type ViewId =
  | 'feature'
  | 'rack'
  | 'covers'
  | 'spines'
  | 'list'
  | 'index'
  | 'contact'
  | 'mosaic'
  | 'broadsheet'
  | 'issues'

export const VIEWS: ReadonlyArray<{
  id: ViewId
  label: string
  /** Shown under the switcher — tells the reader what they are looking at. */
  blurb: string
}> = [
  { id: 'feature', label: 'Feature', blurb: 'The newest reading, and what sits around it.' },
  { id: 'rack', label: 'Rack', blurb: 'Every series folded over the rail, mastheads out.' },
  { id: 'covers', label: 'Covers', blurb: 'Plates only. The art, at size, in order.' },
  { id: 'spines', label: 'Spines', blurb: 'Shelved. Read the spine, pull one out.' },
  { id: 'list', label: 'List', blurb: 'The whole catalog in one screen.' },
  { id: 'index', label: 'Index', blurb: 'Back-of-book. Titles and lengths, nothing else.' },
  { id: 'contact', label: 'Contact', blurb: 'A contact sheet, numbered by where it falls in this sort.' },
  { id: 'mosaic', label: 'Mosaic', blurb: 'Hung by eye. Longer readings take more wall.' },
  { id: 'broadsheet', label: 'Broadsheet', blurb: 'Set in columns, the way a paper sets its listings.' },
  { id: 'issues', label: 'Issues', blurb: 'By release. Newest issue first.' },
]

export interface SeriesProgress {
  completed: number
  total: number
}

export interface LayoutProps {
  slugs: string[]
  progressBySeries: Map<string, SeriesProgress>
  cardHref: (slug: string) => string
  /** The newest eligible series — the FEATURE view's lead. */
  lead: string
}

/* ── shared bits ────────────────────────────────────────────────────── */

function Plate({
  slug,
  sizes,
  priority,
}: {
  slug: string
  sizes: string
  priority?: boolean
}) {
  const src = SERIES_DATA[slug]?.heroImage
  if (!src) return null
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="series-plate-img"
    />
  )
}

function ProgressRail({ progress }: { progress?: SeriesProgress }) {
  if (!progress || progress.completed === 0) return null
  const pct = Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
  return (
    <span className="series-progress" aria-label={`${pct}% read`}>
      <span className="series-progress-fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

/** "Day 3 of 7" when started, otherwise the length. One place, one wording. */
function statusLabel(slug: string, progress?: SeriesProgress) {
  if (progress && progress.completed > 0 && progress.completed < progress.total) {
    return `Day ${progress.completed + 1} of ${progress.total}`
  }
  if (progress && progress.completed >= progress.total) return 'Finished'
  return dayCountLabel(slug)
}

/* ── 1. FEATURE ─────────────────────────────────────────────────────── */

/**
 * Founder: "the Title and image are the main pieces of info."
 *
 * So the tile carries exactly two things at full strength — the plate and the
 * title — and the length sits under the title as a quiet line. The gold
 * uppercase kicker that used to sit ABOVE the title has gone: it was the
 * brightest thing on the tile and it was the least important.
 */
const BENTO_RHYTHM = ['tall', 'small', 'small', 'wide', 'small', 'tall', 'small', 'small'] as const

export function FeatureView({ slugs, progressBySeries, cardHref, lead }: LayoutProps) {
  const rest = useMemo(() => slugs.filter((s) => s !== lead), [slugs, lead])
  const leadSeries = SERIES_DATA[lead]

  return (
    <div className="bento">
      {leadSeries && slugs.includes(lead) && (
        <Link href={cardHref(lead)} className="bento-tile bento-lead">
          <Plate slug={lead} sizes="(max-width: 900px) 100vw, 50vw" priority />
          <span className="bento-veil" />
          <span className="bento-copy">
            <span className="bento-title bento-title--lead">{leadSeries.title}</span>
            <span className="bento-meta">
              Newest · {dayCountLabel(lead)}
            </span>
          </span>
        </Link>
      )}

      {rest.map((slug, i) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const size = BENTO_RHYTHM[i % BENTO_RHYTHM.length]
        const progress = progressBySeries.get(slug)
        return (
          <Link key={slug} href={cardHref(slug)} className={`bento-tile bento-${size}`}>
            <Plate slug={slug} sizes="(max-width: 900px) 50vw, 25vw" />
            <span className="bento-veil" />
            <span className="bento-copy">
              <span className="bento-title">{series.title}</span>
              <span className="bento-meta">{statusLabel(slug, progress)}</span>
            </span>
            <ProgressRail progress={progress} />
          </Link>
        )
      })}
    </div>
  )
}

/* ── 2. RACK ────────────────────────────────────────────────────────── */

/**
 * The founder's own image: "each devotional is a newspaper on the rack."
 *
 * Papers hang over a rail in rows of six, overlapping left-to-right the way
 * they do on a kiosk bar, each tilted by a fixed amount derived from its
 * position (never random — the shelf must look identical on every render).
 * Hovering lifts one clear of its neighbours, as if being pulled out.
 */
const RACK_PER_RAIL = 6

export function RackView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  const rails = useMemo(() => {
    const out: string[][] = []
    for (let i = 0; i < slugs.length; i += RACK_PER_RAIL) {
      out.push(slugs.slice(i, i + RACK_PER_RAIL))
    }
    return out
  }, [slugs])

  return (
    <div className="rack">
      {rails.map((rail, ri) => (
        <div className="rack-rail" key={ri}>
          <span className="rack-bar" aria-hidden="true" />
          <div className="rack-papers">
            {rail.map((slug, i) => {
              const series = SERIES_DATA[slug]
              if (!series) return null
              // Fixed lean, alternating, so the row reads as hand-placed
              // rather than as a grid — but is stable across renders.
              const lean = [-1.6, 0.9, -0.5, 1.4, -1.1, 0.4][i % 6]
              return (
                <Link
                  key={slug}
                  href={cardHref(slug)}
                  className="rack-paper"
                  style={{ transform: `rotate(${lean}deg)` }}
                >
                  <span className="rack-fold" aria-hidden="true" />
                  <span className="rack-masthead">{series.title}</span>
                  <span className="rack-rule" aria-hidden="true" />
                  <span className="rack-plate">
                    <Plate slug={slug} sizes="(max-width: 900px) 40vw, 16vw" />
                  </span>
                  <span className="rack-standfirst">{series.question}</span>
                  <span className="rack-dateline">
                    {statusLabel(slug, progressBySeries.get(slug))}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── 3. COVERS ──────────────────────────────────────────────────────── */

/** Founder: "The Library look should have less columns." Four, not eight. */
export function CoversView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <div className="covers">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <Link key={slug} href={cardHref(slug)} className="cover">
            <span className="cover-plate">
              <Plate slug={slug} sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 23vw" />
            </span>
            <span className="cover-caption">
              <span className="cover-title">{series.title}</span>
              <span className="cover-meta">{statusLabel(slug, progress)}</span>
            </span>
            <ProgressRail progress={progress} />
          </Link>
        )
      })}
    </div>
  )
}

/* ── 4. SPINES ──────────────────────────────────────────────────────── */

/**
 * A shelf. Titles run bottom-to-top the way they do on a spine, spine width is
 * proportional to the length of the reading, and hovering lifts one out.
 * Width-as-length is the one piece of information a real shelf gives you at a
 * glance, so it is the one encoded here.
 */
export function SpinesView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <div className="shelf">
      <div className="shelf-row">
        {slugs.map((slug, i) => {
          const series = SERIES_DATA[slug]
          if (!series) return null
          const days = series.days.length
          // Clamped so bible-365 does not become a wall.
          const width = Math.min(74, Math.max(34, 30 + days * 3))
          return (
            <Link
              key={slug}
              href={cardHref(slug)}
              className={`spine spine--${i % 3}`}
              style={{ width: `${width}px` }}
              title={`${series.title} · ${dayCountLabel(slug)}`}
            >
              <span className="spine-title">{series.title}</span>
              <span className="spine-foot" aria-hidden="true">
                {days}
              </span>
              <ProgressRail progress={progressBySeries.get(slug)} />
            </Link>
          )
        })}
      </div>
      <span className="shelf-board" aria-hidden="true" />
    </div>
  )
}

/* ── 5. LIST ────────────────────────────────────────────────────────── */

/** Founder: "I want the list view to not show the category (shepheard, etc)." */
export function ListView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <ul className="stocklist">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <li key={slug}>
            <Link href={cardHref(slug)} className="stock-row">
              <span className="stock-title">{series.title}</span>
              <span className="stock-question">{series.question}</span>
              <span className="stock-meta">{statusLabel(slug, progress)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ── 6. INDEX ───────────────────────────────────────────────────────── */

/** Back-of-book: title, dot leader, length. No art, no chrome, two columns. */
export function IndexView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <ol className="bookindex">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <li key={slug}>
            <Link href={cardHref(slug)} className="bookindex-row">
              <span className="bookindex-title">{series.title}</span>
              <span className="bookindex-leader" aria-hidden="true" />
              <span className="bookindex-num">
                {progress && progress.completed > 0
                  ? `${progress.completed}/${progress.total}`
                  : series.days.length}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

/* ── 7. CONTACT SHEET ───────────────────────────────────────────────── */

/**
 * Frames are numbered by their position in the CURRENT sort — change the sort
 * and the numbering changes, exactly as a re-ordered contact sheet would.
 */
export function ContactView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <div className="contactsheet">
      {slugs.map((slug, i) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        const done = progress && progress.completed >= progress.total
        return (
          <Link
            key={slug}
            href={cardHref(slug)}
            className={`frame${done ? ' frame--marked' : ''}`}
          >
            <span className="frame-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="frame-window">
              <Plate slug={slug} sizes="(max-width: 640px) 30vw, 15vw" />
            </span>
            <span className="frame-caption">{series.title}</span>
          </Link>
        )
      })}
    </div>
  )
}

/* ── 8. MOSAIC ──────────────────────────────────────────────────────── */

/** Hung by eye: a longer reading takes more wall. Masonry via CSS columns. */
export function MosaicView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <div className="mosaic">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const days = series.days.length
        const tall = days >= 7 ? 'mosaic-tile--tall' : days <= 5 ? 'mosaic-tile--short' : ''
        return (
          <Link key={slug} href={cardHref(slug)} className={`mosaic-tile ${tall}`}>
            <span className="mosaic-plate">
              <Plate slug={slug} sizes="(max-width: 640px) 46vw, 24vw" />
            </span>
            <span className="mosaic-title">{series.title}</span>
            <span className="mosaic-meta">
              {statusLabel(slug, progressBySeries.get(slug))}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

/* ── 9. BROADSHEET ──────────────────────────────────────────────────── */

/**
 * A newspaper page: the catalog set as running listings in rules-separated
 * columns, with the newest reading as the lede across the top.
 */
export function BroadsheetView({ slugs, progressBySeries, cardHref, lead }: LayoutProps) {
  const leadSeries = SERIES_DATA[lead]
  const rest = slugs.filter((s) => s !== lead)
  return (
    <div className="broadsheet">
      {leadSeries && slugs.includes(lead) && (
        <Link href={cardHref(lead)} className="broad-lede">
          <span className="broad-lede-plate">
            <Plate slug={lead} sizes="(max-width: 900px) 100vw, 42vw" />
          </span>
          <span className="broad-lede-copy">
            <span className="broad-kicker">Latest</span>
            <span className="broad-lede-title">{leadSeries.title}</span>
            <span className="broad-lede-standfirst">{leadSeries.question}</span>
            <span className="broad-lede-meta">{dayCountLabel(lead)}</span>
          </span>
        </Link>
      )}
      <div className="broad-columns">
        {rest.map((slug) => {
          const series = SERIES_DATA[slug]
          if (!series) return null
          return (
            <Link key={slug} href={cardHref(slug)} className="broad-entry">
              <span className="broad-entry-title">{series.title}</span>
              <span className="broad-entry-body">{series.question}</span>
              <span className="broad-entry-meta">
                {statusLabel(slug, progressBySeries.get(slug))}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ── 10. ISSUES ─────────────────────────────────────────────────────── */

/**
 * Issue numbers come from release order (`seriesRecencyRank`), so No. 01 is the
 * first reading published and the highest number is the newest. The number is
 * a fact about the catalog, not an ornament — which is why this view always
 * reads newest-first regardless of the active sort.
 */
export function IssuesView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  const ordered = useMemo(
    () => [...slugs].sort((a, b) => seriesRecencyRank(b) - seriesRecencyRank(a)),
    [slugs],
  )
  return (
    <ol className="issues">
      {ordered.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const no = seriesRecencyRank(slug) + 1
        return (
          <li key={slug} className="issue">
            <Link href={cardHref(slug)} className="issue-row">
              <span className="issue-no">
                <span className="issue-no-label">No.</span>
                {String(no).padStart(2, '0')}
              </span>
              <span className="issue-plate">
                <Plate slug={slug} sizes="90px" />
              </span>
              <span className="issue-copy">
                <span className="issue-title">{series.title}</span>
                <span className="issue-question">{series.question}</span>
              </span>
              <span className="issue-meta">
                {statusLabel(slug, progressBySeries.get(slug))}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export const LAYOUTS: Record<ViewId, (props: LayoutProps) => React.ReactElement> = {
  feature: FeatureView,
  rack: RackView,
  covers: CoversView,
  spines: SpinesView,
  list: ListView,
  index: IndexView,
  contact: ContactView,
  mosaic: MosaicView,
  broadsheet: BroadsheetView,
  issues: IssuesView,
}
