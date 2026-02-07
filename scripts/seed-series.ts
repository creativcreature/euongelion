/**
 * Seed Script: Load all series and devotionals into Supabase
 *
 * Usage:
 *   npx tsx scripts/seed-series.ts
 *   npx tsx scripts/seed-series.ts --dry-run
 *   npx tsx scripts/seed-series.ts --substack-only
 *   npx tsx scripts/seed-series.ts --wakeup-only
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load .env.local
config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DRY_RUN = process.argv.includes('--dry-run')
const SUBSTACK_ONLY = process.argv.includes('--substack-only')
const WAKEUP_ONLY = process.argv.includes('--wakeup-only')

// ---------------------------------------------------------------------------
// Types for the JSON files
// ---------------------------------------------------------------------------

// Normalized shape after parsing any format
interface ParsedSeries {
  title: string
  subtitle?: string
  pathway: string
  coreQuestion: string
  booksOfFocus?: string[]
  totalDays: number
  soulAuditKeywords: string[]
  days: Array<{
    number: number
    title: string
    anchorVerse: string
    theme?: string
    modules: Array<{ type: string; content: Record<string, unknown> }>
  }>
}

/**
 * Parse any of the three JSON formats into a normalized shape:
 * 1. Standard: { series: {...}, days: [...] }
 * 2. Single-day: { series: {...}, day: {...}, modules: [...] }
 * 3. Flat: { slug, title, pathway, day_count, days: [...] }
 */
function parseSeriesJSON(raw: Record<string, unknown>): ParsedSeries {
  // Format 3: Flat (no "series" wrapper)
  if (!raw.series) {
    const days = (raw.days as Array<Record<string, unknown>>) || []
    return {
      title: raw.title as string,
      subtitle: raw.subtitle as string | undefined,
      pathway: (raw.pathway as string) || 'awake',
      coreQuestion: (raw.core_theme as string) || '',
      booksOfFocus: [],
      totalDays: (raw.day_count as number) || days.length,
      soulAuditKeywords: (raw.soul_audit_keywords as string[]) || [],
      days: days.map((d) => ({
        number: (d.day_number as number) || (d.number as number) || 1,
        title: (d.title as string) || 'Untitled',
        anchorVerse: (d.anchorVerse as string) || (d.anchor_verse as string) || 'See reading',
        theme: d.theme as string | undefined,
        modules: (d.modules as Array<{ type: string; content: Record<string, unknown> }>) || [],
      })),
    }
  }

  const series = raw.series as Record<string, unknown>

  // Format 2: Single-day ({ series, day, modules })
  if (raw.day && !raw.days) {
    const day = raw.day as Record<string, unknown>
    const modules = (raw.modules as Array<{ type: string; content: Record<string, unknown> }>) || []
    return {
      title: series.title as string,
      subtitle: series.subtitle as string | undefined,
      pathway: (series.pathway as string) || 'awake',
      coreQuestion: (series.coreQuestion as string) || '',
      booksOfFocus: (series.booksOfFocus as string[]) || [],
      totalDays: (series.totalDays as number) || 1,
      soulAuditKeywords:
        ((raw.metadata as Record<string, unknown>)?.soulAuditKeywords as string[]) || [],
      days: [
        {
          number: (day.number as number) || 1,
          title: (day.title as string) || 'Untitled',
          anchorVerse: (day.anchorVerse as string) || 'See reading',
          theme: day.theme as string | undefined,
          modules,
        },
      ],
    }
  }

  // Format 1: Standard ({ series, days: [...] })
  const days = (raw.days as Array<Record<string, unknown>>) || []
  return {
    title: series.title as string,
    subtitle: series.subtitle as string | undefined,
    pathway: (series.pathway as string) || 'awake',
    coreQuestion: (series.coreQuestion as string) || '',
    booksOfFocus: (series.booksOfFocus as string[]) || [],
    totalDays: (series.totalDays as number) || days.length,
    soulAuditKeywords:
      ((raw.metadata as Record<string, unknown>)?.soulAuditKeywords as string[]) || [],
    days: days.map((d) => ({
      number: (d.number as number) || 1,
      title: (d.title as string) || 'Untitled',
      anchorVerse: (d.anchorVerse as string) || 'See reading',
      theme: d.theme as string | undefined,
      modules: (d.modules as Array<{ type: string; content: Record<string, unknown> }>) || [],
    })),
  }
}

