import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clearRememberedProviderKeys,
  loadRememberedProviderKeys,
  saveRememberedProviderKeys,
} from '@/lib/brain/key-storage'
import {
  DEFAULT_BIBLE_TRANSLATION,
  isBibleTranslationCode,
  type BibleTranslationCode,
} from '@/lib/bible'
import {
  isReminderWindow,
  type ReminderWindow,
} from '@/lib/push/reminder-window'

type SabbathDay = 'saturday' | 'sunday'
type BrainMode = 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'
type DevotionalDepthPreference =
  | 'short_5_7'
  | 'medium_20_30'
  | 'long_45_60'
  | 'variable'
type KeyStorageMode = 'session_only' | 'remember_encrypted'

type BibleTranslation = BibleTranslationCode
type TextScale = 'default' | 'large' | 'xlarge'
/** Backlog #15 — leading and measure, as named steps rather than raw sliders. */
type ReadingLeading = 'tight' | 'default' | 'loose'
type ReadingMeasure = 'narrow' | 'default' | 'wide'

// F-067 — in-reader "Aa" sheet: curated named reading themes.
// 'ink' / 'parchment' are aliases of the site dark / light themes;
// 'vellum' / 'night' additionally apply a reader-scoped variable
// override (data-reading-theme on the reader root). `null` means the
// reader simply follows the site theme (no explicit choice yet).
export type ReadingTheme = 'ink' | 'parchment' | 'vellum' | 'night'

export const READING_THEMES: readonly ReadingTheme[] = [
  'ink',
  'parchment',
  'vellum',
  'night',
] as const

// Which site base theme (html.dark) each named reading theme sits on,
// so the rest of the site stays consistent with the reader.
export const READING_THEME_BASE: Record<ReadingTheme, 'dark' | 'light'> = {
  ink: 'dark',
  parchment: 'light',
  vellum: 'light',
  night: 'dark',
}

export function isReadingTheme(value: unknown): value is ReadingTheme {
  return (
    typeof value === 'string' && READING_THEMES.includes(value as ReadingTheme)
  )
}

interface SettingsState {
  bibleTranslation: BibleTranslation
  sabbathDay: SabbathDay
  defaultBrainMode: BrainMode
  openWebDefaultEnabled: boolean
  devotionalDepthPreference: DevotionalDepthPreference
  chatSidebarOpen: boolean
  keyStorageMode: KeyStorageMode
  anthropicApiKey: string
  openaiApiKey: string
  googleApiKey: string
  minimaxApiKey: string
  nvidiaKimiApiKey: string
  dayLockingEnabled: boolean
  textScale: TextScale
  readingLeading: ReadingLeading
  readingMeasure: ReadingMeasure
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean
  readingTheme: ReadingTheme | null
  // F-070 — the reader's chosen "one quiet word" delivery window. `null`
  // means no explicit choice yet. This is the device-local copy; when a push
  // subscription exists it is mirrored server-side on push_subscriptions via
  // /api/push/preferences (the server copy is what the sender reads).
  reminderWindow: ReminderWindow | null

  setBibleTranslation: (t: BibleTranslation) => void
  setSabbathDay: (d: SabbathDay) => void
  setDefaultBrainMode: (mode: BrainMode) => void
  setOpenWebDefaultEnabled: (enabled: boolean) => void
  setDevotionalDepthPreference: (preference: DevotionalDepthPreference) => void
  setChatSidebarOpen: (open: boolean) => void
  setKeyStorageMode: (mode: KeyStorageMode) => void
  hydrateRememberedProviderKeys: () => Promise<void>
  clearProviderKeys: () => void
  setAnthropicApiKey: (key: string) => void
  setOpenaiApiKey: (key: string) => void
  setGoogleApiKey: (key: string) => void
  setMinimaxApiKey: (key: string) => void
  setNvidiaKimiApiKey: (key: string) => void
  setDayLockingEnabled: (enabled: boolean) => void
  setTextScale: (scale: TextScale) => void
  setReadingLeading: (leading: ReadingLeading) => void
  setReadingMeasure: (measure: ReadingMeasure) => void
  setReduceMotion: (enabled: boolean) => void
  setHighContrast: (enabled: boolean) => void
  setReadingComfort: (enabled: boolean) => void
  setReadingTheme: (theme: ReadingTheme | null) => void
  setReminderWindow: (window: ReminderWindow | null) => void
}

function providerKeys(state: SettingsState) {
  return {
    openaiApiKey: state.openaiApiKey,
    anthropicApiKey: state.anthropicApiKey,
    googleApiKey: state.googleApiKey,
    minimaxApiKey: state.minimaxApiKey,
    nvidiaKimiApiKey: state.nvidiaKimiApiKey,
  }
}

