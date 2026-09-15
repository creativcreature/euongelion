/**
 * Daily Bread V2 module views (SA-142 / F-184). Server components that render
 * a FROZEN module. Text is always rendered as text — no module here uses
 * dangerouslySetInnerHTML. Where the SA-090 edition already has a component
 * for a section, V2 reuses it so the paper keeps one visual language.
 */
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArchiveBox,
  B365Box,
  LettersColumn,
  NoticesColumn,
  PrayerColumn,
  ProverbBox,
  QuestionBox,
  RedLetterColumn,
  ScreeningRoom,
  VerseBox,
  VoicesColumn,
  WitnessColumn,
} from '@/components/edition/EditionSections'
import GallerySpread from '@/components/edition/GallerySpread'
import CrosswordClient from '@/components/edition/puzzles/CrosswordClient'
import UnscrambleClient from '@/components/edition/puzzles/UnscrambleClient'
import QuizClient from '@/components/edition/puzzles/QuizClient'
import WordSearchClient from '@/components/edition/puzzles/WordSearchClient'
import ColoringClient from '@/components/edition/puzzles/ColoringClient'
import ComicStrip from '@/components/daily-bread/ComicStrip'
import ProceduralScene from '@/components/daily-bread/visual/ProceduralScene'
import { ARCHETYPES } from '@/lib/daily-bread/composition/archetypes'
import { boldSegments, paragraphs } from '@/lib/daily-bread/safe'
import { formatEditorialDate } from '@/lib/daily-bread/time'
import type {
  DailyEdition,
  EditionModule,
  Placement,
  ReadingBlock,
} from '@/lib/daily-bread/types'

/** Section anchors for the contents line. */
export const MODULE_ANCHORS: Partial<Record<EditionModule['type'], { id: string; label: string }>> = {
  reading: { id: 'the-reading', label: 'The reading' },
  prayer: { id: 'the-daily-prayer', label: 'The prayer' },
  word: { id: 'word-of-the-day', label: 'The word' },
  comic: { id: 'the-funnies', label: 'The funnies' },
  crossword: { id: 'the-crossword', label: 'Crossword' },
  rabbitHoles: { id: 'rabbit-holes', label: 'Rabbit holes' },
  gallery: { id: 'the-gallery', label: 'The gallery' },
  guides: { id: 'how-to-read', label: 'How to read' },
}

function SectionBar({ head, note }: { head: string; note?: ReactNode }) {
  return (
    <div className="edition-section-bar">
      <h2 className="edition-section-head">{head}</h2>
      {note ? <p className="edition-section-note">{note}</p> : null}
    </div>
  )
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {boldSegments(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
      )}
    </>
  )
}

function ReadingBlockView({ block }: { block: ReadingBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="today-section-heading text-label">{block.text}</h3>
    case 'paragraph':
      return (
        <p className="today-body">
          <RichText text={block.text} />
        </p>
      )
    case 'scripture':
      return (
        <blockquote className="today-scripture" cite={block.reference || undefined}>
          {paragraphs(block.text).map((p, i) => (
            <p key={i} className="today-scripture-text">
              <RichText text={p} />
            </p>
          ))}
          {block.reference ? (
            <footer className="today-scripture-ref text-label">
              {block.reference}
              {block.translation ? ` · ${block.translation}` : ''}
            </footer>
          ) : null}
        </blockquote>
      )
    case 'vocab':
      return (
        <aside className="today-vocab">
          <p className="today-vocab-word">{block.word}</p>
          <p className="today-vocab-meaning text-label">{block.meaning}</p>
          {block.root ? <p className="today-vocab-root">{block.root}</p> : null}
        </aside>
      )
    case 'reflection':
      return (
        <div className="today-reflection">
          <p className="text-label today-reflection-kicker">Reflect</p>
          <p className="today-reflection-prompt">{block.text}</p>
        </div>
      )
    case 'prayer':
      return (
        <div className="today-prayer">
          <p className="text-label today-prayer-kicker">Prayer</p>
          {paragraphs(block.text).map((p, i) => (
            <p key={i} className="today-prayer-text">
              <RichText text={p} />
            </p>
          ))}
        </div>
      )
    case 'takeaway':
      return (
        <div className="today-takeaway">
          <p className="text-label today-takeaway-kicker">This week</p>
          <p className="today-takeaway-text">
            <RichText text={block.text} />
          </p>
        </div>
      )
  }
}

