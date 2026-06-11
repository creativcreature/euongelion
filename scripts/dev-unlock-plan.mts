// Dev utility: unlock a plan's Day 1 (cycle_start = now) so date-gated
// features (reader, Deep Dive) can be exercised locally without waiting for
// the Monday cycle. NEVER run against production data you care about.
//
//   npx tsx scripts/dev-unlock-plan.mts <plan_token>
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const token = process.argv[2]
if (!token) {
  console.error('usage: npx tsx scripts/dev-unlock-plan.mts <plan_token>')
  process.exit(1)
}
const { data: plan, error: planError } = await sb
  .from('devotional_plan_instances')
  .select('*')
  .eq('plan_token', token)
  .single()
if (planError || !plan) {
  console.error('plan not found for token', token, planError?.message ?? '')
  process.exit(1)
}
const now = new Date()
const schedule = Array.isArray(plan.schedule)
  ? (plan.schedule as Array<Record<string, unknown>>).map((entry, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      return {
        ...entry,
        unlock_at:
          i === 0
            ? new Date(now.getTime() - 3600_000).toISOString()
            : d.toISOString(),
        status: i === 0 ? 'unlocked' : entry.status,
      }
    })
  : plan.schedule
const { error } = await sb
  .from('devotional_plan_instances')
  .update({
    cycle_start_at: new Date(now.getTime() - 3600_000).toISOString(),
    started_at: new Date(now.getTime() - 3600_000).toISOString(),
    schedule,
  })
  .eq('plan_token', token)
console.log(
  error ? `error: ${error.message}` : `unlocked Day 1 for plan ${token}`,
)
