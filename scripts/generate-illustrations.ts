#!/usr/bin/env npx tsx
/**
 * Image Generation Pipeline — LegNext Midjourney API
 *
 * Generates editorial dithered halftone illustrations for all 35 Wake Up devotionals
 * plus the cover image (wU1.png).
 *
 * Usage:
 *   npx tsx scripts/generate-illustrations.ts
 *   npx tsx scripts/generate-illustrations.ts --dry-run
 *   npx tsx scripts/generate-illustrations.ts --skip-existing
 *   npx tsx scripts/generate-illustrations.ts --series identity
 *   npx tsx scripts/generate-illustrations.ts --cover-only
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Config ──────────────────────────────────────────────────────────

const BASE_URL = 'https://api.legnext.ai/api/v1'
const MAX_CONCURRENT = 6
const POLL_INTERVAL_MS = 10_000
const MAX_RETRIES = 3
const DEVOTIONALS_DIR = path.resolve(__dirname, '../public/devotionals')

const STYLE_SUFFIX = `Style: editorial dithered halftone illustration, dark moody atmosphere, single warm accent tone similar to antique gold, high contrast, minimal detail, textured grain, abstract, suitable for devotional spiritual publication --v 7 --s 150 --q 1`

const COVER_PROMPT = `WAKE UP typographic cover, bold sans-serif text on deep brown-black background, single gold accent line, editorial magazine aesthetic, minimal --v 7 --ar 16:9`

// ── Types ───────────────────────────────────────────────────────────

interface IllustrationJob {
  slug: string
  file: string
  description: string
  prompt: string
}

interface JobResult {
  slug: string
  file: string
  success: boolean
  error?: string
}

// ── CLI Flags ───────────────────────────────────────────────────────

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_EXISTING = args.includes('--skip-existing')
const COVER_ONLY = args.includes('--cover-only')
const seriesFlag = args.indexOf('--series')
const SERIES_FILTER = seriesFlag !== -1 ? args[seriesFlag + 1] : null

// ── API Key ─────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.LEGNEXT_API_KEY
  if (!key) {
    console.error('Error: LEGNEXT_API_KEY not set. Add it to .env.local')
    process.exit(1)
  }
  return key
}

// ── API Helpers ─────────────────────────────────────────────────────

async function submitImagine(prompt: string, apiKey: string, aspectRatio = '1:1'): Promise<string> {
  const res = await fetch(`${BASE_URL}/imagine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      prompt,
      model: 'mj-7',
      mode: 'fast',
      aspectRatio,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Imagine API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.jobId || data.job_id
}

async function pollJob(jobId: string, apiKey: string): Promise<string> {
  const maxPolls = 60 // 10 minutes max
  for (let i = 0; i < maxPolls; i++) {
    await sleep(POLL_INTERVAL_MS)

    const res = await fetch(`${BASE_URL}/get-job?jobId=${jobId}`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Poll API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const status = data.status?.toLowerCase()

    if (status === 'completed' || status === 'complete' || status === 'done') {
      const imageUrl = data.imageUrl || data.image_url || data.result?.imageUrl
      if (!imageUrl) throw new Error('Job completed but no image URL returned')
      return imageUrl
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Job failed: ${data.error || data.message || 'Unknown error'}`)
    }

    // Still processing, continue polling
    process.stdout.write('.')
  }

  throw new Error('Job timed out after 10 minutes')
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Job Collection ──────────────────────────────────────────────────

function collectJobs(): IllustrationJob[] {
  const jobs: IllustrationJob[] = []
  const jsonFiles = fs.readdirSync(DEVOTIONALS_DIR).filter((f) => f.endsWith('.json'))

  // Filter to only series devotionals (exclude legacy day-N.json files)
  const seriesFiles = jsonFiles.filter((f) => !f.match(/^day-\d+\.json$/))

  for (const file of seriesFiles) {
    const filePath = path.join(DEVOTIONALS_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const slug = file.replace('.json', '')

    // Check series filter
    if (SERIES_FILTER && !slug.startsWith(SERIES_FILTER)) continue

    for (const panel of data.panels) {
      if (panel.illustration) {
        const { description, file: imgFile } = panel.illustration
        jobs.push({
          slug,
          file: imgFile,
          description,
          prompt: `${description}. ${STYLE_SUFFIX}`,
        })
      }
    }
  }

  return jobs
}

// ── Batch Processor ─────────────────────────────────────────────────

async function processJob(
  job: IllustrationJob,
  apiKey: string,
  index: number,
  total: number,
  aspectRatio = '1:1',
): Promise<JobResult> {
  const destPath = path.join(DEVOTIONALS_DIR, job.file)

  if (SKIP_EXISTING && fs.existsSync(destPath)) {
    console.log(`  [${index + 1}/${total}] SKIP (exists): ${job.file}`)
    return { slug: job.slug, file: job.file, success: true }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      process.stdout.write(`  [${index + 1}/${total}] ${job.file} (attempt ${attempt})`)

      const jobId = await submitImagine(job.prompt, apiKey, aspectRatio)
      process.stdout.write(` jobId=${jobId} polling`)

      const imageUrl = await pollJob(jobId, apiKey)
      console.log(` downloading...`)

      await downloadImage(imageUrl, destPath)
      console.log(`  ✓ Saved: ${job.file}`)

      return { slug: job.slug, file: job.file, success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ Attempt ${attempt} failed: ${msg}`)

      if (attempt < MAX_RETRIES) {
        console.log(`    Retrying in 5s...`)
        await sleep(5000)
      }
    }
  }

  return {
    slug: job.slug,
    file: job.file,
    success: false,
    error: `Failed after ${MAX_RETRIES} attempts`,
  }
}

async function runBatch(jobs: IllustrationJob[], apiKey: string): Promise<JobResult[]> {
  const results: JobResult[] = []
  const total = jobs.length

  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < jobs.length; i += MAX_CONCURRENT) {
    const batch = jobs.slice(i, i + MAX_CONCURRENT)
    console.log(`\n── Batch ${Math.floor(i / MAX_CONCURRENT) + 1} (${batch.length} jobs) ──`)

    const batchResults = await Promise.all(
      batch.map((job, batchIndex) => processJob(job, apiKey, i + batchIndex, total)),
    )

    results.push(...batchResults)

    // Brief pause between batches to respect rate limits
    if (i + MAX_CONCURRENT < jobs.length) {
      console.log('  Pausing 2s between batches...')
      await sleep(2000)
    }
  }

  return results
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  Wake Up — Illustration Generation Pipeline')
  console.log('═══════════════════════════════════════════════')
  console.log()

  if (DRY_RUN) console.log('  MODE: DRY RUN (no API calls)')
  if (SKIP_EXISTING) console.log('  MODE: Skip existing images')
  if (SERIES_FILTER) console.log(`  FILTER: Series "${SERIES_FILTER}"`)
  if (COVER_ONLY) console.log('  MODE: Cover image only')
  console.log()

  const apiKey = DRY_RUN ? 'dry-run' : getApiKey()

  // ── Cover Image ──
  if (!SERIES_FILTER || COVER_ONLY) {
    const coverPath = path.join(DEVOTIONALS_DIR, 'wU1.png')
    const coverExists = fs.existsSync(coverPath)

    if (COVER_ONLY || !coverExists || !SKIP_EXISTING) {
      console.log('── Cover Image ──')
      const coverJob: IllustrationJob = {
        slug: 'cover',
        file: 'wU1.png',
        description: 'Wake Up cover',
        prompt: COVER_PROMPT,
      }

      if (DRY_RUN) {
        console.log(`  PROMPT: ${coverJob.prompt}`)
        console.log(`  OUTPUT: ${coverJob.file} (16:9)`)
      } else if (SKIP_EXISTING && coverExists) {
        console.log('  SKIP (exists): wU1.png')
      } else {
        const result = await processJob(coverJob, apiKey, 0, 1, '16:9')
        if (!result.success) {
          console.log(`  ✗ Cover generation failed: ${result.error}`)
        }
      }
      console.log()
    }
  }

  if (COVER_ONLY) {
    console.log('Done (cover only).')
    return
  }

  // ── Devotional Illustrations ──
  const jobs = collectJobs()
  console.log(`Found ${jobs.length} illustrations to generate.`)
  console.log()

  if (DRY_RUN) {
    console.log('── Prompts Preview ──')
    for (const job of jobs) {
      console.log(`\n  ${job.file}:`)
      console.log(`    ${job.prompt}`)
    }
    console.log(`\n\nDry run complete. ${jobs.length} images would be generated.`)
    return
  }

  const results = await runBatch(jobs, apiKey)

  // ── Summary ──
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  console.log('\n═══════════════════════════════════════════════')
  console.log(`  RESULTS: ${succeeded}/${results.length} succeeded`)
  if (failed.length > 0) {
    console.log('  FAILED:')
    for (const f of failed) {
      console.log(`    - ${f.file}: ${f.error}`)
    }
  }
  console.log('═══════════════════════════════════════════════')

  // Write results JSON for audit
  const resultsPath = path.join(DEVOTIONALS_DIR, '..', 'illustration-results.json')
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: results.length,
        succeeded,
        failed: failed.length,
        results,
      },
      null,
      2,
    ),
  )
  console.log(`\nResults saved to: ${resultsPath}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
