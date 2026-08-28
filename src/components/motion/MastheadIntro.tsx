'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * THE PRESS IMPRESSION (F-108 r2).
 *
 * r1 measured the real masthead correctly on every single run, at every
 * viewport, in both themes — and then threw the answer away. `.press-word`
 * carried `animation: press-set 900ms … both`, and a running fill:both CSS
 * animation outranks that element's own style attribute, so the component's
 * inline hand-off transform never applied once in production. The word did not
 * move a single pixel after t=888ms of a 1972ms sequence. Everything the
 * founder called "stripped down basic" and "ends awkwardly" is downstream of
 * that one fact.
 *
 * r2 makes that bug unrepresentable rather than fixed:
 *   1. Every beat is a SCRIPT-CREATED WAAPI animation. Script animations sort
 *      above CSS animations and above all author declarations, so this
 *      sequence sits at the TOP of the cascade instead of the bottom.
 *   2. React never writes an inline transform, opacity or clip-path. It writes
 *      custom properties, cloned type properties, and `willChange`. The single
 *      exception is Animation.commitStyles() on abort, which runs only after
 *      every animation has been cancelled.
 *   3. No property is ever animated twice on the same element.
 *   4. __tests__/press-intro-contract.test.ts enforces 1-3 against globals.css.
 *
 * The wordmark is a runtime CLONE of `.js-shell-masthead-fit`, positioned at
 * its measured rect and dressed in its computed type contract, so
 * `transform: none` IS the masthead and there is no landing number left to get
 * wrong. The whole sequence is the clone travelling back from an inverted set
 * pose, and the exit is a fade onto a pixel-identical twin — a no-op at every
 * alpha value.
 *
 * SAFETY, unchanged and non-negotiable: the overlay paints ON TOP of a fully
 * rendered page, is pointer-events:none and aria-hidden from the first frame,
 * plays once per session on '/' only, is skipped under BOTH reduced-motion
 * signals, aborts on the reader's first input, and is torn down by a hard
 * timeout even if an animation never resolves.
 */

const SEEN_KEY = 'euangelion:masthead-intro'

/** Longest we wait for Industry + the header's own refit before giving up and
 *  taking the sheet-only exit. All three Industry @font-face blocks are
 *  font-display: block (globals.css:308-332) and EuangelionShellHeader re-fits
 *  the masthead on document.fonts.ready (EuangelionShellHeader.tsx:480-482) —
 *  measuring before that returns Avenir metrics for an invisible word AND a
 *  pre-fit clamp size for the target. Both are invisible in dev with a warm
 *  cache and both are live on a cold Cloudflare Workers load. */
const ARM_DEADLINE_MS = 600

/** FAILSAFE 3 of 3, from mount. Never the normal exit — that is driven by the
 *  wipe animation's finished promise. r1's HARD_STOP_MS was doing double duty
 *  as both failsafe and normal exit, which left ~150ms of a fully-opaque
 *  duplicate sitting on the page before it blinked out. */
const HARD_STOP_MS = 2600

/** THE WORD NEVER LEAVES THE MASTHEAD'S OWN POSITION.
 *
 *  Founder 2026-08-26: "you see the word twice during the animation. Its
 *  already there before animations... currently its still looking extremely
 *  amature."
 *
 *  He is right, and it was never a rendering fault — the print stroke is
 *  pixel-continuous and the landing was exact to 0.0px. The fault was the
 *  CONCEPT. The masthead is a permanent element of this page. Flying a second,
 *  centre-screen copy of it in and parking it on top of the first means the
 *  reader genuinely sees the wordmark twice, and "logo flies in and becomes
 *  the header" is a dated trope besides.
 *
 *  The original brief never asked for the duplicate. Founder 2026-08-16:
 *  "Show euangelion first white on blue, then animate to system setting
 *  background... and to normal site state." That is satisfied — better —
 *  by printing the masthead where it already lives: cream knocked out of the
 *  ink, then the sheet pulled off it to leave the printed page behind.
 *
 *  So the impression is now a PRESS, not a flight: the plate meets the paper
 *  fractionally oversize and high, and settles into exact register. Total
 *  travel 10px against the site's own +/-28px cap, and a 3.5% uniform scale
 *  (not a distortion — the dock already scales the masthead to 0.86). */
