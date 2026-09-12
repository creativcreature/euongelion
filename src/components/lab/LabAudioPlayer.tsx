'use client'

/**
 * LAB — the Audible-style listening player, in literal context.
 *
 * Founder, 2026-09-10: "I want the audio player more like audible. Right now
 * its hard to navigate on mobile — especially when I am driving." Then, on the
 * first pass at it: "These desig. Currentky doenst looke like rhe website."
 *
 * That second note is why this is a route and not a picture. Everything here
 * takes its colour and type from the site's own tokens — `--color-amber`,
 * `--color-border`, the `--ts-*` ladder — so it cannot drift from the site the
 * way a standalone artboard did. It also plays a REAL rendered track with its
 * REAL chapter marks, so the scrubber is showing true linear time on a genuine
 * ten-section reading rather than an invented one.
 *
 * Three things are being decided here:
 *   1. the section rule — a 2px ruled track with two-tier ticks, replacing one
 *      `<input type="range">` that spans a whole 21-minute reading;
 *   2. the transport — conventional order, three sizes, nothing under 54px;
 *   3. drive mode — section SWITCHING, not stepping, at car-sized targets.
 *
 * Plan: docs/superpowers/plans/2026-09-10-audible-style-audio-player.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTime, type NarrationChapter } from '@/lib/audio/tracks'

/**
 * Labels that are module furniture rather than an editorial title.
 *
 * Measured over all 6,132 chapter marks in the manifest: Scripture 687,
 * Reflect 592, Word study 590, Opening 568, Prayer 520, Takeaway 487 — 3,444
 * marks, 56% of the catalog. 13% of readings repeat a label, and
 * bible-365-day-1 says "Scripture" seven times.
 *
 * This is the premise of the whole design: the player asks the reader to
 * navigate by section NAME, so a name that appears three times in one reading
 * cannot be the thing they aim at. These stay reachable — you may well want the
 * prayer — but they never own the headline, they take the short tick, and they
 * carry a timecode to tell repeats apart.
 */
const STRUCTURAL = new Set([
  'opening',
  'title',
  'scripture',
  'word study',
  'reflect',
  'reflection',
  'prayer',
  'takeaway',
])

function isStructural(label: string): boolean {
  return STRUCTURAL.has(label.trim().toLowerCase())
}

/** Where "back a section" lands: restart this one unless it only just began. */
function sectionBack(chapters: NarrationChapter[], at: number): number {
  const i = indexAt(chapters, at)
  if (at - chapters[i].t > 4) return chapters[i].t
  return chapters[i - 1]?.t ?? 0
}

function indexAt(chapters: NarrationChapter[], at: number): number {
  let index = 0
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].t <= at + 0.001) index = i
    else break
  }
  return index
}

export interface LabAudioPlayerProps {
  title: string
  context: string
  src: string
  duration: number
  chapters: NarrationChapter[]
}

/* ── the section rule ───────────────────────────────────────────────── */

const THUMB = 26

