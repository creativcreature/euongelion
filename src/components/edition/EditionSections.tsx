/**
 * The Daily Bread — DB-fed edition sections (SA-090 / F-136).
 *
 * Server components, one per section kind, all fed from getEdition(). Each
 * renders ONLY when its rows exist — F-098's empty-section contract. None of
 * them fetch; the page fetches once and hands payloads down.
 */
import Image from 'next/image'
import Link from 'next/link'
import type {
  ArchivePayload,
  B365Payload,
  GalleryPayload,
  PrayerPayload,
  ProverbPayload,
  QuestionPayload,
  RedLetterPayload,
  ScreeningPayload,
  SeasonPayload,
  StripPayload,
  VersePayload,
  VoicesPayload,
  WitnessPayload,
} from '@/lib/edition/kinds'

/* ── The Season — a paper's weather box, but liturgical ──────────────── */

export function SeasonBox({ season }: { season: SeasonPayload }) {
  return (
    <aside className="edition-season" aria-label="The season">
      <p className="edition-kicker">The season</p>
      <p className="edition-season-name">
        {season.feast ?? season.dayLabel ?? season.seasonLabel}
      </p>
      <p className="edition-season-note">{season.note}</p>
    </aside>
  )
}

/* ── The Daily Prayer — scripture, printed in full ───────────────────── */

export function PrayerColumn({ prayer }: { prayer: PrayerPayload }) {
  return (
    <section className="edition-prayer-col" aria-label="The daily prayer">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The daily prayer</h2>
        <p className="edition-section-note">
          {prayer.prayedBy} &middot; {prayer.reference}
        </p>
      </div>
      <blockquote className="edition-prayer-text">
        {prayer.verses && prayer.verses.length > 0
          ? prayer.verses.map(({ v, text }) => (
              <span key={v} className="edition-prayer-verse">
                <sup className="edition-verse-num">{v}</sup>
                {text}{' '}
              </span>
            ))
          : prayer.text}
      </blockquote>
      <p className="edition-prayer-cite">
        {prayer.reference} ({prayer.translation})
      </p>
    </section>
  )
}

/* ── The Funnies — the daily strip (Echo & Dust since 2026-08-20) ────── */

export function StripPanel({ strip }: { strip: StripPayload }) {
  return (
    <figure className="edition-strip" aria-label="Echo & Dust">
      <span className="edition-strip-plate">
        <Image
          src={strip.image}
          alt={strip.alt}
          fill
          sizes="(max-width: 900px) 100vw, 62vw"
          className="edition-strip-img"
        />
      </span>
      <figcaption className="edition-strip-caption">
        <span className="edition-strip-title">Echo &amp; Dust</span>
        <span className="edition-strip-line">{strip.caption}</span>
      </figcaption>
    </figure>
  )
}

/* ── The Gallery — a reproduction, framed ────────────────────────────── */

export function GalleryFrame({ art }: { art: GalleryPayload }) {
  // The architecture, mosaic and artifact families carry no attribution — the
  // audit records them as "Unknown". "after Unknown" is not a byline, it is a
  // gap read aloud, so an unattributed plate simply gets no artist line.
  const attributed = art.artist.trim().toLowerCase() !== 'unknown'

  return (
    <section className="edition-gallery" aria-label="The gallery">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The gallery</h2>
        <p className="edition-section-note">A reproduction a day</p>
      </div>
      <figure className="edition-gallery-frame">
        <span className="edition-gallery-plate">
          <Image
            src={art.image}
            alt={attributed ? `${art.title}, after ${art.artist}` : art.title}
            fill
            sizes="(max-width: 900px) 100vw, 58vw"
            className="edition-gallery-img"
          />
        </span>
        <figcaption className="edition-gallery-caption">
          <span className="edition-gallery-title">{art.title}</span>
          {attributed && (
            <span className="edition-gallery-artist">after {art.artist}</span>
          )}
          <span className="edition-gallery-looking">{art.looking}</span>
        </figcaption>
      </figure>
    </section>
  )
}

/* ── The Screening Room — allowlisted, attributed, linked out ────────── */

