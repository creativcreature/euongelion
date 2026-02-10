import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'system'

interface UIState {
  theme: Theme
  mobileMenuOpen: boolean

  setTheme: (theme: Theme) => void
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
}

/**
 * Apply theme to the document. Called on change and on hydration.
 */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return

  if (theme === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    document.documentElement.classList.toggle('dark', prefersDark)
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      mobileMenuOpen: false,

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleMobileMenu: () =>
        set((s) => {
          const next = !s.mobileMenuOpen
          if (typeof document !== 'undefined') {
            document.body.style.overflow = next ? 'hidden' : ''
          }
          return { mobileMenuOpen: next }
        }),

      closeMobileMenu: () => {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = ''
        }
        set({ mobileMenuOpen: false })
      },
    }),
    {
      name: 'euangelion-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