function SectionRule({
  chapters,
  at,
  duration,
  onSeek,
  tall = false,
}: {
  chapters: NarrationChapter[]
  at: number
  duration: number
  onSeek: (seconds: number) => void
  tall?: boolean
}) {
  const strip = useRef<HTMLDivElement | null>(null)
  const index = indexAt(chapters, at)

  // The track is inset by the thumb's radius at both ends, or a handle sitting
  // at 0:00 hangs half off the control.
  const pos = useCallback(
    (seconds: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${Math.max(0, Math.min(1, seconds / duration))})`,
    [duration],
  )

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const box = strip.current?.getBoundingClientRect()
      if (!box) return
      const usable = Math.max(1, box.width - THUMB)
      const ratio = (clientX - box.left - THUMB / 2) / usable
      const wanted = Math.max(0, Math.min(1, ratio)) * duration
      // Snap to the nearest section start. Fine positioning is what ±15 is
      // for; this control exists to get to the right part of the reading.
      let best = 0
      for (let i = 1; i < chapters.length; i += 1) {
        if (Math.abs(chapters[i].t - wanted) < Math.abs(chapters[best].t - wanted)) best = i
      }
      onSeek(chapters[best].t)
    },
    [chapters, duration, onSeek],
  )

  const onKey = (event: React.KeyboardEvent) => {
    const keys: Record<string, number | undefined> = {
      ArrowRight: chapters[index + 1]?.t,
      ArrowUp: chapters[index + 1]?.t,
      ArrowLeft: chapters[index - 1]?.t ?? 0,
      ArrowDown: chapters[index - 1]?.t ?? 0,
      Home: 0,
      End: chapters[chapters.length - 1].t,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    const to = keys[event.key]
    if (typeof to === 'number') onSeek(to)
  }

  const current = chapters[index]
  const valueText = `Section ${index + 1} of ${chapters.length}, ${current.label}${
    isStructural(current.label) ? ` at ${formatTime(current.t)}` : ''
  }`

  return (
    <div className={`lap-rule${tall ? ' lap-rule--tall' : ''}`}>
      <div
        ref={strip}
        className="lap-strip"
        role="slider"
        tabIndex={0}
        aria-label="Section"
        aria-valuemin={0}
        aria-valuemax={chapters.length - 1}
        aria-valuenow={index}
        aria-valuetext={valueText}
        onKeyDown={onKey}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          seekFromEvent(event.clientX)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromEvent(event.clientX)
        }}
      >
        <span className="lap-track" aria-hidden="true" />
        <span className="lap-fill" style={{ width: pos(at) }} aria-hidden="true" />
        {chapters.map((chapter, i) => (
          <span
            key={chapter.t}
            aria-hidden="true"
            className={`lap-tick${i === index ? ' lap-tick--now' : isStructural(chapter.label) ? ' lap-tick--struct' : ''}`}
            style={{ left: pos(chapter.t) }}
          />
        ))}
        <span className="lap-thumb" style={{ left: pos(at) }} aria-hidden="true" />
      </div>

      <p className="lap-now">
        <span className="lap-kicker">
          Section {index + 1} of {chapters.length}
        </span>
        <span className="lap-name">{current.label}</span>
      </p>
      <p className="lap-times">
        <span>{formatTime(at)}</span>
        <span>−{formatTime(Math.max(0, duration - at))}</span>
      </p>

      <style jsx>{`
        .lap-rule {
          padding: 0.5rem 1.1rem 0.75rem;
        }
        /* 56px of touch for a 2px rule — the rule is what you SEE, the strip
           is what you hit. */
        .lap-strip {
          position: relative;
          display: block;
          height: 56px;
          cursor: pointer;
          touch-action: none;
        }
        .lap-strip:focus-visible {
          outline: var(--mock-stroke, 1.5px) solid var(--color-amber);
          outline-offset: 2px;
        }
        .lap-track,
        .lap-fill {
          position: absolute;
          top: 50%;
          height: 2px;
          margin-top: -1px;
        }
        .lap-track {
          left: ${THUMB / 2}px;
          right: ${THUMB / 2}px;
          background: var(--color-border-strong, var(--color-border));
        }
        .lap-fill {
          left: ${THUMB / 2}px;
          background: var(--color-amber);
        }
        /* Two tiers. A tall tick is a section you would navigate BY; a short
           one is module furniture that repeats. */
        .lap-tick {
          position: absolute;
          top: 50%;
          width: var(--mock-stroke, 1.5px);
          height: 13px;
          margin: -6.5px 0 0 -0.75px;
          background: var(--color-text-secondary);
        }
        .lap-tick--struct {
          height: 7px;
          margin-top: -3.5px;
          opacity: 0.45;
        }
        .lap-tick--now {
          height: 15px;
          margin-top: -7.5px;
          background: var(--color-amber);
        }
        .lap-thumb {
          position: absolute;
          top: 50%;
          width: ${THUMB}px;
          height: ${THUMB}px;
          margin: -${THUMB / 2}px 0 0 -${THUMB / 2}px;
          border: var(--mock-stroke, 1.5px) solid var(--color-amber);
          border-radius: 50%;
          background: var(--color-bg);
        }
        .lap-now {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .lap-kicker {
          font-family: var(--font-family-ui);
          font-size: var(--ts-xs);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-amber);
        }
        .lap-name {
          font-size: var(--ts-md);
          line-height: 1.15;
          color: var(--color-text-primary);
        }
        .lap-times {
          display: flex;
          justify-content: space-between;
          margin-top: 0.35rem;
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          color: var(--color-text-secondary);
        }
        .lap-rule--tall .lap-strip {
          height: 78px;
        }
        .lap-rule--tall .lap-name {
          font-size: var(--ts-xl);
        }
      `}</style>
    </div>
  )
}

/* ── glyphs ─────────────────────────────────────────────────────────── */

const Glyph = {
  prev: 'M8 6h2v12H8zM18 6l-7 6 7 6z',
  next: 'M14 6h2v12h-2zM6 6l7 6-7 6z',
  play: 'M8 5l12 7-12 7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
      <style jsx>{`
        svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }
      `}</style>
    </svg>
  )
}

function Skip({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {back ? (
        <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
      ) : (
        <path d="M12 5V2l5 4-5 4V7a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z" />
      )}
      <text x="12" y="16.4" textAnchor="middle" fontSize="8.5" fill="currentColor" stroke="none">
        15
      </text>
      <style jsx>{`
        svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }
        path {
          fill: currentColor;
        }
      `}</style>
    </svg>
  )
}

/* ── the lab surface ────────────────────────────────────────────────── */

export default function LabAudioPlayer({
  title,
  context,
  src,
  duration,
  chapters,
}: LabAudioPlayerProps) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [drive, setDrive] = useState(false)
  const [barDismissed, setBarDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = duration || 1
  const index = indexAt(chapters, at)
  const tiers = useMemo(() => {
    const structural = chapters.filter((c) => isStructural(c.label)).length
    return { structural, editorial: chapters.length - structural }
  }, [chapters])

  const seek = useCallback((seconds: number) => {
    const element = audio.current
    if (element) element.currentTime = seconds
    setAt(seconds)
  }, [])

  const toggle = useCallback(() => {
    const element = audio.current
    if (!element) return
    if (element.paused) {
      void element.play().catch((cause: unknown) => {
        // NO SILENT FALLBACK: a player that will not play must say so.
        setError(cause instanceof Error ? cause.message : 'Playback was refused')
      })
    } else {
      element.pause()
    }
  }, [])

  // Escape leaves drive mode. A driver cannot fight an accidental modal.
  useEffect(() => {
    if (!drive) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrive(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drive])

  // Keep the screen awake in drive mode. Absent on iOS Safari before 16.4,
  // where the promise rejects and nothing else should break.
  useEffect(() => {
    if (!drive) return
    let sentinel: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & {
      wakeLock?: { request: (kind: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    void nav.wakeLock
      ?.request('screen')
      .then((granted) => {
        sentinel = granted
      })
      .catch(() => {})
    return () => {
      void sentinel?.release().catch(() => {})
    }
  }, [drive])

  const transport = (
    <div className="lap-transport">
      <button
        type="button"
        className="lap-btn lap-btn--step"
        aria-label="Previous section"
        onClick={() => seek(sectionBack(chapters, at))}
      >
        <Icon d={Glyph.prev} />
      </button>
      <button
        type="button"
        className="lap-btn lap-btn--skip"
        aria-label="Back 15 seconds"
        onClick={() => seek(Math.max(0, at - 15))}
      >
        <Skip back />
      </button>
      <button
        type="button"
        className="lap-btn lap-btn--play"
        aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
        onClick={toggle}
      >
        <Icon d={playing ? Glyph.pause : Glyph.play} />
      </button>
      <button
        type="button"
        className="lap-btn lap-btn--skip"
        aria-label="Forward 15 seconds"
        onClick={() => seek(Math.min(total, at + 15))}
      >
        <Skip />
      </button>
      <button
        type="button"
        className="lap-btn lap-btn--step"
        aria-label="Next section"
        disabled={index >= chapters.length - 1}
        onClick={() => seek(chapters[index + 1]?.t ?? at)}
      >
        <Icon d={Glyph.next} />
      </button>
    </div>
  )

  return (
    <div className="lap-root">
      {/* One real element, one real track. */}
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onTimeUpdate={(event) => setAt(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError('The track could not be loaded')}
      />

      {error && (
        <p className="lap-error" role="alert">
          {error}
        </p>
      )}

      {/* ── 1 · the player ───────────────────────────────────────── */}
      <section className="paper-box lab-box" aria-label="The player">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">The player</h2>
          <p className="edition-section-note">real track · real chapter marks</p>
        </div>

        <div className="lap-phone">
          <p className="lap-eyebrow">{context}</p>
          <h3 className="lap-title">{title}</h3>
          <SectionRule chapters={chapters} at={at} duration={total} onSeek={seek} />
          {transport}
          <button type="button" className="lab-btn lap-wide" onClick={() => setDrive(true)}>
            DRIVE MODE
          </button>
        </div>

        <p className="edition-section-note lap-note">
          Drag the rule, or focus it and use the arrow keys. It snaps to a
          section start, so the track stays true linear time — this reading&apos;s
          sections run {formatTime(shortest(chapters, total))} to{' '}
          {formatTime(longest(chapters, total))}, and a segmented bar would have
          needed a 9px floor per segment to stay hittable, which is what made the
          earlier version distort time.
        </p>
      </section>

      {/* ── 2 · why the ticks are tiered ─────────────────────────── */}
      <section className="paper-box lab-box" aria-label="Two tiers of section">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">Why the ticks are tiered</h2>
          <p className="edition-section-note">measured, all 6,132 marks</p>
        </div>
        <p className="lap-body">
          A rail built on names alone breaks for most of the catalog.{' '}
          <strong>3,444 of 6,132 chapter marks — 56% — are one of six module
          labels</strong>, and 13% of readings repeat a label: bible-365-day-1
          says &ldquo;Scripture&rdquo; seven times. So a tall tick marks a
          section you would navigate by, a short one marks furniture, and a
          repeated label carries its timecode to tell the repeats apart.
        </p>
        <ul className="lap-tiers">
          {chapters.map((chapter, i) => (
            <li key={chapter.t} className={isStructural(chapter.label) ? 'lap-struct' : ''}>
              <button type="button" onClick={() => seek(chapter.t)}>
                <span className="lap-tier-mark" aria-hidden="true" />
                <span className="lap-tier-label">{chapter.label}</span>
                <span className="lap-tier-time">{formatTime(chapter.t)}</span>
              </button>
              {i === index && <span className="lap-tier-here">playing</span>}
            </li>
          ))}
        </ul>
        <p className="edition-section-note">
          This reading: {tiers.editorial} editorial · {tiers.structural}{' '}
          structural. The catalog median is 10 sections, and 442 of 571 readings
          have exactly ten.
        </p>
      </section>

      {/* ── 3 · the docked bar ───────────────────────────────────── */}
      <section className="paper-box lab-box" aria-label="The docked bar">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">The docked bar</h2>
          <p className="edition-section-note">section leads · dismissible</p>
        </div>
        {barDismissed ? (
          <p className="lap-body">
            Dismissed — and the queue is untouched.{' '}
            <button type="button" className="lab-btn" onClick={() => setBarDismissed(false)}>
              BRING IT BACK
            </button>
          </p>
        ) : (
          <div className="lap-bar">
            <div className="lap-bar-progress" aria-hidden="true">
              <span style={{ width: `${(at / total) * 100}%` }} />
            </div>
            <div className="lap-bar-body">
              <span className="lap-bar-lines">
                <span className="lap-bar-section">{chapters[index].label}</span>
                <span className="lap-bar-sub">
                  {title} · {formatTime(Math.max(0, total - at))} left
                </span>
              </span>
              <button
                type="button"
                className="lap-bar-btn"
                aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
                onClick={toggle}
              >
                <Icon d={playing ? Glyph.pause : Glyph.play} />
              </button>
              <button
                type="button"
                className="lap-bar-btn lap-bar-btn--close"
                aria-label="Stop showing the player"
                onClick={() => setBarDismissed(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <p className="edition-section-note">
          Two fixes. The 19 Aug pattern sweep called the missing dismiss
          &ldquo;the one clear defect&rdquo; in what ships, and it is still
          missing. And the shipped bar hides itself on the reading it is playing
          (<code>AudioDrawer.tsx:304</code>) — the persistent control vanishes
          exactly where a reader is most likely to be.
        </p>
      </section>

      {/* ── drive mode ───────────────────────────────────────────── */}
      {drive && (
        <div className="lap-drive" role="dialog" aria-modal="true" aria-label="Drive mode">
          <p className="lap-drive-eyebrow">{context}</p>
          <SectionRule chapters={chapters} at={at} duration={total} onSeek={seek} tall />
          <div className="lap-drive-list">
            {chapters.map((chapter, i) => (
              <button
                key={chapter.t}
                type="button"
                className={`lap-drive-row${i === index ? ' lap-drive-row--now' : ''}`}
                aria-label={`Section ${i + 1}, ${chapter.label}`}
                onClick={() => seek(chapter.t)}
              >
                <span>{chapter.label}</span>
                <span className="lap-drive-t">{formatTime(chapter.t)}</span>
              </button>
            ))}
          </div>
          <div className="lap-drive-transport">
            <button
              type="button"
              className="lap-drive-side"
              aria-label="Back 15 seconds"
              onClick={() => seek(Math.max(0, at - 15))}
            >
              <Skip back />
            </button>
            <button
              type="button"
              className="lap-drive-play"
              aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
              onClick={toggle}
            >
              <Icon d={playing ? Glyph.pause : Glyph.play} />
            </button>
            <button
              type="button"
              className="lap-drive-side"
              aria-label="Forward 15 seconds"
              onClick={() => seek(Math.min(total, at + 15))}
            >
              <Skip />
            </button>
          </div>
          <button type="button" className="lap-drive-exit" onClick={() => setDrive(false)}>
            EXIT DRIVE MODE
          </button>
        </div>
      )}

      <style jsx>{`
        .lap-root {
          display: contents;
        }
        .lap-error {
          margin: 0 0 1rem;
          padding: 0.7rem 1rem;
          border: var(--mock-stroke, 1.5px) solid var(--color-border);
          border-left: 3px solid var(--color-crimson);
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          color: var(--color-text-primary);
        }
        /* A real phone measure, not a phone-shaped picture: the player is
           constrained the way the drawer is, and nothing else is faked. */
        .lap-phone {
          max-width: 25rem;
          border: var(--mock-stroke, 1.5px) solid var(--color-border);
          border-left: 3px solid var(--color-amber);
        }
        .lap-eyebrow {
          padding: 0.9rem 1.1rem 0;
          font-family: var(--font-family-ui);
          font-size: var(--ts-xs);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
        }
        .lap-title {
          margin: 0.25rem 0 0;
          padding: 0 1.1rem;
          font-size: var(--ts-lg);
          line-height: 1.12;
          color: var(--color-text-primary);
        }
        .lap-transport {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.2rem;
          padding: 0.4rem 0.8rem 1rem;
        }
        /* Three sizes, so the hand can tell them apart without the eye.
           Nothing below 54px; the shipped drawer has all five at 44. */
        .lap-btn {
          display: grid;
          place-items: center;
          min-width: 54px;
          min-height: 54px;
          padding: 15px;
          background: transparent;
          border: 0;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .lap-btn--skip {
          min-width: 60px;
          min-height: 60px;
          padding: 16px;
          color: var(--color-text-primary);
        }
        .lap-btn--play {
          min-width: 82px;
          min-height: 82px;
          padding: 26px;
          background: var(--color-amber);
          border-radius: 50%;
          color: var(--color-bg);
        }
        .lap-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .lap-btn:focus-visible {
          outline: var(--mock-stroke, 1.5px) solid var(--color-amber);
          outline-offset: 2px;
        }
        .lap-wide {
          display: block;
          width: 100%;
          min-height: 48px;
        }
        .lap-note,
        .lap-body {
          margin-top: 0.9rem;
        }
        .lap-body {
          font-size: var(--ts-base);
          line-height: 1.55;
          color: var(--color-text-primary);
        }

        /* ── the tier list ── */
        .lap-tiers {
          margin: 0.9rem 0 0.7rem;
          padding: 0;
          list-style: none;
          border-top: var(--mock-stroke, 1.5px) solid var(--color-border);
        }
        .lap-tiers li {
          position: relative;
          border-bottom: var(--mock-stroke, 1.5px) solid var(--color-border);
        }
        .lap-tiers button {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          min-height: 54px;
          padding: 0 0.9rem;
          background: transparent;
          border: 0;
          text-align: left;
          cursor: pointer;
        }
        .lap-tier-mark {
          flex: none;
          width: var(--mock-stroke, 1.5px);
          height: 13px;
          background: var(--color-text-secondary);
        }
        .lap-struct .lap-tier-mark {
          height: 7px;
          opacity: 0.45;
        }
        .lap-tier-label {
          flex: 1;
          min-width: 0;
          font-size: var(--ts-base);
          color: var(--color-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lap-struct .lap-tier-label {
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
        }
        .lap-tier-time,
        .lap-tier-here {
          flex: none;
          font-family: var(--font-family-ui);
          font-size: var(--ts-xs);
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }
        .lap-tier-here {
          position: absolute;
          top: 50%;
          right: 4.2rem;
          margin-top: -0.55em;
          text-transform: uppercase;
          color: var(--color-amber);
        }

        /* ── the docked bar ── */
        .lap-bar {
          margin-top: 0.9rem;
          border-top: var(--mock-stroke, 1.5px) solid var(--color-border);
          border-bottom: var(--mock-stroke, 1.5px) solid var(--color-border);
        }
        .lap-bar-progress {
          position: relative;
          height: 2px;
          background: var(--color-border-strong, var(--color-border));
        }
        .lap-bar-progress span {
          position: absolute;
          inset: 0 auto 0 0;
          background: var(--color-amber);
        }
        .lap-bar-body {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.2rem 0.4rem 1rem;
          border-left: 3px solid var(--color-amber);
        }
        .lap-bar-lines {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-width: 0;
        }
        .lap-bar-section {
          font-size: var(--ts-base);
          line-height: 1.25;
          color: var(--color-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lap-bar-sub {
          font-family: var(--font-family-ui);
          font-size: var(--ts-xs);
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lap-bar-btn {
          display: grid;
          place-items: center;
          flex: none;
          width: 52px;
          height: 52px;
          padding: 15px;
          background: transparent;
          border: 0;
          color: var(--color-text-primary);
          cursor: pointer;
        }
        .lap-bar-btn--close {
          width: 48px;
          padding: 16px;
          color: var(--color-text-secondary);
        }

        /* ── drive mode ── */
        .lap-drive {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          flex-direction: column;
          padding: env(safe-area-inset-top, 0.8rem) 0 env(safe-area-inset-bottom, 0.8rem);
          background: var(--color-bg);
          overflow-y: auto;
        }
        .lap-drive-eyebrow {
          padding: 1rem 1.2rem 0;
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-amber);
        }
        .lap-drive-list {
          flex: 1;
          border-top: var(--mock-stroke, 1.5px) solid var(--color-border);
        }
        /* Sliding beats scrolling while the car is moving, so the rule is at
           the top; the list is for when it is stopped. Nothing under 68px. */
        .lap-drive-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          width: 100%;
          min-height: 68px;
          padding: 0 1.2rem;
          background: transparent;
          border: 0;
          border-bottom: var(--mock-stroke, 1.5px) solid var(--color-border);
          font-size: var(--ts-md);
          text-align: left;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .lap-drive-row--now {
          border-left: 3px solid var(--color-amber);
          color: var(--color-text-primary);
        }
        .lap-drive-t {
          flex: none;
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
        }
        .lap-drive-transport {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.9rem 1.2rem 0;
        }
        .lap-drive-side {
          display: grid;
          place-items: center;
          width: 96px;
          height: 96px;
          padding: 26px;
          background: transparent;
          border: var(--mock-stroke, 1.5px) solid var(--color-border);
          color: var(--color-text-primary);
          cursor: pointer;
        }
        .lap-drive-play {
          display: grid;
          place-items: center;
          flex: 1;
          height: 132px;
          padding: 42px;
          background: var(--color-amber);
          border: 0;
          color: var(--color-bg);
          cursor: pointer;
        }
        .lap-drive-exit {
          width: 100%;
          min-height: 76px;
          margin-top: 0.9rem;
          background: transparent;
          border: 0;
          border-top: var(--mock-stroke, 1.5px) solid var(--color-border);
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        @media (min-width: 48rem) {
          .lap-drive-list {
            columns: 2;
            column-gap: 0;
          }
        }
      `}</style>
    </div>
  )
}

/** Shortest section in this reading, for the note under the player. */
function shortest(chapters: NarrationChapter[], duration: number): number {
  return spans(chapters, duration).reduce((a, b) => Math.min(a, b), Infinity)
}

/** Longest section in this reading. */
function longest(chapters: NarrationChapter[], duration: number): number {
  return spans(chapters, duration).reduce((a, b) => Math.max(a, b), 0)
}

function spans(chapters: NarrationChapter[], duration: number): number[] {
  return chapters.map((chapter, i) => (chapters[i + 1]?.t ?? duration) - chapter.t)
}
