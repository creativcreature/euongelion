import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SabbathDay = 'saturday' | 'sunday'

type BibleTranslation = 'NIV' | 'ESV' | 'NASB' | 'KJV' | 'NLT' | 'MSG'

interface SettingsState {
  bibleTranslation: BibleTranslation
  sabbathDay: SabbathDay
  anthropicApiKey: string

  setBibleTranslation: (t: BibleTranslation) => void
  setSabbathDay: (d: SabbathDay) => void
  setAnthropicApiKey: (key: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      bibleTranslation: 'NIV',
      sabbathDay: 'sunday',
      anthropicApiKey: '',

      setBibleTranslation: (bibleTranslation) => set({ bibleTranslation }),
      setSabbathDay: (sabbathDay) => set({ sabbathDay }),
      setAnthropicApiKey: (anthropicApiKey) => set({ anthropicApiKey }),
    }),
    {
      name: 'euangelion-settings',
    },
  ),
)
