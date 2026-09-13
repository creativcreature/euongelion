'use client'

import { isStructuralChapter, type NarrationChapter } from '@/lib/audio/tracks'

/**
 * The section rule — a thin ruled track with tiered chapter ticks.
 *
 * It replaces a single `<input type="range">` spanning a whole reading. Across
 * a 350px control a 21-minute reading is **3.6 seconds per pixel** with the
 * chapter marks about 15px apart, so the one gesture the control exists for
 * cannot be aimed — and the founder's report was that this is hardest exactly
 * where it matters most: "especially when I am driving".
 *
 * Two earlier shapes were built and rejected, and the reasons are worth keeping
 * because both look right on paper:
 *
 *  - a prev/now/next RAIL with no scrubber, which removed the ability to reach
 *    an arbitrary section at all;
 *  - a SEGMENTED bar, which needs a minimum width per segment to stay hittable
 *    (9px). Real sections run from about 6 seconds to two and a half minutes,
 *    so proportional segments make the short ones under 2px, and a floor makes
 *    the bar stop showing real time. Founder: "The line is too thick — needs a
 *    thinner rule."
 *
 * Ticks need no width, so the rule is 2px — matching the site's own progress
 * furniture — and the track stays TRUE LINEAR TIME. What the thin rule bought
 * is accuracy, not just restraint.
 *
 * The ticks are tiered because 3,451 of the catalog's 6,132 chapter marks
 * (56.3%) are module labels rather than editorial headings, and 13% of readings
 * repeat a label — `bible-365-day-1` says "Scripture" seven times. A tall tick
 * marks a section worth aiming at; a short one marks furniture. See
 * `isStructuralChapter`.
 */

/** The thumb's diameter. The track is inset by half of it at both ends, or a
 *  handle sitting at 0:00 hangs off the control. */
const THUMB = 26

export interface SectionRuleProps {
  chapters: NarrationChapter[]
  /** Seconds elapsed. */
  currentTime: number
  /** Length of the reading in seconds. */
  duration: number
  /** Called with the seconds to move to. Always a section start. */
  onSeek: (seconds: number) => void
  /** An armed sleep stop, drawn as a full-height marker. */
  stopAt?: number | null
  /** Larger type and a taller strip, for drive mode. */
  tall?: boolean
}

function indexAt(chapters: NarrationChapter[], seconds: number): number {
  let index = 0
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].t <= seconds + 0.001) index = i
    else break
  }
  return index
}

