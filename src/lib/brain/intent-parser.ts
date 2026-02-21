export type ParsedAuditIntent = {
  reflectionFocus: string
  themes: string[]
  scriptureAnchors: string[]
  tone: 'lament' | 'hope' | 'confession' | 'anxiety' | 'guidance' | 'mixed'
  intentTags: string[]
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

export function parseAuditIntent(input: string): ParsedAuditIntent {
  const reflectionFocus = collapseWhitespace(input).slice(0, 160)
  const themes = extractThemes(input)
  const tone = inferTone(input)
  const scriptureAnchors = inferScriptureAnchors(input)
  const intentTags = Array.from(new Set([tone, ...themes])).slice(0, 6)

  return {
    reflectionFocus,
    themes,
    scriptureAnchors,
    tone,
    intentTags,
  }
}