const IMPRESSION_SCALE = 1.035
const IMPRESSION_RISE = 10

const E_SQUEEGEE = 'cubic-bezier(0.83, 0, 0.17, 1)' // the sheet-only exit — globals.css:14083
const E_IN = 'cubic-bezier(0.4, 0, 1, 1)' // --ease-in, globals.css:1102
const E_SWAP = 'cubic-bezier(0.4, 0, 0.6, 1)'

/* COMPRESSED 2026-08-26. The sequence ran 1720ms on top of a hydration-bound
 * arm measured at ~430ms, so the reader waited ~2.15s — and the founder has
 * now called the timing wrong three times across three versions. The arm is
 * not removable (see Effect A), so the sequence gives the time back: 1720 ->
 * 1240ms, which lands the whole open at ~1.7s. Every beat keeps its shape and
 * its easing; only the clock is tighter. The print stroke is deliberately NOT
 * scaled with the rest — it stays 220ms, because it is the payoff and it is
 * the one beat the eye has to read rather than merely register. */
/** THE ROLL. The reference runs 2s with a 47.5ms stagger over SVG paths; this
 *  is the same shape at 460ms / 26ms over real text, because the founder has
 *  called this intro mistimed three times and every complaint was that it
 *  dragged. Ten letters: the last starts at 60 + 9x26 = 294ms and lands at
 *  754ms. */
const T_ROLL = 60
const ROLL_MS = 460
const ROLL_STAGGER = 26
/** Out-expo. The roll should decelerate into register like a flap settling,
 *  not ease symmetrically like a machine part. */
const E_ROLL = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** The impression settling into register — the old flight's slot, now a 10px
 *  move instead of a 239px one, so it costs far less clock. */
const T_WIPE = 780
const T_PRINT = 880
const T_RELEASE = 1080
const T_END = 1180
const D_WIPE = T_END - T_WIPE // 580
const OFF_PRINT = (T_PRINT - T_WIPE) / D_WIPE // 0.241379
const OFF_RELEASE = (T_RELEASE - T_WIPE) / D_WIPE // 0.655172

/** Copied verbatim from the masthead. Never restated by hand — see the CSS
 *  comment on .press-word for why. */
const TYPE_PROPS = [
  'font-family',
  'font-weight',
  'font-style',
  'font-size',
  'font-stretch',
  'font-kerning',
  'font-feature-settings',
  'font-variation-settings',
  'font-optical-sizing',
  'letter-spacing',
  'line-height',
  'text-transform',
  'text-rendering',
  '-webkit-font-smoothing',
] as const

/** Makes the effect idempotent across a React StrictMode mount → cleanup →
 *  mount. r1 wrote the session flag before any visible work and bailed when it
 *  was already set, so a remount could spend the one play the reader gets.
 *  (Measured 2026-08-26: r1 DID still play under `npm run dev` — three
 *  captures confirm it — so this guard is insurance against the remount race,
 *  not a fix for an observed dev-only blackout. The flag write now happens on
 *  the frame the sequence commits, which is the actual repair.) */
let sequenceStarted = false

interface Geo {
  left: number
  top: number
  width: number
  height: number
  dy: number
  k: number
  land: string
  text: string
  type: Record<string, string>
}

type Mode = 'boot' | 'sheet' | 'full' | 'gone'

/** THE ROLL MARKUP. One mask per letter, two stacked copies inside it; the
 *  column travels exactly one face so the top copy leaves as the duplicate
 *  rises into the window. Spaces are rendered as plain spans — masking a space
 *  would collapse it and close the word up.
 *
 *  Splitting the word into inline-blocks is safe for THIS masthead because it
 *  inherits `font-kerning: none` from `.mock-home .text-masthead`, so there are
 *  no pair kerns to lose; letter-spacing applies per character either way. The
 *  type-parity gate re-measures anyway and drops to the sheet-only exit if the
 *  split word disagrees with the masthead by more than 2px. */
function RolledWord({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) =>
        ch === ' ' ? (
          <span key={`sp-${i}`}> </span>
        ) : (
          <span className="press-letter" key={`${ch}-${i}`} data-i={i}>
            <span className="press-letter-roll">
              <span className="press-letter-face">{ch}</span>
              <span className="press-letter-face">{ch}</span>
            </span>
          </span>
        ),
      )}
    </>
  )
}

