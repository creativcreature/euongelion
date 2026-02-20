import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SabbathDay = 'saturday' | 'sunday'

type BibleTranslation = 'NIV' | 'ESV' | 'NASB' | 'KJV' | 'NLT' | 'MSG'
type TextScale = 'default' | 'large' | 'xlarge'

interface SettingsState {
  bibleTranslation: BibleTranslation
  sabbathDay: SabbathDay
  anthropicApiKey: string
  dayLockingEnabled: boolean
  textScale: TextScale
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean

  setBibleTranslation: (t: BibleTranslation) => void
  setSabbathDay: (d: SabbathDay) => void
  setAnthropicApiKey: (key: string) => void
  setDayLockingEnabled: (enabled: boolean) => void
  setTextScale: (scale: TextScale) => void
  setReduceMotion: (enabled: boolean) => void
  setHighContrast: (enabled: boolean) => void
  setReadingComfort: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      bibleTranslation: 'NIV',
      sabbathDay: 'sunday',
      anthropicApiKey: '',
      dayLockingEnabled: false,
      textScale: 'default',
      reduceMotion: false,
      highContrast: false,
      readingComfort: false,

      setBibleTranslation: (bibleTranslation) => set({ bibleTranslation }),
      setSabbathDay: (sabbathDay) => set({ sabbathDay }),
      setAnthropicApiKey: (anthropicApiKey) => set({ anthropicApiKey }),
      setDayLockingEnabled: (dayLockingEnabled) => set({ dayLockingEnabled }),
      setTextScale: (textScale) => set({ textScale }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReadingComfort: (readingComfort) => set({ readingComfort }),
    }),
    {
      name: 'euangelion-settings',
    },
  ),
)
