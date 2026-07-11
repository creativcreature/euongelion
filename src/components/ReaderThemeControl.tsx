'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  READING_THEME_BASE,
  useSettingsStore,
  type ReadingTheme,
} from '@/stores/settingsStore'

/**
 * F-067 — In-reader "Aa" sheet with curated NAMED reading themes.
 *
 * Model: Apple Books' named presets (Original / Quiet / Paper / Bold …) —
 * curated names, not raw sliders. Four themes:
 *
 *   INK        — the current dark reading experience (deep cobalt + cream)
 *   PARCHMENT  — the current light experience (cream paper + navy ink)
 *   VELLUM     — warm sepia: deeper cream, softened contrast, warm brown ink
 *   NIGHT      — true-black OLED dark with dimmed cream + dimmed gold accent
 *
 * Ink/Parchment are pure aliases of the site dark/light themes (html.dark +
 * localStorage 'theme'), so the rest of the site stays consistent. Vellum and
 * Night sit on a light/dark base respectively and ADD a reader-scoped
 * `data-reading-theme` attribute on the closest `.mock-home` root, which the
 * appended globals.css block maps to scoped custom-property overrides.
 *
 * Persistence: `readingTheme` + `textScale` in the existing settings store
 * (zustand persist → localStorage 'euangelion-settings'). An inline SSR
 * bootstrap script re-applies the reader-scoped attribute BEFORE hydration on
 * full page loads (the site-base half is already flash-free via the layout's
 * anti-FOUC script); on client-side navigations the effect applies it at
 * mount, before first paint of the new route's content.
 */

interface ThemeOption {
  id: ReadingTheme
  name: string
  hint: string
  /** Live swatch colors — fixed per theme so every tile previews itself. */
  paper: string
  ink: string
  accent: string
  border: string
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'ink',
    name: 'Ink',
    hint: 'Deep cobalt, cream type',
    paper: '#171b69',
    ink: '#efe5d8',
    accent: '#c8a56a',
    border: 'rgba(239, 229, 216, 0.72)',
  },
  {
    id: 'parchment',
    name: 'Parchment',
    hint: 'Cream paper, navy ink',
    paper: '#f5eee3',
    ink: '#11182a',
    accent: '#1f2a8d',
    border: '#2e3880',
  },
  {
    id: 'vellum',
    name: 'Vellum',
    hint: 'Warm sepia, softened',
    paper: '#ecdfc6',
    ink: '#3b2d1c',
    accent: '#6a4a1c',
    border: '#7a5c33',
  },
  {
    id: 'night',
    name: 'Night',
    hint: 'True black, dimmed',
    paper: '#000000',
    ink: '#d8d0c0',
    accent: '#ab8d5c',
    border: 'rgba(216, 208, 192, 0.46)',
  },
] as const

type TextScale = 'default' | 'large' | 'xlarge'
const TEXT_SCALE_ORDER: readonly TextScale[] = ['default', 'large', 'xlarge']
const TEXT_SCALE_LABELS: Record<TextScale, string> = {
  default: 'Standard',
  large: 'Large',
  xlarge: 'Extra Large',
}

// Pre-hydration bootstrap: on a full (SSR) page load, re-apply the persisted
// reader-scoped theme attribute synchronously while the document is still
// parsing, so Vellum/Night readers never see an Ink/Parchment flash. Runs
// only as a parser-inserted script (document.currentScript is null for
// dynamically inserted scripts, i.e. client-side navigations — there the
// mount effect applies the attribute instead, before the route paints).
const READER_THEME_BOOTSTRAP =
  "(function(){try{var s=document.currentScript;if(!s)return;var raw=localStorage.getItem('euangelion-settings');if(!raw)return;var t=(JSON.parse(raw)||{}).state;t=t&&t.readingTheme;if(t!=='vellum'&&t!=='night')return;var m=s.closest('.mock-home');if(m){m.setAttribute('data-reading-theme',t);}}catch(e){}})();"

const SITE_THEME_EVENT = 'euangelion:site-theme'

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  )
}

