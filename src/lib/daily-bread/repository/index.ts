/**
 * Repository selection for the READER path. Explicit, env-driven, and
 * fail-loud: an unknown DAILY_BREAD_V2_SOURCE throws rather than silently
 * choosing a source.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { dailyBreadSource } from '../flags'
import { FixtureDailyBreadRepository } from './fixture'
import { SupabaseDailyBreadRepository, type SupabaseLike } from './supabase'
import type { DailyBreadRepository } from './types'

let cached: { key: string; repo: DailyBreadRepository } | null = null

export function getDailyBreadRepository(): DailyBreadRepository {
  const source = dailyBreadSource()
  if (cached?.key === source) return cached.repo
  const repo: DailyBreadRepository =
    source === 'fixture'
      ? new FixtureDailyBreadRepository()
      : new SupabaseDailyBreadRepository(createAdminClient() as unknown as SupabaseLike)
  cached = { key: source, repo }
  return repo
}

export type { DailyBreadRepository } from './types'
