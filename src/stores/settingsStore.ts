import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clearRememberedProviderKeys,
  loadRememberedProviderKeys,
  saveRememberedProviderKeys,
} from '@/lib/brain/key-storage'

type SabbathDay = 'saturday' | 'sunday'
type BrainMode = 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'
type DevotionalDepthPreference =
  | 'short_5_7'
  | 'medium_20_30'
  | 'long_45_60'
  | 'variable'
type KeyStorageMode = 'session_only' | 'remember_encrypted'

type BibleTranslation = 'NIV' | 'ESV' | 'NASB' | 'KJV' | 'NLT' | 'MSG'
type TextScale = 'default' | 'large' | 'xlarge'

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
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean

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
  setReduceMotion: (enabled: boolean) => void
  setHighContrast: (enabled: boolean) => void
  setReadingComfort: (enabled: boolean) => void
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
      bibleTranslation: 'NIV',
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
      dayLockingEnabled: false,
      textScale: 'default',
      reduceMotion: false,
      highContrast: false,
      readingComfort: false,

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
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReadingComfort: (readingComfort) => set({ readingComfort }),
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
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        readingComfort: state.readingComfort,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.keyStorageMode === 'remember_encrypted') {
          void state.hydrateRememberedProviderKeys()
        }
      },
    },
  ),
)