export function ModuleView({
  module,
  placement,
  edition,
}: {
  module: EditionModule
  placement: Placement
  edition: DailyEdition
}): ReactNode {
  const anchor = MODULE_ANCHORS[module.type]
  switch (module.type) {
    case 'lead':
      return (
        <section className="edition-lead db2-lead" aria-label="Today's lead">
          {module.plate ? (
            <span className="edition-lead-plate">
              <Image
                src={module.plate.src}
                alt={module.plate.alt}
                fill
                sizes={placement.span === 'full' ? '100vw' : '(max-width: 900px) 100vw, 64vw'}
                className="edition-lead-img"
                priority
              />
            </span>
          ) : null}
          <p className="edition-kicker">{module.scriptureReference}</p>
          <h2 className="edition-lead-head">{module.title}</h2>
          {edition.deck ? <p className="edition-lead-stand">{edition.deck}</p> : null}
          <p className="edition-byline">
            {module.seriesTitle}
            {module.dayNumber > 1 ? ` · Day ${module.dayNumber}` : ''}
          </p>
          <a href="#the-reading" className="edition-jump">
            Read today&rsquo;s reading &darr;
          </a>
          {module.seriesSlug && !module.authored ? (
            <Link href={`/series/${module.seriesSlug}`} className="edition-lead-series">
              The full series: {module.seriesTitle} &rarr;
            </Link>
          ) : null}
        </section>
      )

    case 'scripture':
      return (
        <section
          className={`db2-scripture${module.scripture.text.length > 280 ? ' db2-scripture--long' : ''}`}
          aria-label="Today's Scripture"
        >
          <p className="edition-kicker">Today&rsquo;s Scripture</p>
          <blockquote className="db2-scripture-text" cite={module.scripture.reference}>
            {module.scripture.text}
          </blockquote>
          <p className="db2-scripture-cite">
            {module.scripture.reference} ({module.scripture.translation})
          </p>
        </section>
      )

    case 'reading':
      return (
        <section className="db2-reading" aria-labelledby="the-reading">
          <h2 className="edition-section-head" id="the-reading">
            The reading
          </h2>
          <header className="today-reading-header">
            <h3 className="today-headline mock-title">{module.title}</h3>
          </header>
          <div className="mock-rule today-rule" aria-hidden="true" />
          <article className="today-reading-body" aria-label={`${module.title} reading`}>
            {module.blocks.map((block, i) => (
              <ReadingBlockView key={i} block={block} />
            ))}
          </article>
          {module.devotionalSlug ? (
            <p className="db2-reading-more">
              <Link href={`/devotional/${module.devotionalSlug}`} className="mock-btn mock-btn-inline text-label">
                Open full reader
              </Link>
            </p>
          ) : null}
        </section>
      )

    case 'scene':
      return (
        <ProceduralScene
          scene={module.scene}
          renderer={module.renderer}
          seed={module.seed}
          label={module.label}
          className={`db2-scene--${placement.span}`}
          motion={edition.composition.motionLevel ?? ARCHETYPES[edition.composition.archetype].presentation.motion}
        />
      )

    case 'comic':
      return (
        <section className="edition-section db2-comic-section" aria-labelledby={anchor?.id}>
          <div className="edition-section-bar">
            <h2 className="edition-section-head" id={anchor?.id}>
              The funnies
            </h2>
            <p className="edition-section-note">{module.image ? 'Echo & Dust' : 'From the archive'}</p>
          </div>
          {module.image ? (
            <figure className="edition-strip" aria-label="Echo & Dust">
              <span className="edition-strip-plate edition-strip-plate--intrinsic">
                <Image
                  src={module.image.src}
                  alt={module.image.alt}
                  width={module.image.width}
                  height={module.image.height}
                  sizes="(max-width: 900px) 100vw, 62vw"
                  className="edition-strip-img edition-strip-img--intrinsic"
                />
              </span>
              <figcaption className="edition-strip-caption">
                <span className="edition-strip-line">{module.caption}</span>
                {module.level === 'archive-reprint' && module.firstRan ? (
                  <span className="edition-strip-line db2-comic-archive">
                    {`A reprint — first ran ${formatEditorialDate(module.firstRan)}`}
                  </span>
                ) : null}
              </figcaption>
            </figure>
          ) : module.script && module.level !== 'approved-art' ? (
            // LEGACY: a frozen silhouette strip from before 2026-09-14, shown
            // only until its edition is corrected by revision.
            <ComicStrip
              script={module.script}
              caption={module.caption}
              level={module.level}
              firstRan={module.firstRan}
            />
          ) : null}
        </section>
      )

    case 'rabbitHoles':
      return (
        <section className="edition-section db2-rabbit" aria-labelledby={anchor?.id}>
          <div className="edition-section-bar">
            <h2 className="edition-section-head" id={anchor?.id}>
              Rabbit holes
            </h2>
            <p className="edition-section-note">Where today&rsquo;s Scripture leads</p>
          </div>
          <ol className="db2-rabbit-list">
            {module.items.map((item) => (
              <li key={item.reference} className="db2-rabbit-item">
                <p className="db2-rabbit-ref">{item.reference}</p>
                <blockquote className="db2-rabbit-text">{item.text}</blockquote>
                <p className="db2-rabbit-why">{item.why}</p>
              </li>
            ))}
          </ol>
        </section>
      )

    case 'goodNews':
      return (
        <section className="edition-section db2-goodnews" aria-label="Good news">
          <SectionBar head="Good news" note="Reported elsewhere, linked to the source" />
          <ul className="db2-goodnews-list">
            {module.items.map((item) => (
              <li key={item.sourceUrl} className="db2-goodnews-item">
                <h3 className="edition-item-head">{item.headline}</h3>
                <p className="edition-item-body">{item.summary}</p>
                <p className="edition-item-source">
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {item.sourceName}, {item.publishedOn} &rarr;
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )

    case 'hymn':
      return (
        <section className="edition-section" aria-label="The hymnal">
          <SectionBar head="The hymnal" note={`${module.author}, ${module.year}`} />
          <p className="edition-mini-title">{module.title}</p>
          {module.verses.map((v, i) => (
            <p key={i} className="edition-hymn-verse">
              {v.join('\n')}
            </p>
          ))}
        </section>
      )

    case 'catechism':
      return (
        <section aria-label="The catechism corner">
          <SectionBar head="The catechism corner" note={`Heidelberg, Q${module.number}`} />
          <p className="edition-catechism-q">{module.question}</p>
          <p className="edition-catechism-a">{module.answer}</p>
          <p className="edition-quote-cite">
            {module.source} &middot; {module.scriptures.join(' · ')}
          </p>
        </section>
      )

    case 'season':
      return (
        <section className="edition-season" aria-label="The season">
          <div
            className="edition-season-band"
            style={{ ['--season-color' as string]: module.season.colorHex }}
            aria-hidden="true"
          />
          <p className="edition-kicker">The season</p>
          <p className="edition-season-plain">{module.season.plainName}</p>
          <p className="edition-season-span">{module.season.span}</p>
          <p className="edition-season-essay">{module.season.essay}</p>
          <p className="edition-season-week">{module.season.weekLine}</p>
          <p className="edition-season-colorline">{module.season.color}</p>
        </section>
      )

    case 'word':
      return (
        <section id={anchor?.id} className="edition-word" aria-label="Word of the day">
          <p className="edition-kicker">{module.word.language} today</p>
          <p className="edition-word-original" lang={module.word.language === 'Greek' ? 'el' : 'he'}>
            {module.word.word}
          </p>
          <p className="edition-word-translit">{module.word.translit}</p>
          <p className="edition-word-gloss">{module.word.gloss}</p>
          <p className="edition-word-note">{module.word.source}</p>
          <p className="edition-word-ref">{module.word.reference}</p>
        </section>
      )

    case 'practice':
      return (
        <section className="edition-practice" aria-label="Today's practice">
          <p className="edition-kicker">The practice</p>
          <p className="edition-practice-do">{module.practice.instruction}</p>
          <p className="edition-practice-why">{module.practice.reason}</p>
          <p className="edition-practice-time">{module.practice.duration}</p>
        </section>
      )

    case 'prayer':
      return (
        <div id={anchor?.id}>
          <PrayerColumn prayer={module.prayer} />
        </div>
      )
    case 'redLetter':
      return <RedLetterColumn saying={module.saying} />
    case 'proverb':
      return <ProverbBox proverb={module} />
    case 'memoryVerse':
      return <VerseBox verse={module.verse} />
    case 'question':
      return <QuestionBox question={{ question: module.question }} />
    case 'voices':
      return <VoicesColumn voice={module} />
    case 'witness':
      return <WitnessColumn witness={module.witness} />
    case 'screening':
      return <ScreeningRoom items={module.items} />
    case 'letters':
      return <LettersColumn letters={module.letters} />
    case 'notices':
      return <NoticesColumn notices={module.notices} />

    case 'archivePull':
      return module.image ? (
        <ArchiveBox archive={module} />
      ) : (
        <section className="edition-archive" aria-label="From the archive">
          <SectionBar head="From the archive" note="An older reading, resurfaced" />
          <Link href={`/devotional/${module.slug}`} className="edition-archive-item">
            <span className="edition-archive-text">
              <span className="edition-archive-head">{module.title}</span>
              <span className="edition-archive-teaser">{module.teaser}</span>
              <span className="edition-archive-more">Read it &rarr;</span>
            </span>
          </Link>
        </section>
      )
    case 'planDay':
      return <B365Box b365={module} />

    case 'guides':
      return (
        <section className="edition-section" aria-label="How to read" id={anchor?.id}>
          <SectionBar head="How to read" note="Practical guides to reading and studying the Bible." />
          <div className="edition-guides">
            {module.guides.map((g) => (
              <article key={g.title} className="edition-guide">
                {g.image ? (
                  <Link href={`/guides/${g.slug}`} className="edition-guide-platelink">
                    <span className="edition-guide-plate">
                      <Image
                        src={g.image}
                        alt={g.alt}
                        fill
                        sizes="(max-width: 900px) 100vw, 30vw"
                        className="edition-guide-img"
                      />
                    </span>
                  </Link>
                ) : null}
                <p className="edition-guide-kicker">{g.kicker}</p>
                <h3 className="edition-guide-head">{g.title}</h3>
                <p className="edition-guide-stand">{g.standfirst}</p>
                <ol className="edition-guide-steps">
                  {g.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="edition-guide-time">{g.minutes}</p>
                <Link href={`/guides/${g.slug}`} className="edition-rail-more">
                  Read the full guide &rarr;
                </Link>
              </article>
            ))}
          </div>
        </section>
      )

    case 'gallery':
      return (
        <div id={anchor?.id}>
          <GallerySpread plates={module.plates} />
        </div>
      )

    case 'crossword':
      return (
        <section className="edition-section" aria-label="The crossword" id={anchor?.id}>
          <SectionBar head="The crossword" note={<>Answers from scripture &middot; no timer, no streak</>} />
          <CrosswordClient puzzle={module.puzzle} />
        </section>
      )
    case 'unscramble':
      return (
        <section aria-label="The verse, rebuilt">
          <SectionBar head="The verse, rebuilt" />
          <UnscrambleClient puzzle={module.puzzle} />
        </section>
      )
    case 'quiz':
      return (
        <section aria-label="Where is this from?">
          <SectionBar head="Where is this from?" note={`${module.questions.length} questions`} />
          <p className="edition-quiz-explainer">
            A verse from Scripture — tap the reference you think it comes from.
          </p>
          <QuizClient questions={module.questions} />
        </section>
      )
    case 'wordSearch':
      return (
        <section className="edition-section" aria-label="The word search">
          <SectionBar head="The word search" note={module.puzzle.theme} />
          <WordSearchClient puzzle={module.puzzle} />
        </section>
      )
    case 'coloring':
      return (
        <section className="edition-section" aria-label="The coloring corner">
          <SectionBar head="The coloring corner" note={`${module.art.title} · crayons or the dropper — no grades`} />
          <ColoringClient art={module.art} />
        </section>
      )
  }
}