export function ScreeningRoom({ items }: { items: ScreeningPayload[] }) {
  return (
    <section className="edition-screening" aria-label="The screening room">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The screening room</h2>
        <p className="edition-section-note">
          From elsewhere in the church &mdash; linked to the source
        </p>
      </div>
      <div className="edition-screening-row">
        {items.map((item) => (
          <a
            key={item.sourceUrl}
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="edition-screening-item"
          >
            {item.thumbnail && (
              <span className="edition-screening-thumb">
                {/* Third-party thumbnail: plain img, remote host, no optimizer */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbnail} alt="" loading="lazy" />
              </span>
            )}
            <span className="edition-screening-kind">
              {item.kind === 'video' ? 'Watch' : 'Read'}
            </span>
            <span className="edition-screening-title">{item.title}</span>
            {item.blurb && (
              <span className="edition-screening-blurb">{item.blurb}</span>
            )}
            <span className="edition-screening-source">
              {item.sourceName} &rarr;
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

/* ── The Cloud of Witnesses — sourced commemoration ──────────────────── */

export function WitnessColumn({ witness }: { witness: WitnessPayload }) {
  return (
    <section className="edition-witness" aria-label="The cloud of witnesses">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The cloud of witnesses</h2>
        <p className="edition-section-note">Remembered today</p>
      </div>
      <p className="edition-witness-name">
        {witness.name}{' '}
        <span className="edition-witness-year">{witness.year}</span>
      </p>
      <p className="edition-witness-body">{witness.body}</p>
      <p className="edition-witness-source">{witness.source}</p>
    </section>
  )
}

/* ── The broken paper — Rule 1's visible failure state ───────────────── */

export function EditionUnavailable() {
  return (
    <div className="edition-broken" role="alert">
      <p className="edition-broken-head">
        Today&rsquo;s editorial sections could not be loaded.
      </p>
      <p className="edition-broken-body">
        The reading below is unaffected. The rest of the paper will return
        &mdash; this failure has been surfaced, not hidden.
      </p>
    </div>
  )
}

/* ── Letters — real readers, moderated. Dormant until submissions exist ── */

export function LettersColumn({
  letters,
}: {
  letters: { body: string; from: string }[]
}) {
  return (
    <section className="edition-letters" aria-label="Letters">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">Letters</h2>
        <p className="edition-section-note">From readers</p>
      </div>
      <div className="edition-columns">
        {letters.map((l) => (
          <article key={l.body} className="edition-item">
            <p className="edition-item-body">{l.body}</p>
            <p className="edition-item-source">{l.from}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ── Notices — named organisers, real efforts. Dormant until real ──────── */

export function NoticesColumn({
  notices,
}: {
  notices: { title: string; body: string; by: string; href?: string }[]
}) {
  return (
    <section className="edition-notices" aria-label="Notices">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">Notices</h2>
        <p className="edition-section-note">
          Efforts to join, give to, pray for
        </p>
      </div>
      <div className="edition-columns">
        {notices.map((n) => (
          <article key={n.title} className="edition-item">
            <h3 className="edition-item-head">{n.title}</h3>
            <p className="edition-item-place">{n.by}</p>
            <p className="edition-item-body">{n.body}</p>
            {n.href && (
              <p className="edition-item-source">
                <a href={n.href} rel="noopener noreferrer" target="_blank">
                  More &rarr;
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

/* ── SA-092 — the paper grows to ~30 modules a day ─────────────────────── */

/* ── The Red Letters — a saying of Jesus, quoted verbatim ──────────────── */

export function RedLetterColumn({ saying }: { saying: RedLetterPayload }) {
  return (
    <section className="edition-redletter" aria-label="The red letters">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The red letters</h2>
        <p className="edition-section-note">A saying of Jesus, verbatim</p>
      </div>
      <blockquote className="edition-redletter-text">{saying.text}</blockquote>
      <p className="edition-redletter-cite">
        {saying.reference} ({saying.translation})
      </p>
    </section>
  )
}

/* ── The Proverb — a two-line saying, BSB verbatim ─────────────────────── */

export function ProverbBox({ proverb }: { proverb: ProverbPayload }) {
  return (
    <section className="edition-proverb" aria-label="The proverb">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The proverb</h2>
      </div>
      <blockquote className="edition-proverb-text">{proverb.text}</blockquote>
      <p className="edition-proverb-cite">
        {proverb.reference} ({proverb.translation})
      </p>
    </section>
  )
}

/* ── Voices — a historic voice, attributed to a named person and work ──── */

export function VoicesColumn({ voice }: { voice: VoicesPayload }) {
  return (
    <section className="edition-voices" aria-label="Voices">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">Voices</h2>
        <p className="edition-section-note">From the church&rsquo;s shelf</p>
      </div>
      <blockquote className="edition-voices-quote">{voice.quote}</blockquote>
      <p className="edition-voices-source">
        {voice.author} &middot; <cite>{voice.work}</cite>
      </p>
    </section>
  )
}

/* ── From the Archive — an older devotional resurfaced ─────────────────── */

export function ArchiveBox({ archive }: { archive: ArchivePayload }) {
  return (
    <section className="edition-archive" aria-label="From the archive">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">From the archive</h2>
        <p className="edition-section-note">An older reading, resurfaced</p>
      </div>
      <Link
        href={`/devotional/${archive.slug}`}
        className="edition-archive-item"
      >
        <span className="edition-archive-plate">
          <Image
            src={archive.image}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 30vw"
            className="edition-archive-img"
          />
        </span>
        <span className="edition-archive-text">
          <span className="edition-archive-head">{archive.title}</span>
          <span className="edition-archive-teaser">{archive.teaser}</span>
          <span className="edition-archive-more">Read it &rarr;</span>
        </span>
      </Link>
    </section>
  )
}

/* ── Today in Bible-365 — the paper's pointer into the year plan ───────── */

export function B365Box({ b365 }: { b365: B365Payload }) {
  return (
    <section className="edition-b365" aria-label="Bible in a year">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">Bible in a year</h2>
        <p className="edition-section-note">Day {b365.day} of 365</p>
      </div>
      <p className="edition-b365-ref">{b365.reference}</p>
      <p className="edition-b365-title">{b365.title}</p>
      <Link href={`/devotional/${b365.slug}`} className="edition-b365-more">
        Read today&rsquo;s plan &rarr;
      </Link>
    </section>
  )
}

/* ── The Memory Verse — the week's verse, same all seven days ──────────── */

export function VerseBox({ verse }: { verse: VersePayload }) {
  return (
    <section className="edition-verse" aria-label="The memory verse">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The memory verse</h2>
        <p className="edition-section-note">
          This week &middot; same verse all seven days
        </p>
      </div>
      <blockquote className="edition-verse-text">{verse.text}</blockquote>
      <p className="edition-verse-cite">
        {verse.reference} ({verse.translation})
      </p>
    </section>
  )
}

/* ── The Question — one reflection question, no right answer ───────────── */

export function QuestionBox({ question }: { question: QuestionPayload }) {
  return (
    <section className="edition-question" aria-label="The question">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The question</h2>
        <p className="edition-section-note">To carry, not to close</p>
      </div>
      <p className="edition-question-text">{question.question}</p>
    </section>
  )
}
