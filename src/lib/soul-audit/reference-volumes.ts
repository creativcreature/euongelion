import fs from 'fs'
import path from 'path'

export interface ReferenceHit {
  source: string
  excerpt: string
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'because',
  'before',
  'being',
  'between',
  'could',
  'doing',
  'every',
  'first',
  'from',
  'have',
  'just',
  'more',
  'should',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'what',
  'when',
  'where',
  'with',
  'would',
  'your',
])

const SKIP_SEGMENTS = new Set(['.git', 'stepbible-data'])
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_LINES_PER_FILE = 220
const MAX_CORPUS_LINES = 24000

interface ReferenceCorpusLine {
  source: string
  sourcePriority: number
  text: string
  normalized: string
}

function shouldSkipPath(target: string): boolean {
  const segments = target.split(path.sep)
  return segments.some((segment) => SKIP_SEGMENTS.has(segment))
}

function collectReferenceFiles(dir: string, acc: string[]): void {
  if (!fs.existsSync(dir)) return
  if (shouldSkipPath(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (shouldSkipPath(full)) continue

    if (entry.isDirectory()) {
      collectReferenceFiles(full, acc)
      continue
    }

    if (!/\.(md|markdown|txt|json)$/i.test(entry.name)) continue

    try {
      const stat = fs.statSync(full)
      if (stat.size > MAX_FILE_BYTES) continue
    } catch {
      continue
    }

    acc.push(full)
  }
}

let cachedReferenceFiles: string[] | null = null
let cachedCorpus: ReferenceCorpusLine[] | null = null

function listReferenceFiles(root: string): string[] {
  if (cachedReferenceFiles) return cachedReferenceFiles
  const files: string[] = []
  collectReferenceFiles(root, files)
  cachedReferenceFiles = files.sort()
  return cachedReferenceFiles
}

function keywordsFromInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 18)
}

function lineLooksUsable(line: string): boolean {
  const normalized = line.replace(/\s+/g, ' ').trim()
  if (normalized.length < 48 || normalized.length > 420) return false

  const words = normalized.split(' ')
  if (words.length < 7) return false

  const alphaChars = (normalized.match(/[a-z]/gi) ?? []).length
  if (alphaChars < Math.floor(normalized.length * 0.45)) return false

  return true
}

function sourcePriority(relativeSource: string): number {
  if (relativeSource.includes(`${path.sep}commentaries${path.sep}`)) {
    return relativeSource.endsWith('.txt') ? 5 : 3
  }
  if (relativeSource.includes(`${path.sep}bibles${path.sep}`)) return 2
  if (relativeSource.includes(`${path.sep}lexicons${path.sep}`)) return 2
  if (relativeSource.includes(`${path.sep}dictionaries${path.sep}`)) return 2
  return 1
}

function buildReferenceCorpus(root: string): ReferenceCorpusLine[] {
  if (cachedCorpus) return cachedCorpus

  const files = listReferenceFiles(root)
  const corpus: ReferenceCorpusLine[] = []

  for (const file of files) {
    if (corpus.length >= MAX_CORPUS_LINES) break

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const relativeSource = path.relative(process.cwd(), file)
    const priority = sourcePriority(relativeSource)
    const lines = text.split('\n')

    let acceptedFromFile = 0
    for (const rawLine of lines) {
      if (acceptedFromFile >= MAX_LINES_PER_FILE) break
      if (corpus.length >= MAX_CORPUS_LINES) break

      const trimmed = rawLine.replace(/\s+/g, ' ').trim()
      if (!lineLooksUsable(trimmed)) continue

      corpus.push({
        source: relativeSource,
        sourcePriority: priority,
        text: trimmed,
        normalized: trimmed.toLowerCase(),
      })
      acceptedFromFile += 1
    }
  }

  cachedCorpus = corpus
  return corpus
}

function tokenizeScriptureReference(reference: string): string[] {
  const compact = reference.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!compact) return []

  return compact
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 5)
}

function countKeywordHits(line: string, keywords: string[]): number {
  let hits = 0
  for (const keyword of keywords) {
    if (line.includes(keyword)) hits += 1
  }
  return hits
}

function deterministicScore(line: ReferenceCorpusLine): number {
  const stable = `${line.source}|${line.text}`
  return stable.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function retrieveReferenceHits(params: {
  userResponse: string
  scriptureReference: string
  limit?: number
}): ReferenceHit[] {
  const root = path.join(process.cwd(), 'content', 'reference')
  const corpus = buildReferenceCorpus(root)
  const limit = params.limit ?? 3
  if (corpus.length === 0) return []

  let keywords = keywordsFromInput(
    `${params.userResponse} ${params.scriptureReference}`,
  )
  if (keywords.length === 0) {
    keywords = keywordsFromInput(params.scriptureReference)
  }

  const scriptureTokens = tokenizeScriptureReference(params.scriptureReference)
  const scored = corpus
    .map((line) => {
      const keywordHits = countKeywordHits(line.normalized, keywords)
      const scriptureHits = countKeywordHits(line.normalized, scriptureTokens)
      const score =
        line.sourcePriority * 4 + keywordHits * 5 + scriptureHits * 3

      return {
        line,
        score,
        keywordHits,
        scriptureHits,
        deterministic: deterministicScore(line),
      }
    })
    .filter((entry) =>
      keywords.length > 0
        ? entry.keywordHits > 0 || entry.scriptureHits > 0
        : entry.scriptureHits > 0,
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.deterministic - b.deterministic
    })

  const hits: ReferenceHit[] = []
  const seen = new Set<string>()

  for (const entry of scored) {
    const dedupeKey = `${entry.line.source}|${entry.line.text.toLowerCase()}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    hits.push({
      source: entry.line.source,
      excerpt: entry.line.text.slice(0, 280),
    })

    if (hits.length >= limit) break
  }

  if (hits.length > 0) return hits

  const deterministicFallback =
    corpus.find((line) =>
      line.source.includes(`${path.sep}commentaries${path.sep}`),
    ) ?? corpus[0]

  if (!deterministicFallback) return []

  return [
    {
      source: deterministicFallback.source,
      excerpt: deterministicFallback.text.slice(0, 280),
    },
  ]
}
