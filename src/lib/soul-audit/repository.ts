import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AuditOptionPreview,
  CustomPlan,
  CustomPlanDay,
} from '@/types/soul-audit'

export interface AuditRunRecord {
  id: string
  session_token: string
  response_text: string
  crisis_detected: boolean
  created_at: string
}

export interface AuditOptionRecord extends AuditOptionPreview {
  audit_run_id: string
  created_at: string
}

export interface ConsentRecord {
  id: string
  audit_run_id: string
  session_token: string
  essential_accepted: boolean
  analytics_opt_in: boolean
  crisis_acknowledged: boolean
  created_at: string
}

export interface AuditSelectionRecord {
  id: string
  audit_run_id: string
  option_id: string
  option_kind: 'ai_primary' | 'curated_prefab'
  series_slug: string
  plan_token: string | null
  created_at: string
}

export interface DevotionalPlanInstanceRecord {
  id: string
  plan_token: string
  audit_run_id: string
  session_token: string
  series_slug: string
  timezone: string
  timezone_offset_minutes: number
  start_policy:
    | 'monday_cycle'
    | 'tuesday_archived_monday'
    | 'wed_sun_onboarding'
  onboarding_variant?:
    | 'none'
    | 'wednesday_3_day'
    | 'thursday_2_day'
    | 'friday_1_day'
    | 'weekend_bridge'
  onboarding_days?: number
  started_at: string
  cycle_start_at: string
  created_at: string
}

export interface DevotionalPlanDayRecord {
  id: string
  plan_token: string
  day_number: number
  content: CustomPlanDay
  created_at: string
}

export interface AnnotationRecord {
  id: string
  session_token: string
  devotional_slug: string
  annotation_type: 'note' | 'highlight' | 'sticky' | 'sticker'
  anchor_text: string | null
  body: string | null
  style: Record<string, unknown> | null
  created_at: string
}

export interface BookmarkRecord {
  id: string
  session_token: string
  devotional_slug: string
  note: string | null
  created_at: string
}

export interface MockAccountSessionRecord {
  id: string
  session_token: string
  mode: 'anonymous' | 'mock_account'
  analytics_opt_in: boolean
  created_at: string
  updated_at: string
}

type RuntimeStore = {
  sessionAuditCounts: Map<string, number>
  runs: Map<string, AuditRunRecord>
  optionsByRun: Map<string, AuditOptionRecord[]>
  consentByRun: Map<string, ConsentRecord>
  selectionByRun: Map<string, AuditSelectionRecord>
  planByToken: Map<string, DevotionalPlanInstanceRecord>
  planDaysByToken: Map<string, DevotionalPlanDayRecord[]>
  annotationsBySession: Map<string, AnnotationRecord[]>
  bookmarksBySession: Map<string, BookmarkRecord[]>
  mockSessionsByToken: Map<string, MockAccountSessionRecord>
}

declare global {
  var __euangelionSoulAuditStore__: RuntimeStore | undefined
}

function getStore(): RuntimeStore {
  if (!global.__euangelionSoulAuditStore__) {
    global.__euangelionSoulAuditStore__ = {
      sessionAuditCounts: new Map(),
      runs: new Map(),
      optionsByRun: new Map(),
      consentByRun: new Map(),
      selectionByRun: new Map(),
      planByToken: new Map(),
      planDaysByToken: new Map(),
      annotationsBySession: new Map(),
      bookmarksBySession: new Map(),
      mockSessionsByToken: new Map(),
    }
  }
  return global.__euangelionSoulAuditStore__
}

function maybeSupabase() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null
  }
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

async function safeInsert(table: string, values: object) {
  const supabase = maybeSupabase()
  if (!supabase) return

  try {
    // Keep runtime resilient if migrations are pending in an environment.
    await (
      supabase as unknown as {
        from: (name: string) => { insert: (value: object) => Promise<unknown> }
      }
    )
      .from(table)
      .insert(values)
  } catch {
    // no-op
  }
}

