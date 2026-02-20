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

function collectReferenceFiles(dir: string, acc: string[]): void {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectReferenceFiles(full, acc)
      continue
    }
    if (!/\.(md|markdown|txt|json)$/i.test(entry.name)) continue
    acc.push(full)
  }
}

let cachedReferenceFiles: string[] | null = null

function listReferenceFiles(root: string): string[] {
  if (cachedReferenceFiles) return cachedReferenceFiles
  const files: string[] = []
  collectReferenceFiles(root, files)
  cachedReferenceFiles = files
  return files
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
  ).slice(0, 16)
}

export function retrieveReferenceHits(params: {
  userResponse: string
  scriptureReference: string
  limit?: number
}): ReferenceHit[] {
  const root = path.join(process.cwd(), 'content', 'reference')
  const files = listReferenceFiles(root)

  let keywords = keywordsFromInput(
    `${params.userResponse} ${params.scriptureReference}`,
  )
  const limit = params.limit ?? 3
  if (files.length === 0) return []
  if (keywords.length === 0) {
    keywords = keywordsFromInput(params.scriptureReference)
  }

  const hits: ReferenceHit[] = []
  let deterministicFallback: ReferenceHit | null = null

  for (const file of files) {
    if (hits.length >= limit) break

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const relativeSource = path.relative(process.cwd(), file)
    const lines = text.split('\n')

    for (const line of lines) {
      const normalized = line.toLowerCase()
      if (!normalized.trim()) continue
      if (!deterministicFallback) {
        deterministicFallback = {
          source: relativeSource,
          excerpt: line.trim().slice(0, 240),
        }
      }
      if (keywords.length === 0) continue

      if (keywords.some((keyword) => normalized.includes(keyword))) {
        hits.push({
          source: relativeSource,
          excerpt: line.trim().slice(0, 240),
        })
        break
      }
    }
  }

  if (hits.length > 0) return hits.slice(0, limit)

  return deterministicFallback ? [deterministicFallback] : []
}
