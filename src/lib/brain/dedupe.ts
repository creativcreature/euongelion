import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'

type DedupeEntry = {
  hash: string
  text: string
  createdAt: string
}

const memoryScopes = new Map<string, DedupeEntry[]>()
let redisClient: Redis | null = null

function getRedis(): Redis | null {
  if (redisClient) return redisClient
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null
  }
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return redisClient
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shingles(text: string, size = 3): string[] {
  const tokens = normalize(text).split(' ').filter(Boolean)
  if (tokens.length < size) return [tokens.join(' ')]
  const result: string[] = []
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.push(tokens.slice(index, index + size).join(' '))
  }
  return result
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0

  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection += 1
  }

  return intersection / union.size
}

function makeHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function redisKey(scope: string): string {
  return `dedupe:${scope}`
}

function getMemoryEntries(scope: string): DedupeEntry[] {
  return memoryScopes.get(scope) || []
}

function setMemoryEntries(scope: string, entries: DedupeEntry[]) {
  memoryScopes.set(scope, entries)
}

async function readEntries(
  scope: string,
  maxItems: number,
): Promise<DedupeEntry[]> {
  const redis = getRedis()
  if (!redis) {
    return getMemoryEntries(scope).slice(0, maxItems)
  }

  try {
    const raw = await redis.lrange<string>(redisKey(scope), 0, maxItems - 1)
    const parsed = raw
      .map((row) => {
        try {
          const decoded = JSON.parse(row) as Partial<DedupeEntry>
          if (typeof decoded.text !== 'string') return null
          return {
            hash:
              typeof decoded.hash === 'string'
                ? decoded.hash
                : makeHash(decoded.text),
            text: decoded.text,
            createdAt:
              typeof decoded.createdAt === 'string'
                ? decoded.createdAt
                : new Date().toISOString(),
          }
        } catch {
          return null
        }
      })
      .filter((entry): entry is DedupeEntry => Boolean(entry))
    setMemoryEntries(scope, parsed)
    return parsed
  } catch {
    return getMemoryEntries(scope).slice(0, maxItems)
  }
}

async function writeEntry(params: {
  scope: string
  entry: DedupeEntry
  maxItems: number
  ttlSeconds: number
}) {
  const prior = getMemoryEntries(params.scope)
  setMemoryEntries(
    params.scope,
    [params.entry, ...prior].slice(0, params.maxItems),
  )

  const redis = getRedis()
  if (!redis) return

  try {
    const key = redisKey(params.scope)
    await redis.lpush(key, JSON.stringify(params.entry))
    await redis.ltrim(key, 0, params.maxItems - 1)
    await redis.expire(key, params.ttlSeconds)
  } catch {
    // Fail open if redis is unavailable.
  }
}

export async function duplicateCheck(params: {
  scope: string
  title: string
  body: string
  threshold?: number
  maxItems?: number
}): Promise<{ duplicate: boolean; similarity: number }> {
  const threshold =
    typeof params.threshold === 'number' ? params.threshold : 0.86
  const maxItems = params.maxItems || 600
  const candidate = `${params.title}\n${params.body}`
  const candidateHash = makeHash(candidate)
  const candidateSet = new Set(shingles(candidate))
  const existing = await readEntries(params.scope, maxItems)

  let maxSimilarity = 0
  for (const entry of existing) {
    if (entry.hash === candidateHash) {
      return { duplicate: true, similarity: 1 }
    }

    const entrySet = new Set(shingles(entry.text))
    const similarity = jaccardSimilarity(candidateSet, entrySet)
    if (similarity > maxSimilarity) maxSimilarity = similarity
    if (similarity >= threshold) {
      return { duplicate: true, similarity }
    }
  }

  return { duplicate: false, similarity: maxSimilarity }
}

export async function rememberFingerprint(params: {
  scope: string
  title: string
  body: string
  maxItems?: number
  ttlSeconds?: number
}) {
  const maxItems = params.maxItems || 600
  const ttlSeconds = params.ttlSeconds || 7 * 24 * 60 * 60
  const text = `${params.title}\n${params.body}`
  const entry: DedupeEntry = {
    hash: makeHash(text),
    text,
    createdAt: new Date().toISOString(),
  }
  await writeEntry({
    scope: params.scope,
    entry,
    maxItems,
    ttlSeconds,
  })
}