async function safeUpsert(table: string, values: object) {
  const supabase = maybeSupabase()
  if (!supabase) return

  try {
    await (
      supabase as unknown as {
        from: (name: string) => { upsert: (value: object) => Promise<unknown> }
      }
    )
      .from(table)
      .upsert(values)
  } catch {
    // no-op
  }
}

async function safeDelete(
  table: string,
  filters: Record<string, string | number | boolean>,
) {
  const supabase = maybeSupabase()
  if (!supabase) return

  try {
    let query = (supabase as any).from(table).delete()

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }

    await query
  } catch {
    // no-op
  }
}

async function safeSelectOne<T>(
  table: string,
  filters: Record<string, string | number | boolean>,
): Promise<T | null> {
  const supabase = maybeSupabase()
  if (!supabase) return null

  try {
    let query = (supabase as any).from(table).select('*')

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }

    const { data, error } = (await query.maybeSingle()) as {
      data: T | null
      error: unknown
    }
    if (error) return null
    return data ?? null
  } catch {
    return null
  }
}

async function safeSelectMany<T>(
  table: string,
  filters: Record<string, string | number | boolean>,
): Promise<T[]> {
  const supabase = maybeSupabase()
  if (!supabase) return []

  try {
    let query = (supabase as any).from(table).select('*')

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }

    const { data, error } = (await query) as {
      data: T[] | null
      error: unknown
    }
    if (error) return []

    return data ?? []
  } catch {
    return []
  }
}

export function getSessionAuditCount(sessionToken: string): number {
  return getStore().sessionAuditCounts.get(sessionToken) ?? 0
}

export function bumpSessionAuditCount(sessionToken: string): number {
  const store = getStore()
  const next = (store.sessionAuditCounts.get(sessionToken) ?? 0) + 1
  store.sessionAuditCounts.set(sessionToken, next)
  return next
}

export function resetSessionAuditCount(sessionToken: string): void {
  getStore().sessionAuditCounts.set(sessionToken, 0)
}

export async function clearSessionAuditState(
  sessionToken: string,
): Promise<void> {
  const store = getStore()
  resetSessionAuditCount(sessionToken)

  const runs = await listAuditRunsForSessionWithFallback(sessionToken)
  const runIds = Array.from(new Set(runs.map((run) => run.id)))
  for (const [runId, run] of store.runs.entries()) {
    if (run.session_token === sessionToken && !runIds.includes(runId)) {
      runIds.push(runId)
    }
  }

  const plans = await listPlanInstancesForSessionWithFallback(sessionToken)
  const planTokens = Array.from(new Set(plans.map((plan) => plan.plan_token)))
  for (const [planToken, plan] of store.planByToken.entries()) {
    if (
      plan.session_token === sessionToken &&
      !planTokens.includes(planToken)
    ) {
      planTokens.push(planToken)
    }
  }

  // Clear runtime state first so UI no longer resolves stale "current" routes.
  for (const runId of runIds) {
    store.runs.delete(runId)
    store.optionsByRun.delete(runId)
    store.consentByRun.delete(runId)
    store.selectionByRun.delete(runId)
  }
  for (const planToken of planTokens) {
    store.planByToken.delete(planToken)
    store.planDaysByToken.delete(planToken)
  }

  // Best-effort persistence cleanup. Keep failure-tolerant behavior.
  for (const planToken of planTokens) {
    const cachedDays = getAllPlanDays(planToken)
    const persistedDays =
      cachedDays.length > 0
        ? cachedDays
        : await safeSelectMany<DevotionalPlanDayRecord>(
            'devotional_plan_days',
            {
              plan_token: planToken,
            },
          )

    for (const day of persistedDays) {
      await safeDelete('devotional_day_citations', {
        plan_day_id: day.id,
      })
    }
    await safeDelete('devotional_plan_days', { plan_token: planToken })
    await safeDelete('devotional_plan_instances', {
      plan_token: planToken,
      session_token: sessionToken,
    })
  }

  for (const runId of runIds) {
    await safeDelete('audit_selections', { audit_run_id: runId })
    await safeDelete('consent_records', { audit_run_id: runId })
    await safeDelete('audit_options', { audit_run_id: runId })
    await safeDelete('audit_runs', {
      id: runId,
      session_token: sessionToken,
    })
  }
}