async function syncRememberedKeys(state: SettingsState): Promise<void> {
  if (state.keyStorageMode !== 'remember_encrypted') {
    clearRememberedProviderKeys()
    return
  }
  await saveRememberedProviderKeys(providerKeys(state))
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      bibleTranslation: DEFAULT_BIBLE_TRANSLATION,
      sabbathDay: 'sunday',
      defaultBrainMode: 'auto',
      openWebDefaultEnabled: false,
      devotionalDepthPreference: 'short_5_7',
      chatSidebarOpen: false,
      keyStorageMode: 'session_only',
      anthropicApiKey: '',
      openaiApiKey: '',
      googleApiKey: '',
      minimaxApiKey: '',
      nvidiaKimiApiKey: '',
      dayLockingEnabled: true,
      textScale: 'default',
      readingLeading: 'default',
      readingMeasure: 'default',
      reduceMotion: false,
      highContrast: false,
      readingComfort: false,
      readingTheme: null,
      reminderWindow: null,

      setBibleTranslation: (bibleTranslation) => set({ bibleTranslation }),
      setSabbathDay: (sabbathDay) => set({ sabbathDay }),
      setDefaultBrainMode: (defaultBrainMode) => set({ defaultBrainMode }),
      setOpenWebDefaultEnabled: (openWebDefaultEnabled) =>
        set({ openWebDefaultEnabled }),
      setDevotionalDepthPreference: (devotionalDepthPreference) =>
        set({ devotionalDepthPreference }),
      setChatSidebarOpen: (chatSidebarOpen) => set({ chatSidebarOpen }),
      setKeyStorageMode: (keyStorageMode) => {
        set({ keyStorageMode })
        void syncRememberedKeys(get())
      },
      hydrateRememberedProviderKeys: async () => {
        if (get().keyStorageMode !== 'remember_encrypted') return
        const remembered = await loadRememberedProviderKeys()
        if (!remembered) return
        set({
          openaiApiKey: remembered.openaiApiKey || '',
          anthropicApiKey:
            remembered.anthropicApiKey || remembered.openaiApiKey || '',
          googleApiKey: remembered.googleApiKey || '',
          minimaxApiKey: remembered.minimaxApiKey || '',
          nvidiaKimiApiKey: remembered.nvidiaKimiApiKey || '',
        })
      },
      clearProviderKeys: () => {
        set({
          anthropicApiKey: '',
          openaiApiKey: '',
          googleApiKey: '',
          minimaxApiKey: '',
          nvidiaKimiApiKey: '',
        })
        void syncRememberedKeys(get())
      },
      setAnthropicApiKey: (anthropicApiKey) => {
        set({
          anthropicApiKey,
          openaiApiKey: anthropicApiKey,
        })
        void syncRememberedKeys(get())
      },
      setOpenaiApiKey: (openaiApiKey) => {
        set({
          openaiApiKey,
          anthropicApiKey: openaiApiKey,
        })
        void syncRememberedKeys(get())
      },
      setGoogleApiKey: (googleApiKey) => {
        set({ googleApiKey })
        void syncRememberedKeys(get())
      },
      setMinimaxApiKey: (minimaxApiKey) => {
        set({ minimaxApiKey })
        void syncRememberedKeys(get())
      },
      setNvidiaKimiApiKey: (nvidiaKimiApiKey) => {
        set({ nvidiaKimiApiKey })
        void syncRememberedKeys(get())
      },
      setDayLockingEnabled: (dayLockingEnabled) => set({ dayLockingEnabled }),
      setTextScale: (textScale) => set({ textScale }),
      setReadingLeading: (readingLeading) => set({ readingLeading }),
      setReadingMeasure: (readingMeasure) => set({ readingMeasure }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReadingComfort: (readingComfort) => set({ readingComfort }),
      setReadingTheme: (readingTheme) => set({ readingTheme }),
      setReminderWindow: (reminderWindow) => set({ reminderWindow }),
    }),
    {
      name: 'euangelion-settings',
      partialize: (state) => ({
        bibleTranslation: state.bibleTranslation,
        sabbathDay: state.sabbathDay,
        defaultBrainMode: state.defaultBrainMode,
        openWebDefaultEnabled: state.openWebDefaultEnabled,
        devotionalDepthPreference: state.devotionalDepthPreference,
        chatSidebarOpen: state.chatSidebarOpen,
        keyStorageMode: state.keyStorageMode,
        dayLockingEnabled: state.dayLockingEnabled,
        textScale: state.textScale,
        readingLeading: state.readingLeading,
        readingMeasure: state.readingMeasure,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        readingComfort: state.readingComfort,
        readingTheme: state.readingTheme,
        reminderWindow: state.reminderWindow,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!isBibleTranslationCode(state.bibleTranslation)) {
          state.bibleTranslation = DEFAULT_BIBLE_TRANSLATION
        }
        if (
          state.readingTheme !== null &&
          !isReadingTheme(state.readingTheme)
        ) {
          state.readingTheme = null
        }
        if (
          state.reminderWindow !== null &&
          !isReminderWindow(state.reminderWindow)
        ) {
          state.reminderWindow = null
        }
        if (state.keyStorageMode === 'remember_encrypted') {
          void state.hydrateRememberedProviderKeys()
        }
      },
    },
  ),
)
