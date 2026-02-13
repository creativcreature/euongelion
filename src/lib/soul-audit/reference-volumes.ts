import fs from 'fs'
import path from 'path'

export interface ReferenceHit {
  source: string
  excerpt: string
}

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

function keywordsFromInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 5),
    ),
  ).slice(0, 8)
}

export function retrieveReferenceHits(params: {
  userResponse: string
  scriptureReference: string
  limit?: number
}): ReferenceHit[] {
  const root = path.join(process.cwd(), 'content', 'reference')
  const files: string[] = []
  collectReferenceFiles(root, files)

  const keywords = keywordsFromInput(
    `${params.userResponse} ${params.scriptureReference}`,
  )
  const limit = params.limit ?? 3
  if (files.length === 0 || keywords.length === 0) return []

  const hits: ReferenceHit[] = []

  for (const file of files) {
    if (hits.length >= limit) break

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const lines = text.split('\n')
    for (const line of lines) {
      const normalized = line.toLowerCase()
      if (!normalized.trim()) continue
      if (!keywords.some((kw) => normalized.includes(kw))) continue

      hits.push({
        source: path.relative(process.cwd(), file),
        excerpt: line.trim().slice(0, 240),
      })
      break
    }
  }

  return hits
}