export async function createAuditRun(params: {
  sessionToken: string
  responseText: string
  crisisDetected: boolean
  options: AuditOptionPreview[]
}): Promise<{ run: AuditRunRecord; options: AuditOptionRecord[] }> {
  const now = new Date().toISOString()
  const run: AuditRunRecord = {
    id: randomUUID(),
    session_token: params.sessionToken,
    response_text: params.responseText,
    crisis_detected: params.crisisDetected,
    created_at: now,
  }

  const optionRows: AuditOptionRecord[] = params.options.map((option) => ({
    ...option,
    audit_run_id: run.id,
    created_at: now,
  }))

  const store = getStore()
  store.runs.set(run.id, run)
  store.optionsByRun.set(run.id, optionRows)

  await safeInsert('audit_runs', run)
  for (const option of optionRows) {
    await safeInsert('audit_options', option)
  }

  return { run, options: optionRows }
}

export function getAuditRun(runId: string): AuditRunRecord | null {
  return getStore().runs.get(runId) ?? null
}

export async function getAuditRunWithFallback(
  runId: string,
): Promise<AuditRunRecord | null> {
  const cached = getAuditRun(runId)
  if (cached) return cached

  const fetched = await safeSelectOne<AuditRunRecord>('audit_runs', {
    id: runId,
  })
  if (!fetched) return null

  getStore().runs.set(runId, fetched)
  return fetched
}

export function listAuditRunsForSession(
  sessionToken: string,
): AuditRunRecord[] {
  return Array.from(getStore().runs.values()).filter(
    (run) => run.session_token === sessionToken,
  )
}

