import { Redis } from '@upstash/redis'
import { brainFlags } from './flags'
import type {
  BrainProviderId,
  ChatRetrievalMode,
  QuotaState,
  UsageLedgerEntry,
} from './types'

type UsageSummary = {
  monthKey: string
  principalId: string
  totalMessages: number
  totalCostUsd: number
  byProvider: Record<string, { messages: number; costUsd: number }>
  quota: {
    freeCap: number
    subscriptionCredit: number
    used: number
    state: QuotaState
  }
  platformBudget: {
    limitUsd: number
    spentUsd: number
    remainingUsd: number
  }
}

const memoryByPrincipal = new Map<string, UsageSummary>()
const memoryEvents = new Map<string, UsageLedgerEntry[]>()
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

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

function summaryKey(principalId: string, month: string): string {
  return `${month}:${principalId}`
}

function createEmptySummary(params: {
  principalId: string
  month: string
  isPremium: boolean
}): UsageSummary {
  const freeCap = brainFlags.freeChatMonthlyCap
  const subscriptionCredit = params.isPremium
    ? brainFlags.subscriptionChatMonthlyCredit
    : 0

  return {
    monthKey: params.month,
    principalId: params.principalId,
    totalMessages: 0,
    totalCostUsd: 0,
    byProvider: {},
    quota: {
      freeCap,
      subscriptionCredit,
      used: 0,
      state: 'active',
    },
    platformBudget: {
      limitUsd: brainFlags.platformMonthlyBudgetUsd,
      spentUsd: 0,
      remainingUsd: brainFlags.platformMonthlyBudgetUsd,
    },
  }
}

function computeQuotaState(params: {
  used: number
  freeCap: number
  subscriptionCredit: number
}): QuotaState {
  const totalAllowance = params.freeCap + params.subscriptionCredit
  if (params.used >= totalAllowance) return 'halted_platform'

  const ratio = totalAllowance === 0 ? 1 : params.used / totalAllowance
  if (ratio >= brainFlags.nearLimitThreshold) return 'near_limit'
  return 'active'
}

export function resolvePrincipalId(params: {
  userId?: string | null
  sessionToken: string
}): string {
  if (params.userId) return `user:${params.userId}`
  return `session:${params.sessionToken}`
}

export async function getUsageSummary(params: {
  principalId: string
  isPremium: boolean
  now?: Date
}): Promise<UsageSummary> {
  const month = monthKey(params.now)
  const key = summaryKey(params.principalId, month)
  const existing = memoryByPrincipal.get(key)
  if (existing) return existing

  const summary = createEmptySummary({
    principalId: params.principalId,
    month,
    isPremium: params.isPremium,
  })

  const redis = getRedis()
  if (redis) {
    try {
      const raw = await redis.get<UsageSummary>(`ai:usage:summary:${key}`)
      if (raw) {
        memoryByPrincipal.set(key, raw)
        return raw
      }
    } catch {
      // Fail open on usage backend issues.
    }
  }

  memoryByPrincipal.set(key, summary)
  return summary
}

export async function recordUsage(params: {
  principalId: string
  provider: Exclude<BrainProviderId, 'auto'>
  mode: ChatRetrievalMode
  inputTokens: number
  outputTokens: number
  costUsd: number
  isPremium: boolean
  chargeToPlatform?: boolean
  now?: Date
}): Promise<UsageSummary> {
  const month = monthKey(params.now)
  const key = summaryKey(params.principalId, month)
  const summary = await getUsageSummary({
    principalId: params.principalId,
    isPremium: params.isPremium,
    now: params.now,
  })

  const providerBucket = summary.byProvider[params.provider] || {
    messages: 0,
    costUsd: 0,
  }
  providerBucket.messages += 1
  providerBucket.costUsd = Number(
    (providerBucket.costUsd + params.costUsd).toFixed(8),
  )
  summary.byProvider[params.provider] = providerBucket

  const chargeToPlatform = params.chargeToPlatform !== false
  summary.totalMessages += 1
  summary.totalCostUsd = Number(
    (summary.totalCostUsd + params.costUsd).toFixed(8),
  )

  if (chargeToPlatform) {
    summary.quota.used += 1
    summary.quota.state = computeQuotaState({
      used: summary.quota.used,
      freeCap: summary.quota.freeCap,
      subscriptionCredit: summary.quota.subscriptionCredit,
    })

    const platformSpent = Number(
      (summary.platformBudget.spentUsd + params.costUsd).toFixed(8),
    )
    summary.platformBudget.spentUsd = platformSpent
    summary.platformBudget.remainingUsd = Number(
      Math.max(0, summary.platformBudget.limitUsd - platformSpent).toFixed(8),
    )
  } else {
    summary.quota.state = computeQuotaState({
      used: summary.quota.used,
      freeCap: summary.quota.freeCap,
      subscriptionCredit: summary.quota.subscriptionCredit,
    })
  }

  memoryByPrincipal.set(key, summary)

  const eventsKey = `ai:usage:events:${key}`
  const event: UsageLedgerEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: (params.now || new Date()).toISOString(),
    principalId: params.principalId,
    provider: params.provider,
    mode: params.mode,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCostUsd: params.costUsd,
    chargedToPlatform: chargeToPlatform,
  }

  const events = memoryEvents.get(eventsKey) || []
  events.unshift(event)
  memoryEvents.set(eventsKey, events.slice(0, 200))

  const redis = getRedis()
  if (redis) {
    try {
      const summaryKey = `ai:usage:summary:${key}`
      const eventsKey = `ai:usage:events:${key}`
      await redis.set(summaryKey, summary)
      await redis.lpush(eventsKey, JSON.stringify(event))
      await redis.ltrim(eventsKey, 0, 199)
      // Keep bounded retention for usage records.
      await redis.expire(summaryKey, 120 * 24 * 60 * 60)
      await redis.expire(eventsKey, 120 * 24 * 60 * 60)
    } catch {
      // Fail open.
    }
  }

  return summary
}

export async function getUsageEvents(params: {
  principalId: string
  now?: Date
}): Promise<UsageLedgerEntry[]> {
  const month = monthKey(params.now)
  const key = summaryKey(params.principalId, month)
  const eventsKey = `ai:usage:events:${key}`
  const inMemory = memoryEvents.get(eventsKey)
  if (inMemory) return inMemory

  const redis = getRedis()
  if (!redis) return []

  try {
    const raw = await redis.lrange<string>(eventsKey, 0, 199)
    if (!Array.isArray(raw)) return []
    const parsed = raw
      .map((row) => {
        try {
          return JSON.parse(row) as UsageLedgerEntry
        } catch {
          return null
        }
      })
      .filter((row): row is UsageLedgerEntry => Boolean(row))

    memoryEvents.set(eventsKey, parsed)
    return parsed
  } catch {
    return []
  }
}

export function quotaRequiresByo(summary: UsageSummary): boolean {
  return (
    summary.quota.state === 'halted_platform' ||
    summary.platformBudget.remainingUsd <= 0
  )
}