// ---------------------------------------------------------------------------
// Wake Up series (from src/data/series.ts)
// ---------------------------------------------------------------------------

const WAKE_UP_SERIES = [
  {
    slug: 'identity',
    name: 'Identity Crisis',
    question:
      'When everything that defined you is shaken, who are you?',
    framework:
      'Matthew 6:33 - Seek first the kingdom, and all these things will be added',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'identity', 'who am I', 'lost', 'confused', 'purpose',
      'meaning', 'crisis', 'shaken', 'uncertain',
    ],
  },
  {
    slug: 'peace',
    name: 'Peace',
    question: "What if peace isn't found by controlling your circumstances?",
    framework: 'John 14:27 - Peace I give you, not as the world gives',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'peace', 'anxiety', 'control', 'worry', 'fear', 'stress',
      'overwhelmed', 'restless', 'calm',
    ],
  },
  {
    slug: 'community',
    name: 'Community',
    question: 'Who are your people when systems fail?',
    framework: 'Matthew 18:20 - Where two or three gather in my name',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'lonely', 'alone', 'community', 'belonging', 'isolation',
      'friends', 'connection', 'people',
    ],
  },
  {
    slug: 'kingdom',
    name: 'Kingdom',
    question: "What if the kingdom you're looking for is already here?",
    framework:
      'Luke 17:21 + Matthew 6:33 - The kingdom is in your midst. Seek it first.',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'kingdom', 'politics', 'searching', 'refuge', 'government',
      'power', 'authority', 'change',
    ],
  },
  {
    slug: 'provision',
    name: 'Provision',
    question:
      "What if provision isn't about having enough, but sharing what you have?",
    framework:
      'Matthew 6:33 - Seek first the kingdom, and all these things will be added',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'money', 'provision', 'scarcity', 'finances', 'enough',
      'broke', 'inflation', 'economic', 'job',
    ],
  },
  {
    slug: 'truth',
    name: 'Truth',
    question: "How do you know what's real when misinformation is everywhere?",
    framework: 'John 14:6 - I am the way, the truth, and the life',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'truth', 'lies', 'misinformation', 'trust', 'media',
      'fake', 'reality', 'discernment',
    ],
  },
  {
    slug: 'hope',
    name: 'Hope',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    framework: 'Lamentations 3:22-23 - His mercies are new every morning',
    days: 5,
    pathway: 'sleep',
    keywords: [
      'hope', 'hopeless', 'despair', 'darkness', 'depression',
      'grief', 'loss', 'pessimistic', 'giving up',
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedSubstackSeries() {
  const seriesDir = join(__dirname, '..', 'content', 'series-json')
  const files = readdirSync(seriesDir).filter((f) => f.endsWith('.json'))

  console.log(`\nFound ${files.length} Substack series files`)

  for (const file of files) {
    const raw = readFileSync(join(seriesDir, file), 'utf-8')
    const data = parseSeriesJSON(JSON.parse(raw))
    const slug = file.replace('.json', '')

    console.log(`  ${slug} (${data.totalDays} days, ${data.days.length} with modules)`)

    if (DRY_RUN) continue

    // Upsert series
    const { data: series, error: seriesErr } = await supabase
      .from('series')
      .upsert(
        {
          name: data.title,
          slug,
          description: data.subtitle || data.coreQuestion,
          short_description: data.coreQuestion,
          duration_days: data.totalDays,
          pathway: data.pathway.toLowerCase(),
          soul_audit_keywords: data.soulAuditKeywords,
          core_question: data.coreQuestion,
          tags: data.booksOfFocus || [],
          is_published: true,
          is_premium: false,
          author: 'EUANGELION',
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single()

    if (seriesErr) {
      console.error(`    ERROR inserting series: ${seriesErr.message}`)
      continue
    }

    // Upsert devotionals for each day
    for (const day of data.days) {
      const devSlug = `${slug}-day-${day.number}`
      const scriptureRef = day.anchorVerse || 'See reading'

      const { error: devErr } = await supabase.from('devotionals').upsert(
        {
          series_id: series.id,
          title: day.title,
          slug: devSlug,
          content: day.title, // Placeholder — modules hold real content
          scripture_ref: scriptureRef,
          day_number: day.number,
          modules: day.modules,
          is_published: true,
          is_premium: false,
          author: 'EUANGELION',
        },
        { onConflict: 'slug' },
      )

      if (devErr) {
        console.error(
          `    ERROR inserting ${devSlug}: ${devErr.message}`,
        )
      }
    }

    console.log(`    ✓ ${data.days.length} days seeded`)
  }
}

async function seedWakeUpSeries() {
  console.log(`\nSeeding ${WAKE_UP_SERIES.length} Wake Up series`)

  for (const wu of WAKE_UP_SERIES) {
    console.log(`  wake-up-${wu.slug} (${wu.days} days)`)

    if (DRY_RUN) continue

    // Upsert series
    const { data: series, error: seriesErr } = await supabase
      .from('series')
      .upsert(
        {
          name: wu.name,
          slug: `wake-up-${wu.slug}`,
          description: wu.question,
          short_description: wu.framework,
          duration_days: wu.days,
          pathway: wu.pathway,
          soul_audit_keywords: wu.keywords,
          core_question: wu.question,
          is_published: true,
          is_premium: false,
          author: 'EUANGELION',
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single()

    if (seriesErr) {
      console.error(`    ERROR inserting series: ${seriesErr.message}`)
      continue
    }

    // Load devotional JSON from public/devotionals/
    for (let d = 1; d <= wu.days; d++) {
      const devSlug = `${wu.slug}-day-${d}`
      const jsonPath = join(
        __dirname,
        '..',
        'public',
        'devotionals',
        `${devSlug}.json`,
      )

      let modules = null
      let title = `Day ${d}`
      let scriptureRef = 'See reading'

      try {
        const raw = readFileSync(jsonPath, 'utf-8')
        const devData = JSON.parse(raw)
        title = devData.title || title
        scriptureRef = devData.scriptureRef || scriptureRef

        // Convert Wake Up panel format to modules if needed
        if (devData.modules) {
          modules = devData.modules
        } else if (devData.panels) {
          modules = devData.panels.map(
            (p: { type: string; [key: string]: unknown }) => ({
              type: p.type === 'text-with-image' ? 'teaching' : p.type,
              content: p,
            }),
          )
        }
      } catch {
        // JSON file may not exist yet — that's OK
      }

      const { error: devErr } = await supabase.from('devotionals').upsert(
        {
          series_id: series.id,
          title,
          slug: devSlug,
          content: title,
          scripture_ref: scriptureRef,
          day_number: d,
          modules,
          is_published: true,
          is_premium: false,
          author: 'EUANGELION',
        },
        { onConflict: 'slug' },
      )

      if (devErr) {
        console.error(`    ERROR inserting ${devSlug}: ${devErr.message}`)
      }
    }

    console.log(`    ✓ ${wu.days} days seeded`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  Euangelion — Database Seed Script')
  console.log('═══════════════════════════════════════════')
  if (DRY_RUN) console.log('  [DRY RUN — no database writes]')
  console.log()

  // Test connection
  const { error } = await supabase.from('series').select('id').limit(1)
  if (error) {
    console.error('Cannot connect to Supabase:', error.message)
    process.exit(1)
  }
  console.log('✓ Connected to Supabase')

  if (!WAKEUP_ONLY) await seedSubstackSeries()
  if (!SUBSTACK_ONLY) await seedWakeUpSeries()

  // Final count
  if (!DRY_RUN) {
    const { count: seriesCount } = await supabase
      .from('series')
      .select('*', { count: 'exact', head: true })
    const { count: devCount } = await supabase
      .from('devotionals')
      .select('*', { count: 'exact', head: true })

    console.log('\n═══════════════════════════════════════════')
    console.log(`  Total series: ${seriesCount}`)
    console.log(`  Total devotionals: ${devCount}`)
    console.log('═══════════════════════════════════════════')
  }

  console.log('\n✓ Seed complete')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
