#!/usr/bin/env npx tsx
/**
 * Image Generation Pipeline — Euangelion Visual System
 *
 * Generates editorial illustrations for all 35 Wake Up devotionals
 * plus the cover image (wU1.png), using the 5 documented visual directions:
 *
 *   A: Sacred Chiaroscuro — Caravaggio-style dramatic lighting
 *   B: Textured Minimalism — Kinfolk magazine aesthetic, quiet presence
 *   C: Risograph Sacred — Dithered/halftone, bold graphic, limited palette
 *   D: Bold Digital Collage — Afro-contemporary, deconstructed, vibrant
 *   E: HOLOGRAPHIK Swiss — Clean, bold, systematic, typography-forward
 *
 * Series are mapped to visual directions based on content type per
 * docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md and the hybrid recommendation.
 *
 * Brand palette (docs/BRANDING-REFINEMENT.md):
 *   Tehom Black #1A1612, Scroll White #F7F3ED, God is Gold #C19A6B
 *   Covenant Burgundy #6B2C2C, Gethsemane Olive #6B6B4F, Shalom Blue #4A5F6B
 *
 * Usage:
 *   npx tsx scripts/generate-illustrations.ts --backend gemini
 *   npx tsx scripts/generate-illustrations.ts --backend legnext
 *   npx tsx scripts/generate-illustrations.ts --backend gemini --dry-run
 *   npx tsx scripts/generate-illustrations.ts --backend gemini --skip-existing
 *   npx tsx scripts/generate-illustrations.ts --backend gemini --series identity
 *   npx tsx scripts/generate-illustrations.ts --backend gemini --cover-only
 *
 * Environment variables:
 *   GEMINI_API_KEY    — Google Gemini API key (for --backend gemini)
 *   LEGNEXT_API_KEY   — LegNext API key (for --backend legnext)
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Config ──────────────────────────────────────────────────────────

const MAX_CONCURRENT_LEGNEXT = 6
const MAX_CONCURRENT_GEMINI = 4
const POLL_INTERVAL_MS = 10_000
const MAX_RETRIES = 3
const DEVOTIONALS_DIR = path.resolve(__dirname, '../public/devotionals')

// ── Visual Directions ───────────────────────────────────────────────
// From docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md + project-hub.html

type VisualDirection = 'A' | 'B' | 'C' | 'D' | 'E'

interface DirectionConfig {
  name: string
  philosophy: string
  geminiStyle: string
  legnextStyle: string
  negativePrompt: string
  accentColor: string
}

const DIRECTIONS: Record<VisualDirection, DirectionConfig> = {
  // Direction A: Sacred Chiaroscuro
  // "Light breaking into darkness" — Caravaggio, Rembrandt, Georges de La Tour
  // Best for: contemplation, teaching, exposition, narrative
  A: {
    name: 'Sacred Chiaroscuro',
    philosophy: 'Light breaking into darkness',
    geminiStyle: [
      'Caravaggio-style chiaroscuro photograph,',
      'single-source warm directional lighting,',
      'deep enveloping shadows with subjects emerging from darkness,',
      'desaturated muted earth tones,',
      'rich blacks and controlled highlights,',
      'film grain texture,',
      'generous negative space,',
      'museum-quality dramatic lighting,',
      'contemplative sacred atmosphere,',
      'anonymous figures shown as silhouettes or hands only,',
      'timeless objects only — no modern elements.',
      'Square 1:1 aspect ratio.',
    ].join(' '),
    legnextStyle: [
      'Caravaggio-style chiaroscuro photograph,',
      'single-source warm directional lighting,',
      'deep enveloping shadows, subjects emerging from darkness,',
      'desaturated muted earth tones,',
      'rich blacks, film grain, museum-quality,',
      'contemplative sacred, anonymous figures,',
      'no modern objects',
      '--v 7 --s 200 --q 1',
    ].join(' '),
    negativePrompt:
      'Avoid: bright colors, multiple light sources, flat lighting, modern objects, phones, cars, recognizable faces, stock photo aesthetic, CGI look, lens flare, bokeh, cheerful, busy backgrounds, religious cliches, doves, glowing crosses',
    accentColor: '#C19A6B', // God is Gold
  },

  // Direction B: Textured Minimalism
  // "Quiet presence. Earned emptiness." — Kinfolk, Cereal, Japanese ma
  // Best for: Sabbath, rest, solitude, prayer, meditation, peace
  B: {
    name: 'Textured Minimalism',
    philosophy: 'Quiet presence, earned emptiness',
    geminiStyle: [
      'Kinfolk magazine aesthetic photograph,',
      'generous negative space with asymmetric composition,',
      'muted earth tones in near-monochrome palette,',
      'soft diffused natural light from window,',
      'natural material textures — linen, stone, paper, wood grain,',
      'partial gestural figures — a hand, a shoulder, turned away,',
      'quiet contemplative presence,',
      'intentional emptiness as meaning,',
      'editorial restraint.',
      'Square 1:1 aspect ratio.',
    ].join(' '),
    legnextStyle: [
      'Kinfolk magazine aesthetic, generous negative space,',
      'muted earth tones, soft natural light,',
      'natural textures — linen stone wood,',
      'partial figure hands only,',
      'quiet contemplative, editorial restraint,',
      'minimal composition, Japanese ma concept',
      '--v 7 --s 100 --q 1',
    ].join(' '),
    negativePrompt:
      'Avoid: bright colors, dramatic lighting, busy compositions, multiple subjects, modern objects, full figures with faces, saturated colors, digital artifacts, stock photo aesthetic',
    accentColor: '#4A5F6B', // Shalom Blue
  },

  // Direction C: Risograph Sacred
  // "Ancient texts through the xerox machine" — dithered, halftone, bold graphic
  // Best for: bold proclamation, doctrine, series branding, truth, kingdom
  C: {
    name: 'Risograph Sacred',
    philosophy: 'Ancient texts through the xerox machine',
    geminiStyle: [
      'Risograph screenprint illustration,',
      'limited two-color palette using deep black (#1A1612) and antique gold (#C19A6B),',
      'visible halftone dot pattern and dithered texture,',
      'bold graphic poster-like composition,',
      'high contrast with intentional texture grain,',
      'typography integrated into image,',
      'underground sacred zine aesthetic,',
      'stylized figures — more visible than photographic,',
      'not polished — raw and urgent.',
      'Square 1:1 aspect ratio.',
    ].join(' '),
    legnextStyle: [
      'Risograph print aesthetic,',
      'limited 2-color palette black and gold,',
      'halftone dots, dithered texture,',
      'bold graphic poster style,',
      'screenprint quality,',
      'underground sacred zine, raw texture,',
      'not polished, intentionally imperfect',
      '--v 7 --s 250 --q 1',
    ].join(' '),
    negativePrompt:
      'Avoid: photorealistic, smooth gradients, full color spectrum, soft focus, gentle lighting, corporate aesthetic, clean digital art, 3D rendering',
    accentColor: '#C19A6B', // God is Gold
  },

  // Direction D: Bold Digital Collage
  // "Vibrant. Deconstructed. Afro-contemporary." — mixed media, cultural heritage
  // Best for: proclamation with urgency, center-series pivots, special moments
  D: {
    name: 'Bold Digital Collage',
    philosophy: 'Vibrant, deconstructed, controlled chaos',
    geminiStyle: [
      'Bold digital collage illustration,',
      'mixed media combining geometric shapes with textured layers,',
      'deconstructed composition with controlled visual tension,',
      'limited palette of deep black (#1A1612), antique gold (#C19A6B), and warm cream (#F7F3ED),',
      'layered collage elements with visible paper texture,',
      'bold color blocking,',
      'sacred imagery reimagined through contemporary lens,',
      'not chaotic — intentional visual rhythm.',
      'Square 1:1 aspect ratio.',
    ].join(' '),
    legnextStyle: [
      'Bold digital collage, mixed media,',
      'geometric shapes with textured layers,',
      'deconstructed, controlled tension,',
      'black gold and cream palette,',
      'layered collage, visible paper texture,',
      'sacred imagery contemporary lens',
      '--v 7 --s 200 --q 1',
    ].join(' '),
    negativePrompt:
      'Avoid: photorealistic, single-style, smooth gradients, corporate design, clip art, generic religious imagery, bright neon colors, chaotic mess',
    accentColor: '#C19A6B', // God is Gold
  },

  // Direction E: HOLOGRAPHIK Swiss
  // "Clean. Bold. Systematic." — Swiss grid, typography as hero
  // Best for: cover images, typographic treatments, systematic layouts
  E: {
    name: 'HOLOGRAPHIK Swiss',
    philosophy: 'Clean, bold, systematic',
    geminiStyle: [
      'Swiss-style typographic design,',
      'bold sans-serif typography as primary visual element,',
      'deep brown-black background (#1A1612),',
      'single antique gold (#C19A6B) accent,',
      'systematic grid composition,',
      'generous whitespace creating elegance,',
      'premium dark-mode aesthetic,',
      'editorial magazine cover quality.',
      'Wide 16:9 aspect ratio.',
    ].join(' '),
    legnextStyle: [
      'Swiss-style typographic design,',
      'bold sans-serif type, deep dark background,',
      'single gold accent, systematic grid,',
      'premium dark-mode, editorial magazine cover',
      '--v 7 --s 150 --q 1 --ar 16:9',
    ].join(' '),
    negativePrompt:
      'Avoid: illustrations, photographs, busy backgrounds, multiple colors, decorative elements, religious imagery, gradients, 3D effects',
    accentColor: '#C19A6B', // God is Gold
  },
}

// ── Series → Visual Direction Mapping ───────────────────────────────
// Based on hybrid recommendation: content type determines visual direction
// From docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md + ARTIST.md

interface SeriesVisualConfig {
  direction: VisualDirection
  accentColor: string // Theological accent color override
  subjectGuidance: string // From ARTIST.md content-to-image mapping
}

const SERIES_VISUAL_MAP: Record<string, SeriesVisualConfig> = {
  // Identity: narrative about shaking ground, stripped identity, darkness
  // ARTIST.md: "Mirror fragment, reflection in water, shadow self"
  'identity-crisis': {
    direction: 'A',
    accentColor: '#6B6B4F', // Gethsemane Olive — wilderness, wrestling
    subjectGuidance:
      'Subjects: mirror fragments, reflections in water, shadow figures, cracked surfaces, stripped masks. Mood: unsettling revelation, identity dissolving.',
  },

  // Peace: contemplative, rest, surrender, calm
  // ARTIST.md mapped via "Sabbath/rest" → Direction B
  peace: {
    direction: 'B',
    accentColor: '#4A5F6B', // Shalom Blue — peace, Spirit, water
    subjectGuidance:
      'Subjects: still water, open windows, single breath visible in air, hands releasing, empty space. Mood: quiet surrender, exhaling tension.',
  },

  // Community: narrative, relational, shared light
  // ARTIST.md: "Two cups, intertwined branches, shared bread"
  community: {
    direction: 'A',
    accentColor: '#C19A6B', // God is Gold — warmth, connection
    subjectGuidance:
      'Subjects: shared bread, two cups on table, intertwined branches, doorways with light, gathered hands. Mood: intimate belonging, warm shared light.',
  },

  // Kingdom: bold proclamation, CENTER series — the most visually striking
  // This is the chiastic center of all 7 series. Use bold direction.
  kingdom: {
    direction: 'C',
    accentColor: '#C19A6B', // God is Gold — divine kingdom
    subjectGuidance:
      'Subjects: upside-down crown, throne becoming footwashing basin, hands serving, light breaking through institutional cracks. Mood: radical reversal, urgent proclamation.',
  },

  // Provision: teaching about sharing vs hoarding, God's economy
  // ARTIST.md: "Purpose → Hands at work, tools laid out, seeds planted"
  provision: {
    direction: 'A',
    accentColor: '#C19A6B', // God is Gold — divine provision
    subjectGuidance:
      'Subjects: bread being broken and shared, open hands offering, seeds scattered on soil, overflowing baskets, table set for many. Mood: generous abundance from surrender.',
  },

  // Truth: teaching/exposition about discerning truth in chaos
  // Use Risograph for bold proclamation quality
  truth: {
    direction: 'C',
    accentColor: '#C19A6B', // God is Gold
    subjectGuidance:
      'Subjects: single candle in darkness, ancient scroll with light falling on it, fog clearing to reveal path, compass on worn map. Mood: clarity emerging from chaos, revelation.',
  },

  // Hope: darkness-to-light narrative, Gethsemane, cross, resurrection
  // ARTIST.md: "Loss/Grief → Single candle, empty vessel, dried flower"
  hope: {
    direction: 'A',
    accentColor: '#6B2C2C', // Covenant Burgundy — sacrifice, cross, Passover
    subjectGuidance:
      'Subjects: garden at night, dawn light breaking, single thorn, stone rolled aside (edge of frame), morning dew. Mood: terror transforming into faithful trust, darkness yielding to first light.',
  },
}

// Day 3 (chiastic center) gets special treatment across all series
const DAY_3_DIRECTION_OVERRIDE: VisualDirection = 'D' // Bold Digital Collage for pivot moments

// ── Brand Negative Prompt ───────────────────────────────────────────
// From docs/IMAGE-STRATEGY.md anti-patterns + ARTIST.md quality checklist

const BRAND_NEGATIVE_PROMPT = [
  'Never include: modern objects (phones, laptops, cars, branded items),',
  'recognizable human faces (keep anonymous — silhouettes, partial views, hands),',
  'bright saturated colors, multiple light sources,',
  'stock photo aesthetic, overly smooth skin, perfect symmetry,',
  'impossible anatomy, muddled text, too many details,',
  'cliche Christian imagery (glowing crosses, doves, rays from clouds, person on mountaintop),',
  'sentimental or cheerful mood, flat even lighting,',
  'CGI look, digital artifacts, lens flare, bokeh overload, HDR over-processing.',
].join(' ')

// ── Types ───────────────────────────────────────────────────────────

type Backend = 'gemini' | 'legnext'

interface IllustrationJob {
  slug: string
  file: string
  description: string
  prompt: string
  direction: VisualDirection
  directionName: string
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
const backendFlag = args.indexOf('--backend')
const BACKEND: Backend =
  backendFlag !== -1 && args[backendFlag + 1] === 'legnext' ? 'legnext' : 'gemini'

// ── API Keys ────────────────────────────────────────────────────────

function getApiKey(backend: Backend): string {
  if (backend === 'gemini') {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      console.error('Error: GEMINI_API_KEY not set.')
      process.exit(1)
    }
    return key
  }
  const key = process.env.LEGNEXT_API_KEY
  if (!key) {
    console.error('Error: LEGNEXT_API_KEY not set.')
    process.exit(1)
  }
  return key
}

// ── Prompt Construction ─────────────────────────────────────────────

function extractSubject(description: string): string {
  // Strip common prefixes from devotional JSON descriptions
  return description
    .replace(/^Dithered image of\s*/i, '')
    .replace(/^Image of\s*/i, '')
    .replace(/^Illustration of\s*/i, '')
    .trim()
}

