'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * InstallPrompt — a quiet PWA install invitation, offered only after a good
 * session (F-072; MOBBIN-POLISH-AUDIT-2026-07-10 Part 3 #4 / Part 4 #16).
 *
 * Anchor: Finch's post-value notification ask. The invitation comes AFTER the
 * reader received something — never on first paint, never a nag.
 *
 * The invitation appears only when ALL of these hold:
 *  (a) a stashed `beforeinstallprompt` event exists (Chrome/Edge/Android), or
 *      the browser is iOS Safari (which has no install prompt API — we show
 *      Share → Add to Home Screen instructions instead);
 *  (b) the reader completed a VALUE MOMENT this session (see below);
 *  (c) a previous dismissal is respected — "Not now" is honored for 60 days
 *      before the invitation may appear again;
 *  (d) the app is not already installed (display-mode: standalone, iOS
 *      `navigator.standalone`, a fired `appinstalled`, or the persisted
 *      installed flag from an earlier `appinstalled`).
 *
 * VALUE-MOMENT SIGNAL (decision, 2026-07-10): the codebase already emits real
 * completion signals, so no dwell-time proxy is needed:
 *  1. `progressUpdated` window CustomEvent — dispatched by
 *     markDevotionalComplete() (src/lib/progress.ts) when a devotional is
 *     marked complete in the wake-up reader. Strongest signal: explicit,
 *     user-initiated, fires in real time.
 *  2. `euangelion:just-finished-reading` localStorage key flipping to '1'
 *     DURING this session — the purpose-built post-read signal set by both
 *     the wake-up reader and the Daily Bread plan reader on "Mark complete"
 *     (already consumed by PushOptIn). Only a fresh transition counts: a
 *     stale '1' left over from a previous visit is snapshotted at mount and
 *     ignored, so the card can never appear on first paint.
 *  3. `soul-audit-selection-v2` sessionStorage key — written when a Soul
 *     Audit selection is locked and a plan instantiated (results page).
 *     sessionStorage is per-tab, so this is inherently "this session."
 *  4. `soulAuditPlanChanged` window CustomEvent — plan activation broadcast
 *     (src/hooks/useActivePlan.ts), listened to for completeness.
 * A scroll-depth (≥60%) signal does not exist and adding one would require
 * editing reader files owned by other workstreams, so it is intentionally
 * not part of this trigger.
 *
 * Surface: a non-blocking bottom card (role="dialog", aria-modal="false").
 * The page stays fully usable; focus is never stolen. On mobile it sits above
 * the fixed tab bar (tab bar z-index --z-fixed 200; this uses --z-overlay
 * 300) and is safe-area aware. No entry animation — quiet by default, and
 * trivially reduced-motion safe. Touch targets are ≥ 44px.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_AT_KEY = 'euangelion:install-prompt-dismissed-at'
const INSTALLED_KEY = 'euangelion:pwa-installed'
const VALUE_MOMENT_SESSION_KEY = 'euangelion:install-value-moment'
const FINISHED_READING_KEY = 'euangelion:just-finished-reading'
const AUDIT_SELECTION_SESSION_KEY = 'soul-audit-selection-v2'

/** A "Not now" is honored for 60 days before the invitation may reappear. */
const DISMISS_RESPECT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000

/**
 * The Daily Bread reader sets its completion signal without dispatching a
 * window event, and the reader may not navigate afterwards — so poll the
 * stored signals at a low frequency in addition to event/route/focus checks.
 */
const SIGNAL_POLL_MS = 12_000

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  ) {
    return true
  }
  // iOS Safari's non-standard flag when launched from the home screen.
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  )
}

/**
 * iOS Safari specifically — the one browser family where instructions are the
 * only install path. Other iOS browsers (CriOS/FxiOS/EdgiOS/OPiOS) hide
 * Add to Home Screen behind different menus, so we stay silent there rather
 * than show instructions that don't match the user's browser.
 */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIosDevice =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as macOS but is touch-capable.
    (ua.includes('Macintosh') &&
      typeof document !== 'undefined' &&
      'ontouchend' in document)
  if (!isIosDevice) return false
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)) return false
  return /Safari/.test(ua)
}

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
    // Storage unavailable (private mode) — the invitation simply won't
    // persist its state; it still respects the in-session dismissal.
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
    // Same as writeLocal: in-memory state still carries the session.
  }
}

function isDismissedWithinWindow(): boolean {
  const raw = readLocal(DISMISSED_AT_KEY)
  if (raw === null) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_RESPECT_WINDOW_MS
}