/** m:ss, for the timecode that tells two "Scripture" sections apart. */
function stamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function SectionRule({
  chapters,
  currentTime,
  duration,
  onSeek,
  stopAt = null,
  tall = false,
}: SectionRuleProps) {
  // One section is not a rule. Every reading in the catalog has at least five,
  // so no UI is built for this — but the prop is public and a caller can pass
  // anything, and rendering a track with a single tick would be a lie.
  if (!chapters || chapters.length < 2 || !(duration > 0)) return null

  const index = indexAt(chapters, currentTime)
  const current = chapters[index]

  const at = (seconds: number) =>
    `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${Math.max(0, Math.min(1, seconds / duration))})`

  const seekFrom = (clientX: number, element: HTMLElement) => {
    const box = element.getBoundingClientRect()
    const usable = Math.max(1, box.width - THUMB)
    const wanted =
      Math.max(0, Math.min(1, (clientX - box.left - THUMB / 2) / usable)) * duration
    // Snap to the nearest section start. Fine positioning is what ±15 is for;
    // this control exists to get to the right PART of the reading.
    let best = 0
    for (let i = 1; i < chapters.length; i += 1) {
      if (Math.abs(chapters[i].t - wanted) < Math.abs(chapters[best].t - wanted)) best = i
    }
    onSeek(chapters[best].t)
  }

  // Keyboard, because a drag-only control would be a regression from the range
  // input this replaces — that one at least stepped with the arrow keys.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number | undefined> = {
      ArrowRight: chapters[index + 1]?.t,
      ArrowUp: chapters[index + 1]?.t,
      ArrowLeft: chapters[index - 1]?.t ?? 0,
      ArrowDown: chapters[index - 1]?.t ?? 0,
      Home: 0,
      End: chapters[chapters.length - 1].t,
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    const to = moves[event.key]
    if (typeof to === 'number') onSeek(to)
  }

  return (
    <div className={`lsn-rule${tall ? ' is-tall' : ''}`}>
      <div
        className="lsn-rule-strip"
        role="slider"
        tabIndex={0}
        aria-label="Seek by section"
        aria-valuemin={0}
        aria-valuemax={chapters.length - 1}
        aria-valuenow={index}
        aria-valuetext={`Section ${index + 1} of ${chapters.length}, ${current.label}${
          isStructuralChapter(current.label) ? ` at ${stamp(current.t)}` : ''
        }`}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          seekFrom(event.clientX, event.currentTarget)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            seekFrom(event.clientX, event.currentTarget)
          }
        }}
      >
        <span className="lsn-rule-track" aria-hidden="true" />
        <span
          className="lsn-rule-fill"
          style={{ width: at(currentTime) }}
          aria-hidden="true"
        />
        {chapters.map((chapter, i) => (
          <span
            key={`${chapter.t}-${i}`}
            aria-hidden="true"
            className={`lsn-rule-tick${
              i === index
                ? ' is-now'
                : isStructuralChapter(chapter.label)
                  ? ' is-struct'
                  : ''
            }`}
            style={{ left: at(chapter.t) }}
          />
        ))}
        {stopAt !== null && stopAt > 0 && stopAt <= duration && (
          <span
            className="lsn-rule-stop"
            aria-hidden="true"
            style={{ left: at(stopAt) }}
          />
        )}
        <span
          className="lsn-rule-thumb"
          style={{ left: at(currentTime) }}
          aria-hidden="true"
        />
      </div>

      <p className="lsn-rule-now">
        <span className="lsn-rule-kicker">
          Section {index + 1} of {chapters.length}
        </span>
        <span className="lsn-rule-name">{current.label}</span>
      </p>

      <style jsx>{`
        .lsn-rule {
          padding: 0 0.1rem;
        }
        /* 56px of touch for a 2px rule: the rule is what you see, the strip is
           what you hit. touch-action stops the page scrolling under a drag. */
        .lsn-rule-strip {
          position: relative;
          display: block;
          height: 56px;
          cursor: pointer;
          touch-action: none;
        }
        .lsn-rule-strip:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
        .lsn-rule-track,
        .lsn-rule-fill {
          position: absolute;
          top: 50%;
          height: 2px;
          margin-top: -1px;
        }
        .lsn-rule-track {
          left: ${THUMB / 2}px;
          right: ${THUMB / 2}px;
          background: var(--color-border-strong, var(--color-border));
        }
        .lsn-rule-fill {
          left: ${THUMB / 2}px;
          background: var(--color-gold);
        }
        .lsn-rule-tick {
          position: absolute;
          top: 50%;
          width: 1.5px;
          height: 13px;
          margin: -6.5px 0 0 -0.75px;
          background: var(--color-text-secondary, var(--color-fg));
        }
        .lsn-rule-tick.is-struct {
          height: 7px;
          margin-top: -3.5px;
          opacity: 0.45;
        }
        .lsn-rule-tick.is-now {
          height: 15px;
          margin-top: -7.5px;
          background: var(--color-gold);
        }
        .lsn-rule-stop {
          position: absolute;
          top: 50%;
          width: 1.5px;
          height: 22px;
          margin: -11px 0 0 -0.75px;
          background: var(--color-text-primary, var(--color-fg));
        }
        .lsn-rule-thumb {
          position: absolute;
          top: 50%;
          width: ${THUMB}px;
          height: ${THUMB}px;
          margin: -${THUMB / 2}px 0 0 -${THUMB / 2}px;
          border: 1.5px solid var(--color-gold);
          border-radius: 50%;
          background: var(--color-bg);
        }
        .lsn-rule-now {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          margin-top: -0.35rem;
        }
        .lsn-rule-kicker {
          font-family: var(--font-family-ui);
          font-size: var(--ts-xs);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-gold);
        }
        .lsn-rule-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: var(--ts-base);
          line-height: 1.2;
          color: var(--color-text-primary, var(--color-fg));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lsn-rule.is-tall .lsn-rule-strip {
          height: 78px;
        }
        .lsn-rule.is-tall .lsn-rule-name {
          font-size: var(--ts-xl);
          white-space: normal;
        }
      `}</style>
    </div>
  )
}
