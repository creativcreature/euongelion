import { create } from 'zustand'
import { useSettingsStore } from '@/stores/settingsStore'

type Theme = 'dark' | 'light' | 'system'

/**
 * SINGLE SOURCE OF TRUTH for the site theme: the localStorage key `theme`
 * ('dark' | 'light'; absent = follow system). It is what the pre-paint
 * anti-FOUC script in layout.tsx reads, what the shell-header toggle and
 * the reader Aa sheet write, and — since 2026-07-10 — what this store
 * reads and writes too.
 *
 * HISTORY (founder-reported bug, 2026-07-10): this store used to persist
 * its OWN theme under `euangelion-ui` (default 'dark') and re-apply it on
 * rehydration. Any page that mounted a consumer (/settings, /onboarding)
 * would slam the document back to the stale store value, overriding the
 * header/localStorage state — the site "jumped between light and dark on
 * random pages." The store no longer persists or re-applies anything on
 * load; it only reflects and mutates the canonical key.
 */
const THEME_STORAGE_KEY = 'theme'
const THEME_CHANGE_EVENT = 'euangelion:site-theme'

interface UIState {
  theme: Theme
  mobileMenuOpen: boolean

  setTheme: (theme: Theme) => void
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // storage unavailable — fall through to system
  }
  return 'system'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return

  const dark =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)

  try {
    if (theme === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    // storage unavailable — the class toggle above still applied
  }

  // Keep every other theme consumer (shell header icon, reader sheet) in
  // sync — they listen for this event.
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme: dark ? 'dark' : 'light' },
    }),
  )
}

export const useUIStore = create<UIState>()((set) => ({
  theme: readStoredTheme(),
  mobileMenuOpen: false,

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
    // F-067: an explicit site-theme change (Settings/onboarding)
    // dissolves any reader-scoped reading-theme override (Vellum/Night),
    // mirroring the shell header toggle — the reader falls back to
    // following the site theme (Ink on dark, Parchment on light).
    useSettingsStore.getState().setReadingTheme(null)
  },

  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}))