const snap = (v: number) => {
  const dpr = window.devicePixelRatio || 1
  return Math.round(v * dpr) / dpr
}
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

export default function MastheadIntro() {
  const [mode, setMode] = useState<Mode>('boot')
  const [geo, setGeo] = useState<Geo | null>(null)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const inkRef = useRef<HTMLSpanElement | null>(null)
  const paperPlateRef = useRef<HTMLSpanElement | null>(null)
  const printPlateRef = useRef<HTMLSpanElement | null>(null)
  const flightRef = useRef<HTMLSpanElement | null>(null)
  const paperRef = useRef<HTMLSpanElement | null>(null)

  // ── EFFECT A: gate, wait, measure, decide. Never animates. ──────────────
  useEffect(() => {
    const html = document.documentElement
    const bail = () => {
      html.setAttribute('data-press', 'done')
      setMode('gone')
    }

    if (sequenceStarted) return bail()
    // The head script has already checked pathname, session, the OS query and
    // the persisted in-app toggle. If it did not arm, there is nothing to do.
    if (html.getAttribute('data-press') !== 'armed') return bail()
    // The SECOND reduced-motion signal. Providers stamps html.reduce-motion
    // AFTER hydration from the persisted zustand store (providers.tsx:96), so
    // the head script cannot see it. r1 checked only matchMedia, which turned
    // this setting into a ~950ms opaque cobalt block with a static duplicate
    // wordmark (globals.css:9456-9490 collapses every duration to 0.001ms but
    // the JS still ran the whole sequence).
    if (html.classList.contains('reduce-motion')) return bail()

    sequenceStarted = true
    const t0 = performance.now()
    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number) =>
      new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))
    const visible = () =>
      document.visibilityState === 'visible'
        ? Promise.resolve()
        : new Promise<void>((r) => {
            const h = () => {
              if (document.visibilityState !== 'visible') return
              document.removeEventListener('visibilitychange', h)
              r()
            }
            document.addEventListener('visibilitychange', h)
          })

    const measure = (): Geo | null => {
      // A reader who has already scrolled is reading. The overlay is fixed and
      // the page scrolls under it, and the header's own dock observer applies
      // scale(0.86) the moment the masthead leaves view (globals.css:14243),
      // so a viewport rect taken while scrolled is meaningless.
      if (window.scrollY > 4) return null

      // SCOPED. Four components render .js-shell-masthead-fit — the header,
      // SiteBottom, and DevotionalPageClient twice. Document order happens to
      // return the header's today; nothing in r1's selector said so.
      const real = document.querySelector<HTMLElement>(
        '.mock-shell-header .js-shell-masthead-fit',
      )
      if (!real) return null

      const r = real.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      // Laid out, fitted, and fully on screen. A pre-fit clamp size, a hidden
      // ancestor, or a restored scroll position all fail this.
      if (!(r.width > vw * 0.45 && r.width <= vw && r.height > 8)) return null
      if (!(r.top >= 0 && r.bottom < vh * 0.55)) return null

      const cs = getComputedStyle(real)
      // Read with the CSS name, STORE with the React name. React's inline
      // style object is camelCase; handing it 'font-family' logs
      // "Unsupported style property font-family. Did you mean fontFamily?"
      // once per property. It happened to still apply, but 14 console errors
      // per load is not a thing to ship.
      const camel = (k: string) =>
        k.startsWith('-webkit-')
          ? 'Webkit' +
            k
              .slice(8)
              .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
              .replace(/^([a-z])/, (_, c: string) => c.toUpperCase())
          : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      const type: Record<string, string> = {}
      for (const p of TYPE_PROPS) {
        const v = cs.getPropertyValue(p)
        if (v) type[camel(p)] = v
      }

      // Impression pose. The word sits at the masthead's own rect and only
      // presses into it, so there is no second position to get wrong and
      // nothing for the reader to see twice. Guarded so the widest frame
      // (impression scale x the 1.06 over-track) still cannot be cropped.
      const kMax = (vw - 32) / (r.width * 1.06)
      const k = Math.min(IMPRESSION_SCALE, kMax)
      const dy = -IMPRESSION_RISE
      void vh

      return {
        left: snap(r.left),
        top: snap(r.top),
        width: snap(r.width),
        height: snap(r.height),
        dy,
        k,
        land: cs.color,
        text: (real.textContent || 'EUANGELION').trim(),
        type,
      }
    }

    void (async () => {
      // A background tab throttles rAF to near zero while timers keep ticking,
      // so r1 could burn the whole sequence and mark it seen before the reader
      // ever looked at it.
      await visible()
      if (cancelled) return

      try {
        await Promise.race([
          document.fonts
            .load('700 100px Industry')
            .then(() => document.fonts.ready),
          wait(ARM_DEADLINE_MS),
        ])
      } catch {
        /* fonts API unavailable — the deadline below still governs */
      }
      await raf()
      await raf() // one frame past the header's own rafFit
      if (cancelled) return

      // WAIT FOR THE FIT TO SETTLE, don't just wait for fonts.
      // document.fonts.ready resolving is NOT the same event as the header
      // finishing its own fitAll() (EuangelionShellHeader.tsx:444-482), and on
      // a warm cache fonts.ready resolves so early that we measured the
      // PRE-FIT clamp size. Measured 2026-08-26: the target rect jumps
      // 1128.7 -> 1372.9px at t=60ms (light), 296ms (dark), 280ms (mobile) —
      // the timing is not even stable across themes, so no fixed delay is
      // correct. Poll until the width is unchanged across two consecutive
      // frames, with ARM_DEADLINE_MS as the ceiling.
      const target = () =>
        document.querySelector<HTMLElement>(
          '.mock-shell-header .js-shell-masthead-fit',
        )
      // IS THE HEADER'S OWN FIT DONE? Not "has the rect stopped moving" — the
      // PRE-fit rect is perfectly stable too, which is how the first attempt
      // measured 1128.7px and flew the word to a stale target.
      // fitOne() sizes the span to heading.clientWidth * 0.988
      // (EuangelionShellHeader.tsx:453-466), so the fitted state is a RATIO:
      // pre-fit measures 0.81 of its heading, fitted measures 0.988. Gate on
      // that and the check is semantic rather than a race against a timer.
      const fitted = (el: HTMLElement | null) => {
        if (!el) return false
        const heading = el.closest('.mock-masthead-word') as HTMLElement | null
        if (!heading || !heading.clientWidth) return false
        return el.getBoundingClientRect().width / heading.clientWidth >= 0.95
      }
      // WHY THE ARM CANNOT BE SHORTENED, so nobody spends another hour on it.
      // Measured 2026-08-26, dev and production alike: Industry is preloaded
      // and resolves at ~0ms, document.fonts.ready lands at 89ms (dev) /
      // 174ms (prod) — but the masthead is not FITTED until ~429ms in BOTH,
      // because EuangelionShellHeader's fitAll() is scheduled from its own
      // effect and therefore waits on React hydration.
      //
      // Dispatching a synthetic `resize` to trigger the header's own
      // rafFit listener was tried and measured: no effect (fitted stayed
      // 432ms), because that listener is itself registered inside the effect
      // that hydration is gating. There is nothing to nudge yet.
      //
      // Re-deriving the fit ourselves would mean predicting a post-fit rect
      // from pre-fit metrics — the height and baseline shift with font-size,
      // and this design's whole value is that the landing is exact rather
      // than nearly right. So the arm stays, and the SHEET carries it: the
      // Ben-Day field registers in discrete steps from the first painted
      // frame (globals.css, press-register-jitter), which is beat 0 — the
      // press inking up — rather than a dead cobalt hold.
      let stable = 0
      while (performance.now() - t0 < ARM_DEADLINE_MS && stable < 2) {
        stable = fitted(target()) ? stable + 1 : 0
        await raf()
        if (cancelled) return
      }

      const late = stable < 2
      const g = late ? null : measure()
      // Written only NOW, on the frame the sequence actually commits, so a
      // StrictMode remount, a background tab, or a reload during the pre-roll
      // cannot spend the one play the reader gets.
      try {
        window.sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* storage disabled; it will simply play again. Harmless. */
      }
      setGeo(g)
      setMode(g ? 'full' : 'sheet')
    })()

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  // ── EFFECT B: build and run. One clock, one property per element. ───────
  useEffect(() => {
    if (mode !== 'full' && mode !== 'sheet') return
    const html = document.documentElement
    const root = rootRef.current
    const ink = inkRef.current
    if (!root || !ink) return

    const vh = window.innerHeight
    const anims: Animation[] = []
    let done = false

    const finish = () => {
      if (done) return
      done = true
      html.setAttribute('data-press', 'done')
      html.dispatchEvent(new CustomEvent('press:done'))
      setMode('gone')
    }

    const A = (
      el: Element,
      keyframes: Keyframe[],
      opts: KeyframeAnimationOptions,
    ) => {
      const a = el.animate(keyframes, { fill: 'both', ...opts })
      a.pause()
      anims.push(a)
      return a
    }

    // will-change is an inline style but never an animated property, so no
    // cascade conflict is possible. Promoted only for the sequence; the
    // elements are removed at teardown, so releasing early would only force a
    // re-raster mid-fade.
    const promote = (el: HTMLElement | null, v: string) => {
      if (el) el.style.willChange = v
    }

    let wipe: Animation

    if (mode === 'sheet' || !geo) {
      // ── DEGRADED: SHEET-ONLY EXIT. No word is ever painted, so there is
      //    nothing to orphan. Reads as a fast, deliberate page open.
      promote(ink, 'clip-path')
      wipe = A(
        ink,
        [
          { clipPath: 'inset(0px 0px 0px 0px)' },
          { clipPath: `inset(${(vh + 48).toFixed(2)}px 0px 0px 0px)` },
        ],
        { duration: 520, delay: 60, easing: E_SQUEEGEE },
      )
    } else {
      const flight = flightRef.current!
      const paper = paperRef.current!
      const paperPlate = paperPlateRef.current!
      const printPlate = printPlateRef.current!

      // ── TYPE PARITY GATE. For the whole 240ms print stroke the reader sees
      //    half the word rendered by our span and half by the site's, so a
      //    metric disagreement shears it visibly at the edge. offsetWidth /
      //    offsetHeight are LAYOUT values, unaffected by any ancestor
      //    transform, so this is safe to read at any time. If we cannot land
      //    within 2px we do not print a duplicate at all — we fall through to
      //    the sheet-only exit, which is invisible rather than wrong.
      const dw = Math.abs(paper.offsetWidth - geo.width)
      const dh = Math.abs(paper.offsetHeight - geo.height)
      if (dw > 2 || dh > 2) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[press] type parity failed', { dw, dh })
        }
        // Deferred out of the effect body on purpose: setting state
        // synchronously here triggers a cascading render
        // (react-hooks/set-state-in-effect). This is the degraded path — the
        // clone's metrics disagree with the masthead's, so we abandon the
        // word and take the sheet-only exit, which is invisible rather than
        // wrong. One extra frame on a path that should never run is free.
        queueMicrotask(() => setMode('sheet'))
        return
      }

      promote(ink, 'clip-path')
      promote(paperPlate, 'clip-path')
      promote(printPlate, 'clip-path, opacity')
      promote(flight, 'transform')
      promote(paper, 'opacity')

      // 1 — THE LETTER ROLL. The reference's signature move and the founder's
      //     "subtle text rollover" (telhaclarke.com.au, 2026-08-24). Each
      //     letter's column travels exactly one face, staggered left to right,
      //     so the word assembles rather than appearing. Driven from the shared
      //     script clock — a CSS animation here would sort BELOW the script
      //     animations and is the exact class of bug that left the hand-off
      //     dead for two releases.
      //
      //     Both plates roll in lockstep. They are the same colour and the same
      //     position, so together they read as one wordmark whichever side of
      //     the curtain edge a given letter is on.
      const rolls = Array.from(
        root.querySelectorAll<HTMLElement>('.press-letter-roll'),
      )
      const perPlate = rolls.length / 2
      rolls.forEach((el, idx) => {
        // Index WITHIN a plate, so the two plates stagger identically instead
        // of the second plate continuing the first plate's count.
        const i = perPlate > 0 ? idx % perPlate : idx
        A(
          el,
          [
            { transform: 'translate3d(0, 50%, 0)' },
            { transform: 'translate3d(0, -50%, 0)' },
          ],
          {
            duration: ROLL_MS,
            delay: T_ROLL + i * ROLL_STAGGER,
            easing: E_ROLL,
          },
        )
      })

      // 2 — THE PLATES ARRIVE. A strike, not a fade — the masks are already
      //     empty (each column sits one face low), so this only makes the
      //     stage live before the first letter rises into it.
      A(paper, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 1,
        delay: T_ROLL,
        easing: 'linear',
      })

      // 6 — THE WIPE. One eased scalar, three consumers. Identical duration,
      //     delay, offsets and easings on all three; all three get the same
      //     startTime below. Every value is a linear function of the same
      //     edge, so the colour split is pixel-locked to the sheet at any
      //     frame rate, with no @property and no transformed ancestor.
      const e0 = 0
      const e1 = geo.top
      const e2 = geo.top + geo.height
      const e3 = vh + 48
      const stops = [
        { offset: 0, e: e0, easing: E_IN },
        { offset: OFF_PRINT, e: e1, easing: 'linear' },
        { offset: OFF_RELEASE, e: e2, easing: E_IN },
        { offset: 1, e: e3 },
      ]
      const wipeOpts: KeyframeAnimationOptions = {
        duration: D_WIPE,
        delay: T_WIPE,
      }
      const below = stops.map((s) => ({
        offset: s.offset,
        easing: s.easing,
        clipPath: `inset(${s.e.toFixed(2)}px 0px 0px 0px)`,
      }))
      // 0.5px overlap with the print plate at the higher z-index closes the
      // antialiasing seam where the two disjoint clips meet.
      const above = stops.map((s) => ({
        offset: s.offset,
        easing: s.easing,
        clipPath: `inset(0px 0px ${Math.max(0, vh - s.e - (s.e > 0 ? 0.5 : 0)).toFixed(2)}px 0px)`,
      }))

      A(ink, below as Keyframe[], wipeOpts)
      A(paperPlate, below as Keyframe[], wipeOpts)
      wipe = A(printPlate, above as Keyframe[], wipeOpts)

      // 7 — THE SWAP. Fading an opaque clone onto a pixel-identical opaque
      //     twin is a no-op at every alpha: C_out = a*C + (1-a)*C = C. This is
      //     the entire ending. There is no exit animation to design because
      //     there is nothing left that is distinguishable from the page.
      A(printPlate, [{ opacity: 1 }, { opacity: 0 }], {
        duration: T_END - T_RELEASE,
        delay: T_RELEASE,
        easing: E_SWAP,
      })
    }

    // ── ONE CLOCK ────────────────────────────────────────────────────────
    // r1 started press-set on a rAF and the hand-off on a setTimeout 950ms
    // later, in a different frame, from a different origin. Two clocks drift,
    // and drift at a beat boundary is what "choppy" means when the frame log
    // shows 1-2 long frames in the entire run. One shared startTime makes
    // every beat sub-frame accurate and immune to load.
    let started = false
    const start = () => {
      if (started || done) return
      started = true
      const origin =
        (document.timeline.currentTime as number | null) ?? performance.now()
      anims.forEach((a) => {
        try {
          a.startTime = origin
        } catch {
          a.play()
        }
      })
      // The arming sheet is released only now, once the live overlay is
      // painting an identical field. There is no frame where neither is up.
      html.setAttribute('data-press', 'go')
      wipe.finished
        .then(() => requestAnimationFrame(finish))
        .catch(() => {
          /* cancelled by abort */
        })
    }
    // Two frames: (1) the live .press has painted, (2) start + disarm.
    void raf().then(raf).then(start)

    // ── ABORT. A reader who wants to start never waits. ──────────────────
    const onAbort = () => {
      if (done) return
      // commitStyles FIRST — cancelling a fill:both animation reverts the
      // element to its base style, so the word would vanish before the fade.
      anims.forEach((a) => {
        try {
          a.commitStyles()
        } catch {
          /* effect not yet resolved */
        }
        try {
          a.cancel()
        } catch {
          /* already cancelled */
        }
      })
      root
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 200,
          easing: E_IN,
          fill: 'forwards',
        })
        .finished.then(() => requestAnimationFrame(finish))
        .catch(() => finish())
    }
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return
      anims.forEach((a) => {
        try {
          a.finish()
        } catch {
          /* noop */
        }
      })
      finish()
    }
    const events = [
      'wheel',
      'touchstart',
      'pointerdown',
      'keydown',
      'scroll',
      'resize',
    ] as const
    events.forEach((e) =>
      window.addEventListener(e, onAbort, {
        passive: true,
        once: true,
        capture: true,
      }),
    )
    document.addEventListener('visibilitychange', onHide)

    // The target moved under us: a late refit, rotation, a text-scale change.
    let ro: ResizeObserver | null = null
    const word = document.querySelector(
      '.mock-shell-header .mock-masthead-word',
    )
    if (word && geo) {
      // ResizeObserver ALWAYS delivers one callback on observe(), and a rAF
      // wrapper does not suppress it — the first version aborted the whole
      // sequence ~0ms after it started (measured: data-press hit 'go' at
      // 164ms, overlay gone at 364ms, exactly the 200ms abort fade). Skip the
      // priming callback explicitly, and abort only on a real size change.
      const baseW = geo.width
      let primed = false
      ro = new ResizeObserver((entries) => {
        if (!primed) {
          primed = true
          return
        }
        const w = entries[0]?.target.getBoundingClientRect().width ?? baseW
        if (Math.abs(w - baseW) > 2) onAbort()
      })
      ro.observe(word)
    }

    const failsafe = window.setTimeout(() => {
      anims.forEach((a) => {
        try {
          a.finish()
        } catch {
          /* noop */
        }
      })
      finish()
    }, HARD_STOP_MS)

    return () => {
      window.clearTimeout(failsafe)
      events.forEach((e) => window.removeEventListener(e, onAbort, true))
      document.removeEventListener('visibilitychange', onHide)
      ro?.disconnect()
      anims.forEach((a) => {
        try {
          a.cancel()
        } catch {
          /* noop */
        }
      })
      html.setAttribute('data-press', 'done')
    }
  }, [mode, geo])

  // 'boot' renders NOTHING. The component mounts on every page and on every
  // repeat visit; only Effect A knows whether this load is entitled to an
  // intro, and it cannot run before first paint. Rendering the sheet during
  // boot put a full-bleed cobalt overlay on /today, on second visits, and on
  // reduced-motion loads for one frame each — caught by the safety gates.
  // The arming sheet (html[data-press='armed']::before) covers the real
  // first-paint case; this element only ever appears once the sequence is
  // committed, while that sheet is still up, so there is no uncovered frame.
  if (mode === 'gone' || mode === 'boot') return null

  const vars = geo
    ? ({
        '--press-l': `${geo.left}px`,
        '--press-t': `${geo.top}px`,
        '--press-w': `${geo.width}px`,
        '--press-h': `${geo.height}px`,
        '--press-word': geo.land,
      } as React.CSSProperties)
    : undefined

  // The cloned type contract, applied as inline style. These are FONT
  // properties only — never transform, opacity or clip-path.
  const typeStyle = geo
    ? (geo.type as unknown as React.CSSProperties)
    : undefined

  return (
    <div className="press" ref={rootRef} aria-hidden="true" style={vars}>
      <span className="press-ink" ref={inkRef}>
        <span className="press-grain" />
      </span>

      {mode === 'full' && geo && (
        <>
          {/* Everything BELOW the squeegee edge: the knockout, on the ink. */}
          <span className="press-plate press-plate--paper" ref={paperPlateRef}>
            <span className="press-flight" ref={flightRef}>
              <span className="press-set">
                <span
                  className="press-word press-word--paper"
                  ref={paperRef}
                  style={typeStyle}
                >
                  <RolledWord text={geo.text} />
                </span>
              </span>
            </span>
          </span>

          {/* Everything ABOVE the edge: the printed word, congruent with the
              real masthead underneath it. Deliberately carries NO flight and
              NO set — it is clipped to zero area until t=1280, at which point
              the flight has already landed at identity, so a static clone at
              the measured rect is exactly right. Do NOT "optimise" it away:
              it is what hides sub-pixel and antialiasing disagreement during
              the print stroke and lets the swap dissolve it. */}
          <span className="press-plate press-plate--print" ref={printPlateRef}>
            <span className="press-land-box">
              <span className="press-word press-word--land" style={typeStyle}>
                <RolledWord text={geo.text} />
              </span>
            </span>
          </span>
        </>
      )}
    </div>
  )
}
