import fs from 'fs'
import path from 'path'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'

type RagFeature = 'chat' | 'audit'
type RagSourceType = 'curated' | 'reference' | 'devotional'

export type RagDoc = {
  id: string
  feature: RagFeature
  sourceType: RagSourceType
  moduleType: string
  title: string
  content: string
  sourcePath: string
  metadata?: Record<string, string | number>
}

let cache: {
  docs: RagDoc[]
  builtAt: string
} | null = null

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function parseDevotionalFile(filePath: string): RagDoc[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    const slug = path.basename(filePath, '.json')
    const docs: RagDoc[] = []

    const title = collapseWhitespace(String(data.title || slug))
    const scriptureReference = collapseWhitespace(
      String(data.scriptureReference || 'Scripture'),
    )

    docs.push({
      id: `devotional:${slug}:cover`,
      feature: 'chat',
      sourceType: 'devotional',
      moduleType: 'cover',
      title,
      content: collapseWhitespace(
        `${scriptureReference} ${String(data.teaser || '')}`,
      ),
      sourcePath: `public/devotionals/${slug}.json`,
      metadata: {
        slug,
      },
    })

    const modules = Array.isArray(data.modules)
      ? (data.modules as Array<Record<string, unknown>>)
      : []

    modules.forEach((module, index) => {
      const type = collapseWhitespace(String(module.type || 'module'))
      const heading = collapseWhitespace(
        String(module.heading || type || 'Section'),
      )
      const contentValue = module.content
      const contentText =
        typeof contentValue === 'string'
          ? contentValue
          : contentValue && typeof contentValue === 'object'
            ? Object.values(contentValue as Record<string, unknown>)
                .map((value) => (typeof value === 'string' ? value : ''))
                .join(' ')
            : ''

      docs.push({
        id: `devotional:${slug}:${type}:${index + 1}`,
        feature: 'chat',
        sourceType: 'devotional',
        moduleType: type || 'module',
        title: `${title} — ${heading}`,
        content: collapseWhitespace(contentText),
        sourcePath: `public/devotionals/${slug}.json`,
        metadata: {
          slug,
        },
      })
    })

    return docs.filter((doc) => doc.content.length > 0)
  } catch {
    return []
  }
}

function buildCuratedDocs(): RagDoc[] {
  const docs: RagDoc[] = []

  ALL_SERIES_ORDER.forEach((seriesSlug) => {
    const series = SERIES_DATA[seriesSlug]
    if (!series) return

    docs.push({
      id: `curated:${seriesSlug}:summary`,
      feature: 'audit',
      sourceType: 'curated',
      moduleType: 'series_summary',
      title: series.title,
      content: collapseWhitespace(
        `${series.question} ${series.introduction} ${series.context} ${series.framework}`,
      ),
      sourcePath: `data/series.ts:${seriesSlug}`,
      metadata: {
        seriesSlug,
      },
    })

    series.days.forEach((day) => {
      docs.push({
        id: `curated:${seriesSlug}:day:${day.day}`,
        feature: 'audit',
        sourceType: 'curated',
        moduleType: 'day',
        title: `${series.title} — Day ${day.day}`,
        content: collapseWhitespace(
          `${day.title} ${series.framework} ${series.question}`,
        ),
        sourcePath: `data/series.ts:${seriesSlug}`,
        metadata: {
          seriesSlug,
          day: day.day,
        },
      })
    })
  })

  return docs
}

function buildReferenceDocs(): RagDoc[] {
  const root = path.join(process.cwd(), 'content', 'reference')
  if (!fs.existsSync(root)) return []

  const files: string[] = []
  const allowedExt = new Set(['.md', '.txt', '.json'])
  const MAX_FILES = 120

  const walk = (dir: string) => {
    if (files.length >= MAX_FILES) return
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      const ext = path.extname(entry.name).toLowerCase()
      if (!allowedExt.has(ext)) continue
      files.push(full)
    }
  }

  walk(root)

  const docs = files
    .map<RagDoc | null>((file, index) => {
      try {
        const raw = fs.readFileSync(file, 'utf8')
        const content =
          path.extname(file).toLowerCase() === '.json'
            ? collapseWhitespace(raw.slice(0, 16_000))
            : collapseWhitespace(raw.slice(0, 16_000))
        if (!content) return null
        const relativePath = path.relative(process.cwd(), file)
        return {
          id: `reference:file:${index + 1}:${normalizeIdPart(relativePath)}`,
          feature: 'chat' as const,
          sourceType: 'reference' as const,
          moduleType: 'index',
          title: path.basename(file),
          content,
          sourcePath: relativePath,
        }
      } catch {
        return null
      }
    })
    .filter((doc): doc is RagDoc => doc !== null)

  return docs
}

function buildDevotionalDocs(): RagDoc[] {
  const dir = path.join(process.cwd(), 'public', 'devotionals')
  if (!fs.existsSync(dir)) return []

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .slice(0, 500)

  return files.flatMap((file) => parseDevotionalFile(path.join(dir, file)))
}

export function buildCanonicalRagIndex(): {
  docs: RagDoc[]
  builtAt: string
} {
  const docs = [
    ...buildCuratedDocs(),
    ...buildReferenceDocs(),
    ...buildDevotionalDocs(),
  ]
  return {
    docs,
    builtAt: new Date().toISOString(),
  }
}

export function getCanonicalRagIndex(forceRebuild = false): {
  docs: RagDoc[]
  builtAt: string
} {
  if (!cache || forceRebuild) {
    cache = buildCanonicalRagIndex()
  }
  return cache
}

function tokenize(value: string): string[] {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter((token) => token.length > 2)
}

export function retrieveFromIndex(params: {
  query: string
  feature: RagFeature
  sourceTypes?: RagSourceType[]
  moduleTypes?: string[]
  limit?: number
}): RagDoc[] {
  const limit = params.limit || 8
  const queryTokens = new Set(tokenize(params.query))
  if (queryTokens.size === 0) return []

  const { docs } = getCanonicalRagIndex(false)
  const filtered = docs.filter((doc) => {
    if (doc.feature !== params.feature) return false
    if (params.sourceTypes && !params.sourceTypes.includes(doc.sourceType)) {
      return false
    }
    if (params.moduleTypes && params.moduleTypes.length > 0) {
      return params.moduleTypes.includes(doc.moduleType)
    }
    return true
  })

  return filtered
    .map((doc) => {
      const docTokens = new Set(tokenize(`${doc.title} ${doc.content}`))
      let score = 0
      queryTokens.forEach((token) => {
        if (docTokens.has(token)) score += 1
      })
      return { doc, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.doc)
}