export async function listAuditRunsForSessionWithFallback(
  sessionToken: string,
): Promise<AuditRunRecord[]> {
  const cached = listAuditRunsForSession(sessionToken)
  const fetched = await safeSelectMany<AuditRunRecord>('audit_runs', {
    session_token: sessionToken,
  })

  for (const run of fetched) {
    getStore().runs.set(run.id, run)
  }

  const merged = [...cached, ...fetched]
  const byId = new Map<string, AuditRunRecord>()
  for (const run of merged) {
    byId.set(run.id, run)
  }

  return Array.from(byId.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
}

export function getAuditOptions(runId: string): AuditOptionRecord[] {
  return getStore().optionsByRun.get(runId) ?? []
}

export async function getAuditOptionsWithFallback(
  runId: string,
): Promise<AuditOptionRecord[]> {
  const cached = getAuditOptions(runId)
  if (cached.length > 0) return cached

  const fetched = await safeSelectMany<AuditOptionRecord>('audit_options', {
    audit_run_id: runId,
  })
  if (fetched.length === 0) return []

  fetched.sort((a, b) => a.rank - b.rank)
  getStore().optionsByRun.set(runId, fetched)
  return fetched
}

export async function saveConsent(params: {
  runId: string
  sessionToken: string
  essentialAccepted: boolean
  analyticsOptIn: boolean
  crisisAcknowledged: boolean
}): Promise<ConsentRecord> {
  const consent: ConsentRecord = {
    id: randomUUID(),
    audit_run_id: params.runId,
    session_token: params.sessionToken,
    essential_accepted: params.essentialAccepted,
    analytics_opt_in: params.analyticsOptIn,
    crisis_acknowledged: params.crisisAcknowledged,
    created_at: new Date().toISOString(),
  }

  getStore().consentByRun.set(params.runId, consent)
  await safeInsert('consent_records', consent)
  return consent
}

export function getConsent(runId: string): ConsentRecord | null {
  return getStore().consentByRun.get(runId) ?? null
}

export async function getConsentWithFallback(
  runId: string,
): Promise<ConsentRecord | null> {
  const cached = getConsent(runId)
  if (cached) return cached

  const fetched = await safeSelectOne<ConsentRecord>('consent_records', {
    audit_run_id: runId,
  })
  if (!fetched) return null

  getStore().consentByRun.set(runId, fetched)
  return fetched
}

export async function saveSelection(params: {
  runId: string
  optionId: string
  optionKind: 'ai_primary' | 'curated_prefab'
  seriesSlug: string
  planToken: string | null
}): Promise<AuditSelectionRecord> {
  const selection: AuditSelectionRecord = {
    id: randomUUID(),
    audit_run_id: params.runId,
    option_id: params.optionId,
    option_kind: params.optionKind,
    series_slug: params.seriesSlug,
    plan_token: params.planToken,
    created_at: new Date().toISOString(),
  }

  getStore().selectionByRun.set(params.runId, selection)
  await safeInsert('audit_selections', selection)
  return selection
}

export function getSelection(runId: string): AuditSelectionRecord | null {
  return getStore().selectionByRun.get(runId) ?? null
}

export async function getSelectionWithFallback(
  runId: string,
): Promise<AuditSelectionRecord | null> {
  const cached = getSelection(runId)
  if (cached) return cached

  const fetched = await safeSelectOne<AuditSelectionRecord>(
    'audit_selections',
    {
      audit_run_id: runId,
    },
  )
  if (!fetched) return null

  getStore().selectionByRun.set(runId, fetched)
  return fetched
}

export function listSelectionsForSession(
  sessionToken: string,
): AuditSelectionRecord[] {
  const runIds = new Set(
    listAuditRunsForSession(sessionToken).map((run) => run.id),
  )
  return Array.from(getStore().selectionByRun.values()).filter((selection) =>
    runIds.has(selection.audit_run_id),
  )
}

export async function listSelectionsForSessionWithFallback(
  sessionToken: string,
): Promise<AuditSelectionRecord[]> {
  const runs = await listAuditRunsForSessionWithFallback(sessionToken)
  if (runs.length === 0) return []

  const runIds = Array.from(new Set(runs.map((run) => run.id)))
  const cached = Array.from(getStore().selectionByRun.values()).filter(
    (selection) => runIds.includes(selection.audit_run_id),
  )

  const fetched: AuditSelectionRecord[] = []
  for (const runId of runIds) {
    const rows = await safeSelectMany<AuditSelectionRecord>(
      'audit_selections',
      {
        audit_run_id: runId,
      },
    )
    fetched.push(...rows)
  }

  const merged = [...cached, ...fetched]
  const byRun = new Map<string, AuditSelectionRecord>()
  for (const row of merged.sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )) {
    if (!byRun.has(row.audit_run_id)) {
      byRun.set(row.audit_run_id, row)
    }
  }

  const sorted = Array.from(byRun.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  for (const row of sorted) {
    getStore().selectionByRun.set(row.audit_run_id, row)
  }
  return sorted
}

export async function getLatestSelectionForSessionWithFallback(
  sessionToken: string,
): Promise<AuditSelectionRecord | null> {
  const runs = await listAuditRunsForSessionWithFallback(sessionToken)
  if (runs.length === 0) return null

  const runIds = new Set(runs.map((run) => run.id))
  const cachedSelections = Array.from(
    getStore().selectionByRun.values(),
  ).filter((selection) => runIds.has(selection.audit_run_id))

  const missingRunIds = runs
    .map((run) => run.id)
    .filter((runId) => !getStore().selectionByRun.has(runId))

  for (const runId of missingRunIds) {
    const fetchedForRun = await safeSelectMany<AuditSelectionRecord>(
      'audit_selections',
      {
        audit_run_id: runId,
      },
    )
    if (fetchedForRun.length === 0) continue

    fetchedForRun.sort((a, b) => b.created_at.localeCompare(a.created_at))
    getStore().selectionByRun.set(runId, fetchedForRun[0])
    for (const row of fetchedForRun.slice(1)) {
      const existing = getStore().selectionByRun.get(row.audit_run_id)
      if (!existing) {
        getStore().selectionByRun.set(row.audit_run_id, row)
      }
    }
  }

  const merged = [
    ...cachedSelections,
    ...Array.from(getStore().selectionByRun.values()).filter((selection) =>
      runIds.has(selection.audit_run_id),
    ),
  ]
  if (merged.length === 0) return null

  merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return merged[0]
}

export async function createPlan(params: {
  runId: string
  sessionToken: string
  seriesSlug: string
  timezone: string
  timezoneOffsetMinutes: number
  startPolicy: DevotionalPlanInstanceRecord['start_policy']
  onboardingVariant?: DevotionalPlanInstanceRecord['onboarding_variant']
  onboardingDays?: number
  startedAt: string
  cycleStartAt: string
  days: CustomPlanDay[]
}): Promise<{ token: string; plan: CustomPlan }> {
  const token = randomUUID()
  const now = new Date().toISOString()

  const planRow: DevotionalPlanInstanceRecord = {
    id: randomUUID(),
    plan_token: token,
    audit_run_id: params.runId,
    session_token: params.sessionToken,
    series_slug: params.seriesSlug,
    timezone: params.timezone,
    timezone_offset_minutes: params.timezoneOffsetMinutes,
    start_policy: params.startPolicy,
    onboarding_variant: params.onboardingVariant,
    onboarding_days: params.onboardingDays,
    started_at: params.startedAt,
    cycle_start_at: params.cycleStartAt,
    created_at: now,
  }

  const dayRows: DevotionalPlanDayRecord[] = params.days.map((day) => ({
    id: randomUUID(),
    plan_token: token,
    day_number: day.day,
    content: day,
    created_at: now,
  }))

  const store = getStore()
  store.planByToken.set(token, planRow)
  store.planDaysByToken.set(token, dayRows)

  await safeInsert('devotional_plan_instances', planRow)
  for (const day of dayRows) {
    await safeInsert('devotional_plan_days', day)
    for (const endnote of day.content.endnotes ?? []) {
      await safeInsert('devotional_day_citations', {
        id: randomUUID(),
        plan_day_id: day.id,
        endnote_index: endnote.id,
        source: endnote.source,
        note: endnote.note,
      })
    }
  }

  return {
    token,
    plan: {
      title: 'Your Custom Plan',
      summary:
        'A curated-first devotional path with local reference grounding.',
      generatedAt: now,
      days: params.days,
    },
  }
}

export function getPlanInstance(
  token: string,
): DevotionalPlanInstanceRecord | null {
  return getStore().planByToken.get(token) ?? null
}

export function listPlanInstancesForSession(
  sessionToken: string,
): DevotionalPlanInstanceRecord[] {
  return Array.from(getStore().planByToken.values()).filter(
    (plan) => plan.session_token === sessionToken,
  )
}

export async function listPlanInstancesForSessionWithFallback(
  sessionToken: string,
): Promise<DevotionalPlanInstanceRecord[]> {
  const cached = listPlanInstancesForSession(sessionToken)
  const fetched = await safeSelectMany<DevotionalPlanInstanceRecord>(
    'devotional_plan_instances',
    {
      session_token: sessionToken,
    },
  )

  const merged = [...cached, ...fetched]
  const byToken = new Map<string, DevotionalPlanInstanceRecord>()
  for (const plan of merged) {
    byToken.set(plan.plan_token, plan)
  }

  const sorted = Array.from(byToken.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  for (const row of sorted) {
    getStore().planByToken.set(row.plan_token, row)
  }
  return sorted
}

export async function getLatestPlanInstanceForSessionWithFallback(
  sessionToken: string,
): Promise<DevotionalPlanInstanceRecord | null> {
  const cached = listPlanInstancesForSession(sessionToken)
  if (cached.length > 0) {
    cached.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return cached[0]
  }

  const fetched = await safeSelectMany<DevotionalPlanInstanceRecord>(
    'devotional_plan_instances',
    {
      session_token: sessionToken,
    },
  )
  if (fetched.length === 0) return null

  for (const plan of fetched) {
    getStore().planByToken.set(plan.plan_token, plan)
  }

  fetched.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return fetched[0]
}

export async function getPlanInstanceWithFallback(
  token: string,
): Promise<DevotionalPlanInstanceRecord | null> {
  const cached = getPlanInstance(token)
  if (cached) return cached

  const fetched = await safeSelectOne<DevotionalPlanInstanceRecord>(
    'devotional_plan_instances',
    {
      plan_token: token,
    },
  )
  if (!fetched) return null

  getStore().planByToken.set(token, fetched)
  return fetched
}

export function getPlanDay(
  token: string,
  dayNumber: number,
): DevotionalPlanDayRecord | null {
  const days = getStore().planDaysByToken.get(token) ?? []
  return days.find((day) => day.day_number === dayNumber) ?? null
}

export async function getPlanDayWithFallback(
  token: string,
  dayNumber: number,
): Promise<DevotionalPlanDayRecord | null> {
  const cached = getPlanDay(token, dayNumber)
  if (cached) return cached

  const fetched = await safeSelectOne<DevotionalPlanDayRecord>(
    'devotional_plan_days',
    {
      plan_token: token,
      day_number: dayNumber,
    },
  )
  if (!fetched) return null

  const current = getStore().planDaysByToken.get(token) ?? []
  const next = [
    ...current.filter((day) => day.day_number !== dayNumber),
    fetched,
  ]
  next.sort((a, b) => a.day_number - b.day_number)
  getStore().planDaysByToken.set(token, next)
  return fetched
}

export function getAllPlanDays(token: string): DevotionalPlanDayRecord[] {
  return getStore().planDaysByToken.get(token) ?? []
}

export async function getAllPlanDaysWithFallback(
  token: string,
): Promise<DevotionalPlanDayRecord[]> {
  const cached = getAllPlanDays(token)
  if (cached.length > 0) {
    return [...cached].sort((a, b) => a.day_number - b.day_number)
  }

  const fetched = await safeSelectMany<DevotionalPlanDayRecord>(
    'devotional_plan_days',
    {
      plan_token: token,
    },
  )
  if (fetched.length === 0) return []

  fetched.sort((a, b) => a.day_number - b.day_number)
  getStore().planDaysByToken.set(token, fetched)
  return fetched
}

export async function upsertMockAccountSession(params: {
  sessionToken: string
  mode: 'anonymous' | 'mock_account'
  analyticsOptIn: boolean
}): Promise<MockAccountSessionRecord> {
  const existing = getStore().mockSessionsByToken.get(params.sessionToken)
  const now = new Date().toISOString()
  const row: MockAccountSessionRecord = {
    id: existing?.id ?? randomUUID(),
    session_token: params.sessionToken,
    mode: params.mode,
    analytics_opt_in: params.analyticsOptIn,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }

  getStore().mockSessionsByToken.set(params.sessionToken, row)
  await safeUpsert('mock_account_sessions', row)
  return row
}

export function getMockAccountSession(
  sessionToken: string,
): MockAccountSessionRecord | null {
  return getStore().mockSessionsByToken.get(sessionToken) ?? null
}

export async function getMockAccountSessionWithFallback(
  sessionToken: string,
): Promise<MockAccountSessionRecord | null> {
  const cached = getMockAccountSession(sessionToken)
  if (cached) return cached

  const fetched = await safeSelectOne<MockAccountSessionRecord>(
    'mock_account_sessions',
    {
      session_token: sessionToken,
    },
  )
  if (!fetched) return null

  getStore().mockSessionsByToken.set(sessionToken, fetched)
  return fetched
}

export async function addAnnotation(params: {
  sessionToken: string
  devotionalSlug: string
  annotationType: AnnotationRecord['annotation_type']
  anchorText: string | null
  body: string | null
  style: Record<string, unknown> | null
}): Promise<AnnotationRecord> {
  const row: AnnotationRecord = {
    id: randomUUID(),
    session_token: params.sessionToken,
    devotional_slug: params.devotionalSlug,
    annotation_type: params.annotationType,
    anchor_text: params.anchorText,
    body: params.body,
    style: params.style,
    created_at: new Date().toISOString(),
  }

  const store = getStore()
  const current = store.annotationsBySession.get(params.sessionToken) ?? []
  store.annotationsBySession.set(params.sessionToken, [row, ...current])
  await safeInsert('annotations', row)
  return row
}

export function listAnnotations(sessionToken: string): AnnotationRecord[] {
  return getStore().annotationsBySession.get(sessionToken) ?? []
}

export async function listAnnotationsWithFallback(
  sessionToken: string,
): Promise<AnnotationRecord[]> {
  const cached = listAnnotations(sessionToken)
  const fetched = await safeSelectMany<AnnotationRecord>('annotations', {
    session_token: sessionToken,
  })

  const merged = [...cached, ...fetched]
  const byId = new Map<string, AnnotationRecord>()
  for (const row of merged) {
    byId.set(row.id, row)
  }

  const sorted = Array.from(byId.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  getStore().annotationsBySession.set(sessionToken, sorted)
  return sorted
}

export async function removeAnnotation(params: {
  sessionToken: string
  annotationId: string
}): Promise<boolean> {
  const store = getStore()
  const existing = store.annotationsBySession.get(params.sessionToken) ?? []
  const next = existing.filter((row) => row.id !== params.annotationId)
  store.annotationsBySession.set(params.sessionToken, next)
  await safeDelete('annotations', {
    id: params.annotationId,
    session_token: params.sessionToken,
  })
  return next.length < existing.length
}

export async function addBookmark(params: {
  sessionToken: string
  devotionalSlug: string
  note: string | null
}): Promise<BookmarkRecord> {
  const row: BookmarkRecord = {
    id: randomUUID(),
    session_token: params.sessionToken,
    devotional_slug: params.devotionalSlug,
    note: params.note,
    created_at: new Date().toISOString(),
  }

  const store = getStore()
  const existing = store.bookmarksBySession.get(params.sessionToken) ?? []
  const filtered = existing.filter(
    (b) => b.devotional_slug !== row.devotional_slug,
  )
  store.bookmarksBySession.set(params.sessionToken, [row, ...filtered])
  await safeInsert('session_bookmarks', row)
  return row
}

export function listBookmarks(sessionToken: string): BookmarkRecord[] {
  const now = Date.now()
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  return (getStore().bookmarksBySession.get(sessionToken) ?? []).filter(
    (bookmark) =>
      now - new Date(bookmark.created_at).getTime() <= THIRTY_DAYS_MS,
  )
}

export async function listBookmarksWithFallback(
  sessionToken: string,
): Promise<BookmarkRecord[]> {
  const cached = listBookmarks(sessionToken)
  const fetched = await safeSelectMany<BookmarkRecord>('session_bookmarks', {
    session_token: sessionToken,
  })

  const merged = [...cached, ...fetched]
  const bySlug = new Map<string, BookmarkRecord>()
  for (const row of merged) {
    bySlug.set(row.devotional_slug, row)
  }

  const sorted = Array.from(bySlug.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  getStore().bookmarksBySession.set(sessionToken, sorted)
  return sorted
}

export async function removeBookmark(params: {
  sessionToken: string
  devotionalSlug: string
}): Promise<boolean> {
  const store = getStore()
  const existing = store.bookmarksBySession.get(params.sessionToken) ?? []
  const next = existing.filter(
    (row) => row.devotional_slug !== params.devotionalSlug,
  )
  store.bookmarksBySession.set(params.sessionToken, next)
  await safeDelete('session_bookmarks', {
    session_token: params.sessionToken,
    devotional_slug: params.devotionalSlug,
  })
  return next.length < existing.length
}
