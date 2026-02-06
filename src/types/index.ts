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

// Module types (for Substack 12-module format — Sprint 2)
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
  | 'interactive'
  | 'resource'

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