function getSeriesKey(slug: string): string {
  // identity-crisis-day-1 → identity-crisis
  // peace-day-3 → peace
  return slug.replace(/-day-\d+$/, '')
}

function getDayNumber(slug: string): number {
  const match = slug.match(/-day-(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

function buildPrompt(
  description: string,
  slug: string,
  backend: Backend,
): { prompt: string; direction: VisualDirection; directionName: string } {
  const seriesKey = getSeriesKey(slug)
  const dayNumber = getDayNumber(slug)
  const subject = extractSubject(description)

  // Look up series visual config, fall back to Direction A
  const seriesConfig = SERIES_VISUAL_MAP[seriesKey] || {
    direction: 'A' as VisualDirection,
    accentColor: '#C19A6B',
    subjectGuidance: '',
  }

  // Day 3 (chiastic center) uses Bold Digital Collage for visual emphasis
  const direction =
    dayNumber === 3 ? DAY_3_DIRECTION_OVERRIDE : seriesConfig.direction
  const dirConfig = DIRECTIONS[direction]

  // Build the prompt following ARTIST.md structure:
  // [Subject/Scene], [Lighting/Style], [Mood], [Color treatment], [Composition], [Avoid]
  const styleBlock =
    backend === 'gemini' ? dirConfig.geminiStyle : dirConfig.legnextStyle

  const promptParts: string[] = []

  // Subject from the devotional JSON description
  promptParts.push(subject + '.')

  // Series-specific subject guidance from ARTIST.md mapping
  if (seriesConfig.subjectGuidance) {
    promptParts.push(seriesConfig.subjectGuidance)
  }

  // Visual direction style
  promptParts.push(styleBlock)

  // Brand color integration
  if (backend === 'gemini') {
    promptParts.push(
      `Color palette: primarily deep black (#1A1612) with accent ${seriesConfig.accentColor}. Desaturated earth tones, muted, never bright.`,
    )
  }

  // Negative prompt (Gemini uses text, LegNext uses --no flag)
  if (backend === 'gemini') {
    promptParts.push(dirConfig.negativePrompt)
    promptParts.push(BRAND_NEGATIVE_PROMPT)
  } else {
    // LegNext/Midjourney: append key negative terms with --no
    promptParts.push(
      '--no modern objects, phones, bright colors, multiple light sources, recognizable faces, stock photo, CGI, lens flare, religious cliches, doves, glowing crosses',
    )
  }

  return {
    prompt: promptParts.join('\n'),
    direction,
    directionName: dirConfig.name,
  }
}

// ── Gemini Nanobanana API ───────────────────────────────────────────

async function generateWithGemini(
  prompt: string,
  apiKey: string,
  destPath: string,
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const candidates = data.candidates
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini returned no candidates')
  }

  const parts = candidates[0].content?.parts || []
  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData,
  )

  if (!imagePart?.inlineData?.data) {
    const textParts = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join(' ')
    throw new Error(
      `Gemini returned no image data. Text response: ${textParts.slice(0, 200)}`,
    )
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
  fs.writeFileSync(destPath, buffer)
}

// ── LegNext Midjourney API ──────────────────────────────────────────

const LEGNEXT_BASE = 'https://api.legnext.ai/api/v1'

async function submitLegnext(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${LEGNEXT_BASE}/diffusion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ text: prompt }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LegNext API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.job_id
}

async function pollLegnext(jobId: string, apiKey: string): Promise<string> {
  const maxPolls = 60
  for (let i = 0; i < maxPolls; i++) {
    await sleep(POLL_INTERVAL_MS)

    const res = await fetch(`${LEGNEXT_BASE}/job/${jobId}`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Poll API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const status = data.status?.toLowerCase()

    if (status === 'completed' || status === 'complete' || status === 'done') {
      const imageUrl =
        data.output?.image_url ||
        data.output?.image_urls?.[0] ||
        data.imageUrl ||
        data.image_url
      if (!imageUrl) throw new Error('Job completed but no image URL returned')
      return imageUrl
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(
        `Job failed: ${data.error || data.message || 'Unknown error'}`,
      )
    }

    process.stdout.write('.')
  }

  throw new Error('Job timed out after 10 minutes')
}

async function generateWithLegnext(
  prompt: string,
  apiKey: string,
  destPath: string,
): Promise<void> {
  const jobId = await submitLegnext(prompt, apiKey)
  process.stdout.write(` job=${jobId} polling`)

  const imageUrl = await pollLegnext(jobId, apiKey)
  console.log(` downloading...`)

  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Job Collection ──────────────────────────────────────────────────

function collectJobs(backend: Backend): IllustrationJob[] {
  const jobs: IllustrationJob[] = []
  const jsonFiles = fs
    .readdirSync(DEVOTIONALS_DIR)
    .filter((f) => f.endsWith('.json'))

  // Exclude legacy day-N.json files
  const seriesFiles = jsonFiles.filter((f) => !f.match(/^day-\d+\.json$/))

  for (const file of seriesFiles) {
    const filePath = path.join(DEVOTIONALS_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const slug = file.replace('.json', '')

    if (SERIES_FILTER && !slug.startsWith(SERIES_FILTER)) continue

    for (const panel of data.panels) {
      if (panel.illustration) {
        const { description, file: imgFile } = panel.illustration
        const { prompt, direction, directionName } = buildPrompt(
          description,
          slug,
          backend,
        )
        jobs.push({
          slug,
          file: imgFile,
          description,
          prompt,
          direction,
          directionName,
        })
      }
    }
  }

  return jobs
}

// ── Process a Single Job ────────────────────────────────────────────

async function processJob(
  job: IllustrationJob,
  apiKey: string,
  backend: Backend,
  index: number,
  total: number,
): Promise<JobResult> {
  const destPath = path.join(DEVOTIONALS_DIR, job.file)

  if (SKIP_EXISTING && fs.existsSync(destPath)) {
    console.log(`  [${index + 1}/${total}] SKIP (exists): ${job.file}`)
    return { slug: job.slug, file: job.file, success: true }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      process.stdout.write(
        `  [${index + 1}/${total}] ${job.file} [${job.directionName}] (attempt ${attempt})`,
      )

      if (backend === 'gemini') {
        await generateWithGemini(job.prompt, apiKey, destPath)
      } else {
        await generateWithLegnext(job.prompt, apiKey, destPath)
      }

      console.log(` ✓`)
      return { slug: job.slug, file: job.file, success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`\n  ✗ Attempt ${attempt} failed: ${msg}`)

      if (attempt < MAX_RETRIES) {
        const wait = backend === 'gemini' ? 3000 : 5000
        console.log(`    Retrying in ${wait / 1000}s...`)
        await sleep(wait)
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

// ── Batch Processor ─────────────────────────────────────────────────

async function runBatch(
  jobs: IllustrationJob[],
  apiKey: string,
  backend: Backend,
): Promise<JobResult[]> {
  const results: JobResult[] = []
  const total = jobs.length
  const maxConcurrent =
    backend === 'gemini' ? MAX_CONCURRENT_GEMINI : MAX_CONCURRENT_LEGNEXT

  for (let i = 0; i < jobs.length; i += maxConcurrent) {
    const batch = jobs.slice(i, i + maxConcurrent)
    console.log(
      `\n── Batch ${Math.floor(i / maxConcurrent) + 1} (${batch.length} jobs) ──`,
    )

    const batchResults = await Promise.all(
      batch.map((job, batchIndex) =>
        processJob(job, apiKey, backend, i + batchIndex, total),
      ),
    )

    results.push(...batchResults)

    if (i + maxConcurrent < jobs.length) {
      const pause = backend === 'gemini' ? 1000 : 2000
      console.log(`  Pausing ${pause / 1000}s between batches...`)
      await sleep(pause)
    }
  }

  return results
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Euangelion — Visual Illustration Pipeline')
  console.log('  5 Visual Directions × 7 Series × 5 Days')
  console.log('═══════════════════════════════════════════════════════')
  console.log()
  console.log(
    `  BACKEND:  ${BACKEND === 'gemini' ? 'Gemini Nanobanana (2.5 Flash)' : 'LegNext Midjourney v7'}`,
  )
  if (DRY_RUN) console.log('  MODE:     DRY RUN (no API calls)')
  if (SKIP_EXISTING) console.log('  MODE:     Skip existing images')
  if (SERIES_FILTER) console.log(`  FILTER:   Series "${SERIES_FILTER}"`)
  if (COVER_ONLY) console.log('  MODE:     Cover image only')
  console.log()

  // Show direction mapping
  console.log('── Visual Direction Mapping ──')
  for (const [series, config] of Object.entries(SERIES_VISUAL_MAP)) {
    const dir = DIRECTIONS[config.direction]
    console.log(
      `  ${series.padEnd(18)} → ${config.direction}: ${dir.name} (accent: ${config.accentColor})`,
    )
  }
  console.log(`  ${'Day 3 (all)'.padEnd(18)} → ${DAY_3_DIRECTION_OVERRIDE}: ${DIRECTIONS[DAY_3_DIRECTION_OVERRIDE].name} (chiastic pivot)`)
  console.log()

  const apiKey = DRY_RUN ? 'dry-run' : getApiKey(BACKEND)

  // ── Cover Image ──
  if (!SERIES_FILTER || COVER_ONLY) {
    const coverPath = path.join(DEVOTIONALS_DIR, 'wU1.png')
    const coverExists = fs.existsSync(coverPath)

    if (COVER_ONLY || !coverExists || !SKIP_EXISTING) {
      console.log('── Cover Image (Direction E: HOLOGRAPHIK Swiss) ──')
      const coverDir = DIRECTIONS['E']
      const coverPrompt =
        BACKEND === 'gemini' ? coverDir.geminiStyle : coverDir.legnextStyle
      const fullCoverPrompt = `WAKE UP magazine cover. ${coverPrompt}\n${coverDir.negativePrompt}`

      const coverJob: IllustrationJob = {
        slug: 'cover',
        file: 'wU1.png',
        description: 'Wake Up cover',
        prompt: fullCoverPrompt,
        direction: 'E',
        directionName: 'HOLOGRAPHIK Swiss',
      }

      if (DRY_RUN) {
        console.log(`  DIRECTION: E — HOLOGRAPHIK Swiss`)
        console.log(`  PROMPT:\n    ${coverJob.prompt.replace(/\n/g, '\n    ')}`)
        console.log(`  OUTPUT: ${coverJob.file}`)
      } else if (SKIP_EXISTING && coverExists) {
        console.log('  SKIP (exists): wU1.png')
      } else {
        const result = await processJob(coverJob, apiKey, BACKEND, 0, 1)
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
  const jobs = collectJobs(BACKEND)
  console.log(`Found ${jobs.length} illustrations to generate.`)

  // Show direction distribution
  const dirCounts: Record<string, number> = {}
  for (const job of jobs) {
    const key = `${job.direction}: ${job.directionName}`
    dirCounts[key] = (dirCounts[key] || 0) + 1
  }
  for (const [dir, count] of Object.entries(dirCounts)) {
    console.log(`  ${dir} — ${count} images`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('── Prompts Preview ──')
    for (const job of jobs) {
      console.log(`\n  ${job.file} [${job.direction}: ${job.directionName}]:`)
      console.log(`    Subject: ${job.description}`)
      console.log(`    Prompt:\n      ${job.prompt.replace(/\n/g, '\n      ')}`)
    }
    console.log(
      `\n\nDry run complete. ${jobs.length} images would be generated.`,
    )
    return
  }

  const results = await runBatch(jobs, apiKey, BACKEND)

  // ── Summary ──
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  console.log('\n═══════════════════════════════════════════════════════')
  console.log(`  RESULTS: ${succeeded}/${results.length} succeeded`)
  if (failed.length > 0) {
    console.log('  FAILED:')
    for (const f of failed) {
      console.log(`    - ${f.file}: ${f.error}`)
    }
  }
  console.log('═══════════════════════════════════════════════════════')

  const resultsPath = path.join(
    DEVOTIONALS_DIR,
    '..',
    'illustration-results.json',
  )
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        backend: BACKEND,
        visualDirections: Object.fromEntries(
          Object.entries(DIRECTIONS).map(([k, v]) => [k, v.name]),
        ),
        seriesMapping: Object.fromEntries(
          Object.entries(SERIES_VISUAL_MAP).map(([k, v]) => [
            k,
            `${v.direction}: ${DIRECTIONS[v.direction].name}`,
          ]),
        ),
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
