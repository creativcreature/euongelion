export const MAX_AUDITS_PER_CYCLE = 3

export const SOUL_AUDIT_OPTION_SPLIT = {
  aiPrimary: 3,
  curatedPrefab: 2,
  total: 5,
} as const

export const CURATED_SOURCE_PRIORITY = [
  'content/approved',
  'content/final',
  'content/series-json',
] as const

export const CRISIS_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  "don't want to live",
  "don't want to be here",
  'want to die',
  'better off dead',
  'no reason to live',
  'self harm',
  'self-harm',
  'cutting myself',
  'hurt myself',
  'abuse',
  'hits me',
  'beats me',
  'domestic violence',
]

export const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', contact: 'Call or Text 988' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
]

export const CRISIS_ACK_PROMPT =
  'Before continuing, please acknowledge these crisis resources.'

export const PREFAB_FALLBACK_SLUGS = ['identity', 'peace', 'community']