export default function ReaderThemeControl() {
  const [open, setOpen] = useState(false)
  const [baseIsDark, setBaseIsDark] = useState(false)
  const readingTheme = useSettingsStore((s) => s.readingTheme)
  const setReadingTheme = useSettingsStore((s) => s.setReadingTheme)
  const textScale = useSettingsStore((s) => s.textScale)
  const setTextScale = useSettingsStore((s) => s.setTextScale)

  const scopeRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const sizeLabelId = useId()

  // Apply / clear the reader-scoped attribute on the reader root. Ink and
  // Parchment are pure site-theme aliases — no attribute, so the reader
  // renders exactly the existing dark/light experience.
  useEffect(() => {
    const scope = scopeRef.current?.closest('.mock-home')
    if (!scope) return
    if (readingTheme === 'vellum' || readingTheme === 'night') {
      scope.setAttribute('data-reading-theme', readingTheme)
    } else {
      scope.removeAttribute('data-reading-theme')
    }
    return () => {
      scope.removeAttribute('data-reading-theme')
    }
  }, [readingTheme])

  // Track the site base theme while the sheet is open so the "no explicit
  // choice yet" state highlights Ink (dark base) or Parchment (light base).
  useEffect(() => {
    if (!open) return
    const sync = () =>
      setBaseIsDark(document.documentElement.classList.contains('dark'))
    sync()
    window.addEventListener(SITE_THEME_EVENT, sync)
    return () => window.removeEventListener(SITE_THEME_EVENT, sync)
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  // Keyboard: Escape closes (focus returns to trigger); Tab is trapped
  // inside the dialog while open.
  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    const selected = dialog?.querySelector<HTMLElement>('[aria-pressed="true"]')
    ;(selected ?? dialog)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
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
  }, [open, close])

  const selectedTheme: ReadingTheme =
    readingTheme ?? (baseIsDark ? 'ink' : 'parchment')

  function selectTheme(theme: ReadingTheme) {
    setReadingTheme(theme)
    const base = READING_THEME_BASE[theme]
    const isDark = base === 'dark'
    try {
      localStorage.setItem('theme', base)
    } catch {
      // Storage unavailable (private mode) — theme still applies this session.
    }
    document.documentElement.classList.toggle('dark', isDark)
    setBaseIsDark(isDark)
    // Keep the shell header's sun/moon toggle state in sync.
    window.dispatchEvent(
      new CustomEvent(SITE_THEME_EVENT, { detail: { theme: base } }),
    )
  }

  const scaleIndex = TEXT_SCALE_ORDER.indexOf(textScale)
  function stepScale(delta: number) {
    const next = TEXT_SCALE_ORDER[scaleIndex + delta]
    if (next) setTextScale(next)
  }

  return (
    <div ref={scopeRef} className="reader-theme-control">
      <script dangerouslySetInnerHTML={{ __html: READER_THEME_BOOTSTRAP }} />
      <button
        ref={triggerRef}
        type="button"
        className="reader-theme-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Reading theme and text size"
        title="Reading theme and text size"
        onClick={() => {
          setBaseIsDark(document.documentElement.classList.contains('dark'))
          setOpen((v) => !v)
        }}
      >
        <span aria-hidden="true" className="reader-theme-trigger-glyph">
          Aa
        </span>
      </button>

      {open && (
        <div className="reader-theme-overlay">
          <div
            className="reader-theme-backdrop"
            aria-hidden="true"
            onClick={close}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reading theme and text size"
            className="reader-theme-sheet"
            tabIndex={-1}
          >
            <p className="text-label vw-small reader-theme-sheet-title text-gold">
              READING THEME
            </p>
            <div
              className="reader-theme-grid"
              role="group"
              aria-label="Reading theme"
            >
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="reader-theme-option"
                  aria-pressed={selectedTheme === option.id}
                  onClick={() => selectTheme(option.id)}
                >
                  <span
                    className="reader-theme-swatch"
                    aria-hidden="true"
                    style={{
                      background: option.paper,
                      color: option.ink,
                      borderColor: option.border,
                    }}
                  >
                    Aa
                    <span
                      className="reader-theme-swatch-accent"
                      style={{ background: option.accent }}
                    />
                  </span>
                  <span className="reader-theme-option-name">
                    {option.name}
                  </span>
                  <span className="reader-theme-option-hint vw-small">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>

            <div className="reader-theme-size-row">
              <p
                id={sizeLabelId}
                className="text-label vw-small reader-theme-size-label text-gold"
              >
                TEXT SIZE
              </p>
              <div
                className="reader-theme-size-stepper"
                role="group"
                aria-labelledby={sizeLabelId}
              >
                <button
                  type="button"
                  className="reader-theme-size-step"
                  aria-label="Decrease text size"
                  disabled={scaleIndex <= 0}
                  onClick={() => stepScale(-1)}
                >
                  A&minus;
                </button>
                <span className="reader-theme-size-value" aria-live="polite">
                  {TEXT_SCALE_LABELS[textScale]}
                </span>
                <button
                  type="button"
                  className="reader-theme-size-step"
                  aria-label="Increase text size"
                  disabled={scaleIndex >= TEXT_SCALE_ORDER.length - 1}
                  onClick={() => stepScale(1)}
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