export default function InstallPrompt({
  // How long the invitation holds back after the value moment so the
  // completion beat (SA-025) lands first. Tests pass 0.
  beatWindowMs = 10_000,
}: {
  beatWindowMs?: number
} = {}) {
  const pathname = usePathname()

  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [iosSafari, setIosSafari] = useState(false)
  const [hasValueMoment, setHasValueMoment] = useState(false)
  // SA-025 sequencing: the completion beat (CompletionBeat) fires on the
  // same completion signals and must land first — the invitation holds back
  // ~10s from the value moment so the reverent beat is never crowded by
  // chrome. Render-level gate so every trigger path (event, poll, focus)
  // respects it.
  const [beatWindowPassed, setBeatWindowPassed] = useState(false)
  const [hiddenForSession, setHiddenForSession] = useState(false)
  const [installing, setInstalling] = useState(false)

  // True only once mount-time eligibility passed (not installed, not inside
  // a respected dismissal window). Signal checks no-op until then.
  const activeRef = useRef(false)
  // Whether the finished-reading key was ALREADY '1' when we mounted — a
  // stale signal from a previous visit that must not count as this session's
  // value moment.
  const finishedAtMountRef = useRef(false)

  const recordValueMoment = useCallback(() => {
    writeSession(VALUE_MOMENT_SESSION_KEY, '1')
    setHasValueMoment(true)
  }, [])

  const checkStoredSignals = useCallback(() => {
    if (!activeRef.current) return
    if (readSession(VALUE_MOMENT_SESSION_KEY) === '1') {
      setHasValueMoment(true)
      return
    }
    // Soul Audit selection locked this tab → a plan was generated and chosen.
    if (readSession(AUDIT_SELECTION_SESSION_KEY) !== null) {
      recordValueMoment()
      return
    }
    // Post-read signal set by the wake-up reader and Daily Bread reader.
    if (readLocal(FINISHED_READING_KEY) === '1') {
      if (!finishedAtMountRef.current) recordValueMoment()
    } else {
      // The key was cleared (e.g. by PushOptIn) — any later '1' is fresh.
      finishedAtMountRef.current = false
    }
  }, [recordValueMoment])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Already installed, running installed, or inside a respected dismissal
    // window → stay silent for this whole mount. No listeners, no polling.
    if (
      isStandaloneDisplay() ||
      readLocal(INSTALLED_KEY) === '1' ||
      isDismissedWithinWindow()
    ) {
      return
    }

    activeRef.current = true
    finishedAtMountRef.current = readLocal(FINISHED_READING_KEY) === '1'
    // Client-only platform detection + persisted in-session value moment
    // resolve after mount (same escape-hatch pattern as CookieConsentBanner)
    // to avoid a server/client tree mismatch.
    setIosSafari(isIosSafari())
    checkStoredSignals()

    const onBeforeInstallPrompt = (event: Event) => {
      // Stash the event so WE decide when to invite — after a value moment,
      // never on the browser's schedule.
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      writeLocal(INSTALLED_KEY, '1')
      setInstallEvent(null)
      setHiddenForSession(true)
    }
    const onValueMomentEvent = () => {
      if (activeRef.current) recordValueMoment()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('progressUpdated', onValueMomentEvent)
    window.addEventListener('soulAuditPlanChanged', onValueMomentEvent)
    window.addEventListener('focus', checkStoredSignals)
    document.addEventListener('visibilitychange', checkStoredSignals)
    const poll = window.setInterval(checkStoredSignals, SIGNAL_POLL_MS)

    return () => {
      activeRef.current = false
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('progressUpdated', onValueMomentEvent)
      window.removeEventListener('soulAuditPlanChanged', onValueMomentEvent)
      window.removeEventListener('focus', checkStoredSignals)
      document.removeEventListener('visibilitychange', checkStoredSignals)
      window.clearInterval(poll)
    }
  }, [checkStoredSignals, recordValueMoment])

  // Client-side navigations are a natural moment to re-read stored signals
  // (the Daily Bread completion writes storage without any window event).
  useEffect(() => {
    checkStoredSignals()
  }, [pathname, checkStoredSignals])

  const handleDismiss = useCallback(() => {
    writeLocal(DISMISSED_AT_KEY, String(Date.now()))
    setHiddenForSession(true)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installEvent || installing) return
    setInstalling(true)
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        writeLocal(INSTALLED_KEY, '1')
        setHiddenForSession(true)
      } else {
        // Declining the native sheet is a "not now" — respect it the same way.
        handleDismiss()
      }
    } catch {
      // The stashed event was already consumed or the prompt failed. It can't
      // be reused; go quiet for this session without recording a dismissal.
      setHiddenForSession(true)
    } finally {
      // A beforeinstallprompt event is single-use either way.
      setInstallEvent(null)
      setInstalling(false)
    }
  }, [installEvent, installing, handleDismiss])

  useEffect(() => {
    if (!hasValueMoment || beatWindowPassed) return
    if (beatWindowMs <= 0) {
      setBeatWindowPassed(true)
      return
    }
    const timer = window.setTimeout(
      () => setBeatWindowPassed(true),
      beatWindowMs,
    )
    return () => window.clearTimeout(timer)
  }, [hasValueMoment, beatWindowPassed, beatWindowMs])

  const visible =
    !hiddenForSession &&
    hasValueMoment &&
    beatWindowPassed &&
    (installEvent !== null || iosSafari)

  if (!visible) return null

  const serif = { fontFamily: 'var(--font-family-serif, Georgia, serif)' }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="install-prompt-label"
      aria-describedby="install-prompt-line"
      aria-live="polite"
      onKeyDown={(event) => {
        if (event.key === 'Escape') handleDismiss()
      }}
      className="fixed left-1/2 z-[var(--z-overlay,300)] w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 border px-5 py-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4.3rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-strong, var(--color-border))',
        color: 'var(--color-text-primary)',
      }}
    >
      <p
        id="install-prompt-label"
        tabIndex={-1}
        className="text-label vw-small text-gold"
      >
        Keep it close
      </p>
      <p
        id="install-prompt-line"
        className="mt-2"
        style={{ ...serif, fontSize: '1.05rem', lineHeight: 1.45 }}
      >
        Add Euangelion to your home screen — one quiet word each morning.
      </p>
      {installEvent === null && iosSafari ? (
        <p className="vw-small text-secondary mt-2">
          In Safari: Share → Add to Home Screen.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {installEvent !== null ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installing}
            className="text-label vw-small inline-flex min-h-[44px] items-center justify-center rounded-[4px] px-5 py-2 transition-colors duration-200 disabled:opacity-60 motion-reduce:transition-none"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-paper, #efe5d8)',
            }}
          >
            {installing ? 'One moment…' : 'Add to home screen'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          disabled={installing}
          className="text-label vw-small inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] disabled:opacity-60 motion-reduce:transition-none"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
