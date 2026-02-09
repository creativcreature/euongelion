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
  emphasis?: string[]
  hebrewOriginal?: string
  greekOriginal?: string | null
  fullPassage?: { reference: string; text: string }
  scriptureContext?: string

  // Vocab
  word?: string
  transliteration?: string
  language?: string
  definition?: string
  usage?: string
  pronunciation?: string
  usageNote?: string
  wordByWord?: Array<{
    word: string
    transliteration: string
    meaning: string
  }>
  relatedWords?: Array<{
    word: string
    reference?: string
    transliteration?: string
    meaning?: string
  }>
  strongsNumber?: string
  keyPhrases?: Array<{
    greek?: string
    transliteration?: string
    meaning?: string
  }>

  // Teaching / Story / Insight / Takeaway / Bridge
  content?: string
  keyInsight?: string
  connectionToTheme?: string
  historicalContext?: string
  fascinatingFact?: string
  greekParallel?: {
    concepts?: Array<{ term: string; greek: string; meaning: string }>
  }

  // Bridge
  ancientTruth?: string
  modernApplication?: string
  connectionPoint?: string
  newTestamentEcho?: string

  // Reflection
  prompt?: string
  additionalQuestions?: string[]
  invitationType?: string

  // Prayer
  prayerText?: string
  breathPrayer?: string
  prayerType?: string
  posture?: string

  // Takeaway
  commitment?: string
  leavingAtCross?: string[]
  receivingFromCross?: string[]

  // Comprehension (quiz-style)
  question?: string
  options?: string[]
  answer?: number
  explanation?: string
  // Comprehension (reflection-style)
  forReflection?: string[]
  forAccountabilityPartners?: string[]

  // Profile
  name?: string
  era?: string
  bio?: string
  description?: string
  keyQuote?: string
  lessonForUs?: string

  // Resource
  resources?: Array<{ title: string; url?: string; description?: string }>
  relatedScriptures?: Array<{ reference: string; text: string }>
  forDeeperStudy?: Array<{
    type: string
    title: string
    url?: string
    note?: string
  }>
  greekVocabulary?: Array<{
    word: string
    transliteration: string
    meaning: string
  }>
  weeklyChallenge?: string
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
