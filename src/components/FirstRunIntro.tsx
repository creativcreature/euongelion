'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * FirstRunIntro — the anonymous first-run introduction (F-065;
 * MOBBIN-POLISH-AUDIT-2026-07-10 Part 3 #1/#3).
 *
 * Anchors: Wanderlog (bookend framing), Mindvalley (gentle fork),
 * Finch (non-coercive opt-in tone). Three beats, all optional:
 *
 *   1. WELCOME — what this is, in the approved homepage voice.
 *   2. READING COMFORT — one personalization tap: theme (dark/light) +
 *      text size, wired to the REAL stores (useUIStore().setTheme →
 *      canonical localStorage 'theme' + html.dark; settingsStore
 *      textScale → the same persisted value Settings and the reader
 *      Aa sheet use). Changes apply live.
 *   3. WHERE TO BEGIN — a gentle fork: Soul Audit (primary), browse
 *      the library, or "Maybe later." One quiet account line; never
 *      an account wall.
 *
 * WHO SEES IT (contract):
 *  - Only on the marketing homepage `/` (mounted there and nowhere
 *    else) — a deep-linked devotional is never blocked.
 *  - Only ANONYMOUS visitors — auth state is probed via the existing
 *    /api/auth/session route; an authenticated user is marked done and
 *    never sees it.
 *  - Only on the FIRST visit. `euangelion:first-run-intro` in
 *    localStorage records 'offered' when shown and 'done' on any
 *    dismissal/completion. A visitor with prior-use signals
 *    (persisted settings, theme choice, install-prompt history) from
 *    before this feature shipped is treated as returning and never
 *    sees it.
 *  - Reloading DURING the same browsing session re-offers (the
 *    sessionStorage marker scopes 'offered' to this session); coming
 *    back in a later session after ignoring it counts as a quiet
 *    dismissal — returning visitors are never nagged.
 *
 * Surface: bottom sheet on mobile, centered card on desktop
 * (`.first-run-*` styles appended to globals.css). z-index
 * var(--z-overlay, 300) — above the mobile tab bar (--z-fixed 200).
 * Safe-area aware, reduced-motion safe, focus-trapped; Escape and the
 * backdrop dismiss. All targets ≥ 44px.
 */

const FIRST_RUN_KEY = 'euangelion:first-run-intro'
const FIRST_RUN_SESSION_KEY = 'euangelion:first-run-intro-session'

/**
 * localStorage keys that prove this browser used Euangelion before this
 * feature existed. Any hit ⇒ returning visitor ⇒ never show the intro.
 */
const PRIOR_USE_SIGNALS = [
  'theme',
  'euangelion-settings',
  'euangelion:pwa-installed',
  'euangelion:install-prompt-dismissed-at',
  'euangelion:just-finished-reading',
] as const

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode): in-memory state still governs
    // this pageview; the intro simply may offer again next visit.
  }
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Same as writeLocal.
  }
}

function hasPriorUseSignal(): boolean {
  return PRIOR_USE_SIGNALS.some((key) => readLocal(key) !== null)
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  )
}

type Beat = 0 | 1 | 2

const BEAT_COUNT = 3

