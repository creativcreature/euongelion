// Pathway types (Soul Audit result)
export type Pathway = 'Sleep' | 'Awake' | 'Shepherd'

// Panel types for Wake-Up devotional JSON format
export type PanelType = 'cover' | 'text' | 'text-with-image' | 'prayer'

export interface Panel {
  number: number
  type: PanelType
  heading?: string
  content: string
  image?: string
  illustration?: {
    description: string
    file: string
  }
  wordCount?: number
}

export interface Devotional {
  day: number
  title: string
  teaser: string
  framework: string
  panels: Panel[]
  totalWords: number
  jesusIntroduced?: number
  scriptureReference?: string
  chiastic_position?: string
}

// Series metadata for Wake-Up Magazine
export interface SeriesMeta {
  slug: string
  number: string
  theme: string
  question: string
  title: string
  introduction: string
  context: string
  framework: string
  days: DayMeta[]
}

export interface DayMeta {
  day: number
  title: string
  slug: string
}

// Module types (12 MVP module types)
export type ModuleType =
  | 'scripture'
  | 'vocab'
  | 'teaching'
  | 'insight'
  | 'story'
  | 'reflection'
  | 'prayer'
  | 'takeaway'
  | 'bridge'
  | 'comprehension'
  | 'profile'
  | 'resource'

export interface Module {
  type: ModuleType
  heading?: string
  // Scripture
  passage?: string
  reference?: string
  translation?: string
  // Vocab
  word?: string
  transliteration?: string
  language?: string
  definition?: string
  usage?: string
  // Teaching / Story / Insight / Takeaway / Bridge
  content?: string
  // Reflection
  prompt?: string
  // Prayer
  prayerText?: string
  breathPrayer?: string
  // Comprehension
  question?: string
  options?: string[]
  answer?: number
  explanation?: string
  // Profile
  name?: string
  era?: string
  bio?: string
  // Resource
  resources?: Array<{ title: string; url?: string; description?: string }>
}

// Progress tracking
export interface DevotionalProgress {
  slug: string
  completedAt: string
  timeSpent?: number
}

// Bookmarks
export interface Bookmark {
  slug: string
  title: string
  seriesTitle: string
  createdAt: string
}
