export type Disposition = 'seeker' | 'returning' | 'scholarly' | 'pastoral'
export type FaithBackground =
  | 'christian'
  | 'other-faith'
  | 'curious'
  | 'unspecified'
export type DepthPreference = 'introductory' | 'intermediate' | 'deep-study'

export type ParsedAuditIntent = {
  reflectionFocus: string
  themes: string[]
  scriptureAnchors: string[]
  tone: 'lament' | 'hope' | 'confession' | 'anxiety' | 'guidance' | 'mixed'
  intentTags: string[]
  disposition: Disposition
  faithBackground: FaithBackground
  depthPreference: DepthPreference
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'from',
  'this',
  'have',
  'been',
  'your',
  'just',
  'into',
  'about',
])

const THEME_KEYWORDS: Record<string, string[]> = {
  anxiety: ['anxiety', 'afraid', 'fear', 'panic', 'worry'],
  grief: ['grief', 'loss', 'sorrow', 'mourning'],
  purpose: ['purpose', 'calling', 'direction', 'meaning'],
  sin: ['sin', 'guilt', 'shame', 'repent'],
  trust: ['trust', 'faith', 'doubt', 'believe'],
  relationships: ['marriage', 'family', 'friend', 'relationship'],
}

const DISPOSITION_KEYWORDS: Record<Disposition, string[]> = {
  seeker: [
    'searching',
    'exploring',
    "don't know",
    'curious',
    'new to',
    'wondering',
    'open to',
    'never been',
    'first time',
    'unfamiliar',
  ],
  returning: [
    'returning',
    'came back',
    'used to',
    'grew up',
    'back to church',
    'reconnect',
    'walked away',
    'prodigal',
    'fell away',
    'coming back',
  ],
  scholarly: [
    'study',
    'exegesis',
    'hermeneutic',
    'original language',
    'hebrew',
    'greek',
    'theology',
    'doctrine',
    'systematic',
    'commentary',
    'lexicon',
  ],
  pastoral: [
    'hurting',
    'broken',
    'struggling',
    'pain',
    'crisis',
    'desperate',
    'lost',
    'overwhelmed',
    'suffering',
    'burdened',
    'weary',
  ],
}

const FAITH_KEYWORDS: Record<FaithBackground, string[]> = {
  christian: [
    'church',
    'Jesus',
    'Christ',
    'Bible',
    'Scripture',
    'gospel',
    'Lord',
    'pray',
    'worship',
    'pastor',
    'congregation',
    'sermon',
  ],
  'other-faith': [
    'Muslim',
    'Buddhist',
    'Hindu',
    'Jewish',
    'interfaith',
    'Quran',
    'synagogue',
    'temple',
    'meditation',
    'yoga',
    'dharma',
  ],
  curious: [
    'agnostic',
    'atheist',
    'skeptic',
    'spiritual but',
    'not religious',
    'questioning',
    'doubt',
    'unsure about God',
    'is God real',
  ],
  unspecified: [],
}

const DEPTH_KEYWORDS: Record<DepthPreference, string[]> = {
  introductory: [
    'simple',
    'basic',
    'beginner',
    'start',
    'new to',
    'overview',
    'introduction',
    'help me understand',
    'what does it mean',
  ],
  intermediate: [
    'deepen',
    'grow',
    'next step',
    'more',
    'further',
    'strengthen',
    'mature',
    'discipleship',
    'formation',
  ],
  'deep-study': [
    'study',
    'exegesis',
    'hermeneutic',
    'original language',
    'hebrew',
    'greek',
    'commentary',
    'theology',
    'systematic',
    'scholarly',
    'deep dive',
    'academic',
  ],
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function extractThemes(input: string): string[] {
  const normalized = input.toLowerCase()
  const themes = Object.entries(THEME_KEYWORDS)
    .filter(([, words]) => words.some((word) => normalized.includes(word)))
    .map(([theme]) => theme)

  if (themes.length > 0) return themes.slice(0, 3)

  const inferred = collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

  return Array.from(new Set(inferred)).slice(0, 3)
}

function inferTone(input: string): ParsedAuditIntent['tone'] {
  const normalized = input.toLowerCase()
  if (/grief|sorrow|lament|loss/.test(normalized)) return 'lament'
  if (/hope|future|expect/.test(normalized)) return 'hope'
  if (/sin|shame|repent|confess/.test(normalized)) return 'confession'
  if (/anxiety|fear|panic|worry/.test(normalized)) return 'anxiety'
  if (/guide|direction|wisdom|decision/.test(normalized)) return 'guidance'
  return 'mixed'
}

function inferScriptureAnchors(input: string): string[] {
  const anchors: string[] = []
  if (/anxiety|fear|panic|worry/i.test(input)) anchors.push('Philippians 4:6-7')
  if (/grief|sorrow|loss/i.test(input)) anchors.push('Psalm 34:18')
  if (/purpose|direction|calling/i.test(input)) anchors.push('Proverbs 3:5-6')
  if (/sin|shame|guilt|repent/i.test(input)) anchors.push('1 John 1:9')
  if (anchors.length === 0) anchors.push('Psalm 119:105')
  return anchors.slice(0, 2)
}

function inferFromKeywords<T extends string>(
  input: string,
  keywords: Record<T, string[]>,
  fallback: T,
): T {
  const lower = input.toLowerCase()
  const scores = Object.entries(keywords) as Array<[T, string[]]>

  let best: T = fallback
  let bestCount = 0

  for (const [category, words] of scores) {
    const count = (words as string[]).filter((word) =>
      lower.includes(word.toLowerCase()),
    ).length
    if (count > bestCount) {
      bestCount = count
      best = category
    }
  }

  return best
}

export function inferDisposition(input: string): Disposition {
  return inferFromKeywords(input, DISPOSITION_KEYWORDS, 'seeker')
}

export function inferFaithBackground(input: string): FaithBackground {
  return inferFromKeywords(input, FAITH_KEYWORDS, 'unspecified')
}

export function inferDepthPreference(input: string): DepthPreference {
  return inferFromKeywords(input, DEPTH_KEYWORDS, 'introductory')
}

export function parseAuditIntent(input: string): ParsedAuditIntent {
  const reflectionFocus = collapseWhitespace(input).slice(0, 160)
  const themes = extractThemes(input)
  const tone = inferTone(input)
  const scriptureAnchors = inferScriptureAnchors(input)
  const disposition = inferDisposition(input)
  const faithBackground = inferFaithBackground(input)
  const depthPreference = inferDepthPreference(input)
  const intentTags = Array.from(
    new Set([tone, ...themes, disposition, depthPreference]),
  ).slice(0, 8)

  return {
    reflectionFocus,
    themes,
    scriptureAnchors,
    tone,
    intentTags,
    disposition,
    faithBackground,
    depthPreference,
  }
}