type TextScale = 'default' | 'large' | 'xlarge'
const TEXT_SCALE_OPTIONS: ReadonlyArray<{ value: TextScale; label: string }> = [
  { value: 'default', label: 'Standard' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra Large' },
]

export default function FirstRunIntro() {
  const [open, setOpen] = useState(false)
  const [beat, setBeat] = useState<Beat>(0)
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark')

  const setTheme = useUIStore((s) => s.setTheme)
  const textScale = useSettingsStore((s) => s.textScale)
  const setTextScale = useSettingsStore((s) => s.setTextScale)

  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Eligibility — resolved once per mount, after the auth probe.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = readLocal(FIRST_RUN_KEY)
    if (stored === 'done') return
    if (stored === 'offered' && readSession(FIRST_RUN_SESSION_KEY) !== '1') {
      // Offered in a previous session and quietly ignored — that reader is
      // a returning visitor now. Never nag.
      writeLocal(FIRST_RUN_KEY, 'done')
      return
    }
    if (stored === null && hasPriorUseSignal()) {
      // Used Euangelion before this feature shipped — returning visitor.
      writeLocal(FIRST_RUN_KEY, 'done')
      return
    }

    let cancelled = false

    async function resolveEligibility() {
      let authenticated: boolean
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        })
        const payload = (await response.json()) as {
          authenticated?: boolean
        }
        authenticated = payload.authenticated === true
      } catch {
        // Auth state unknown (network failure) — do not offer this
        // pageview and do not burn the first-visit flag; the intro may
        // offer next time, when the probe can actually answer.
        return
      }
      if (cancelled) return

      if (authenticated) {
        // Authed users have the real /onboarding flow; never show this.
        writeLocal(FIRST_RUN_KEY, 'done')
        return
      }

      writeLocal(FIRST_RUN_KEY, 'offered')
      writeSession(FIRST_RUN_SESSION_KEY, '1')
      setEffectiveTheme(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      )
      setOpen(true)
    }

    void resolveEligibility()
    return () => {
      cancelled = true
    }
  }, [])

  const markDone = useCallback(() => {
    writeLocal(FIRST_RUN_KEY, 'done')
  }, [])

  const dismiss = useCallback(() => {
    markDone()
    setOpen(false)
  }, [markDone])

  // Scroll lock while the sheet is open; restore on close/unmount.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Focus management: move focus into the dialog on open; trap Tab;
  // Escape dismisses (same pattern as ReaderThemeControl).
  useEffect(() => {
    if (!open) return

    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = getFocusable(dialogRef.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (
        event.shiftKey &&
        (active === first || active === dialogRef.current)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, dismiss])

  if (!open) return null

  function chooseTheme(theme: 'dark' | 'light') {
    setTheme(theme)
    setEffectiveTheme(theme)
  }

  return (
    <div className="first-run-layer">
      <div
        className="first-run-backdrop"
        aria-hidden="true"
        onClick={dismiss}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        className="first-run-card"
        tabIndex={-1}
      >
        <div className="first-run-topline">
          <p className="text-label vw-small text-gold" aria-live="polite">
            {beat + 1} OF {BEAT_COUNT}
          </p>
          <button
            type="button"
            className="first-run-quiet text-label vw-small"
            onClick={dismiss}
          >
            Skip
          </button>
        </div>

        {beat === 0 && (
          <div className="first-run-body">
            <p className="text-label vw-small text-gold">WELCOME</p>
            <h2
              id="first-run-title"
              className="text-serif-italic vw-heading-md"
            >
              A daily newspaper of the Gospel.
            </h2>
            <p className="vw-body text-secondary">
              Five to seven minutes a day. Ancient wisdom, modern design, no
              engagement bait. Whatever you&rsquo;re carrying, there&rsquo;s a
              passage already waiting for it.
            </p>
            <p className="text-label vw-small text-muted">
              FREE · NO ACCOUNT · START ANY DAY
            </p>
          </div>
        )}

        {beat === 1 && (
          <div className="first-run-body">
            <p className="text-label vw-small text-gold">READING COMFORT</p>
            <h2
              id="first-run-title"
              className="text-serif-italic vw-heading-md"
            >
              Make the page yours.
            </h2>

            <div className="first-run-group">
              <p className="text-label vw-small text-muted">THEME</p>
              <div
                className="first-run-options"
                role="group"
                aria-label="Theme"
              >
                <button
                  type="button"
                  className="first-run-option text-label vw-small"
                  aria-pressed={effectiveTheme === 'dark'}
                  onClick={() => chooseTheme('dark')}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className="first-run-option text-label vw-small"
                  aria-pressed={effectiveTheme === 'light'}
                  onClick={() => chooseTheme('light')}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="first-run-group">
              <p className="text-label vw-small text-muted">TEXT SIZE</p>
              <div
                className="first-run-options"
                role="group"
                aria-label="Text size"
              >
                {TEXT_SCALE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="first-run-option text-label vw-small"
                    aria-pressed={textScale === option.value}
                    onClick={() => setTextScale(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="vw-small text-muted">
              Changes apply as you tap. Everything stays adjustable in Settings.
            </p>
          </div>
        )}

        {beat === 2 && (
          <div className="first-run-body">
            <p className="text-label vw-small text-gold">WHERE TO BEGIN</p>
            <h2
              id="first-run-title"
              className="text-serif-italic vw-heading-md"
            >
              Start where you are.
            </h2>
            <div className="first-run-fork">
              <Link
                href="/soul-audit"
                className="first-run-primary text-label vw-small"
                onClick={markDone}
              >
                START WITH THE SOUL AUDIT
              </Link>
              <p className="vw-small text-secondary">
                One honest sentence becomes a personalized seven-day plan.
              </p>
              <Link
                href="/series"
                className="first-run-option first-run-fork-secondary text-label vw-small"
                onClick={markDone}
              >
                BROWSE THE LIBRARY
              </Link>
            </div>
            <p className="vw-small text-muted">
              Reading on more than one device?{' '}
              <Link
                href="/auth/sign-in"
                className="link-highlight"
                onClick={markDone}
              >
                Sign in
              </Link>{' '}
              anytime to sync your saved devotionals. No account needed to read.
            </p>
          </div>
        )}

        <div className="first-run-nav">
          {beat > 0 ? (
            <button
              type="button"
              className="first-run-option text-label vw-small"
              onClick={() => setBeat((b) => Math.max(0, b - 1) as Beat)}
            >
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          {beat < BEAT_COUNT - 1 ? (
            <button
              type="button"
              className="first-run-primary text-label vw-small"
              onClick={() => setBeat((b) => Math.min(2, b + 1) as Beat)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="first-run-quiet text-label vw-small"
              onClick={dismiss}
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
