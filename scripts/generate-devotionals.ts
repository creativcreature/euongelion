/**
 * AI Devotional Generation Pipeline
 *
 * Generates devotional content using Claude API following:
 * - Chiastic structure (A-B-C-B'-A')
 * - PaRDeS 4-level interpretation (Plain, Hint, Search, Secret)
 * - 12 module types per devotional
 * - Nicene Creed orthodoxy baseline
 *
 * Usage:
 *   npx tsx scripts/generate-devotionals.ts --series identity --day 1
 *   npx tsx scripts/generate-devotionals.ts --series identity --all
 *
 * Requires: ANTHROPIC_API_KEY in .env.local
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local')
  process.exit(1)
}

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'devotionals')

interface SeriesConfig {
  slug: string
  title: string
  question: string
  framework: string
  days: Array<{
    day: number
    title: string
    slug: string
    chiasticPosition: string
    theme: string
  }>
}

// Chiastic structure labels
const CHIASTIC_POSITIONS = ['A', 'B', 'C', "B'", "A'"] as const

const SYSTEM_PROMPT = `You are a devotional writer for EUONGELION, a Christian devotional platform.

VOICE:
- 60% warm, 40% authoritative
- No exclamation marks
- No clichés ("God is good all the time", "Let go and let God")
- Honest about difficulty, not saccharine
- Intelligent but not academic
- Like a thoughtful pastor who reads widely

THEOLOGICAL FRAMEWORK:
- Nicene Creed orthodoxy as baseline
- All major traditions fairly represented (Evangelical, Reformed, Catholic, Orthodox, Charismatic, Anabaptist)
- Scripture is primary; external voices support
- Acknowledge uncertainty where it exists

STRUCTURE:
Each devotional follows PaRDeS interpretation:
- Peshat (Plain): What does the text literally say?
- Remez (Hint): What deeper patterns emerge?
- Derash (Search): What does this mean for life today?
- Sod (Secret): What mystery does this point toward?

And a Chiastic arc across the 5-day series:
- Day 1 (A): Sets the problem, introduces the tension
- Day 2 (B): Deepens the exploration, adds complexity
- Day 3 (C): The pivot — the core revelation everything builds toward
- Day 4 (B'): Mirrors Day 2 — practical application of the revelation
- Day 5 (A'): Mirrors Day 1 — resolution, but transformed

CONTENT RULES:
- Every Scripture reference must be real and accurate
- Every quote must be real and attributed correctly
- Hebrew/Greek words must be linguistically accurate
- Historical claims must be verifiable
- 3,000-4,000 words per devotional
- Always connect to the meta-story of God's reconciliation

OUTPUT FORMAT:
Return valid JSON matching this structure exactly:
{
  "day": <number>,
  "title": "<title>",
  "teaser": "<1-2 sentence teaser>",
  "framework": "<Scripture reference>",
  "chiastic_position": "<A|B|C|B'|A'>",
  "totalWords": <approximate word count>,
  "scriptureReference": "<primary Scripture>",
  "modules": [
    { "type": "scripture", "heading": "TODAY'S READING", "passage": "<full passage text>", "reference": "<book chapter:verses>", "translation": "NIV" },
    { "type": "teaching", "heading": "<heading>", "content": "<paragraphs separated by double newlines>" },
    { "type": "vocab", "heading": "WORD STUDY", "word": "<Hebrew/Greek word>", "transliteration": "<pronunciation>", "language": "hebrew|greek", "definition": "<meaning>", "usage": "<how it's used in context>" },
    { "type": "story", "heading": "<heading>", "content": "<narrative illustration>" },
    { "type": "insight", "heading": "KEY INSIGHT", "content": "<core theological insight>" },
    { "type": "bridge", "heading": "BRIDGE TO CHRIST", "content": "<connection to Jesus/NT>" },
    { "type": "reflection", "heading": "REFLECT", "prompt": "<journaling prompt>" },
    { "type": "comprehension", "heading": "CHECK YOUR UNDERSTANDING", "question": "<question>", "options": ["<a>", "<b>", "<c>", "<d>"], "answer": <0-3>, "explanation": "<why>" },
    { "type": "takeaway", "heading": "TAKEAWAY", "content": "<summary application point>" },
    { "type": "prayer", "heading": "PRAYER", "prayerText": "<guided prayer>", "breathPrayer": "<short breath prayer>" },
    { "type": "profile", "heading": "HISTORICAL FIGURE", "name": "<name>", "era": "<time period>", "bio": "<2-3 paragraphs>" },
    { "type": "resource", "heading": "FURTHER READING", "resources": [{ "title": "<book/article>", "description": "<why it's relevant>" }] }
  ],
  "panels": [
    { "number": 1, "type": "cover", "content": "<series title>", "image": "" },
    { "number": 2, "heading": "<heading>", "type": "text", "content": "<combined teaching content for legacy panel view>", "wordCount": <count> },
    { "number": 3, "heading": "<heading>", "type": "text", "content": "<continued content>", "wordCount": <count> },
    { "number": 4, "heading": "THE INVITATION", "type": "prayer", "content": "<prayer text>", "wordCount": <count> }
  ]
}

IMPORTANT: Return ONLY the JSON. No markdown, no backticks, no commentary.`

async function generateDevotional(
  series: SeriesConfig,
  dayConfig: SeriesConfig['days'][0],
): Promise<void> {
  console.log(`\nGenerating: ${dayConfig.slug} (Day ${dayConfig.day}, ${dayConfig.chiasticPosition})...`)

  const userPrompt = `Generate a devotional for:

Series: "${series.title}"
Question: "${series.question}"
Framework Scripture: "${series.framework}"

Day ${dayConfig.day} of 5: "${dayConfig.title}"
Chiastic Position: ${dayConfig.chiasticPosition}
Theme for this day: ${dayConfig.theme}

${dayConfig.day === 3 ? 'THIS IS THE PIVOT DAY (C position). This is the core revelation the entire series builds toward. Make it the strongest, most transformative day.' : ''}
${dayConfig.day === 1 ? 'This is the opening (A position). Set the problem. Name the tension the reader feels. Be honest about the difficulty.' : ''}
${dayConfig.day === 5 ? "This is the closing (A' position). Mirror Day 1's themes but transformed by the revelation of Day 3. Don't tie everything up neatly — leave room for mystery." : ''}
${dayConfig.day === 2 ? 'This is the deepening (B position). Add complexity. Show why simple answers fail. Introduce the Hebrew/Greek word study.' : ''}
${dayConfig.day === 4 ? "This is the application (B' position). Mirror Day 2 but practically. How does the revelation of Day 3 change daily life?" : ''}

Remember:
- 3,000-4,000 words total
- Every Scripture reference must be real
- Every quote must be verifiable
- Include all 12 module types
- Also include legacy panel format for backward compatibility
- PaRDeS structure woven throughout the teaching modules`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text

  if (!content) {
    throw new Error('Empty response from Claude API')
  }

  // Parse and validate
  let devotional
  try {
    devotional = JSON.parse(content)
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      devotional = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Could not parse JSON from Claude response')
    }
  }

  // Validate required fields
  if (!devotional.day || !devotional.title || !devotional.modules) {
    throw new Error('Missing required fields in devotional JSON')
  }

  // Ensure backward-compatible fields
  devotional.day = dayConfig.day
  devotional.chiastic_position = dayConfig.chiasticPosition

  // Write to file
  const outputPath = path.join(OUTPUT_DIR, `${dayConfig.slug}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(devotional, null, 2))
  console.log(`  Written: ${outputPath}`)
  console.log(`  Modules: ${devotional.modules?.length || 0}`)
  console.log(`  Panels: ${devotional.panels?.length || 0}`)
  console.log(`  Words: ~${devotional.totalWords || 'unknown'}`)
}

// Series configurations (aligned with src/data/series.ts)
const SERIES_CONFIGS: Record<string, SeriesConfig> = {
  identity: {
    slug: 'identity',
    title: 'Identity Crisis',
    question: 'When everything that defined you is shaken, who are you?',
    framework: 'Matthew 6:33',
    days: [
      { day: 1, title: 'When everything shakes', slug: 'identity-crisis-day-1', chiasticPosition: 'A', theme: 'The ground is shifting — your labels are failing' },
      { day: 2, title: 'The narrative breaks', slug: 'identity-crisis-day-2', chiasticPosition: 'B', theme: 'Why the stories you tell yourself are insufficient' },
      { day: 3, title: 'You are whose you are', slug: 'identity-crisis-day-3', chiasticPosition: 'C', theme: 'PIVOT: Identity is not what you do but whose you are' },
      { day: 4, title: 'Living from identity', slug: 'identity-crisis-day-4', chiasticPosition: "B'", theme: 'Practical: living from identity instead of for identity' },
      { day: 5, title: 'What remains', slug: 'identity-crisis-day-5', chiasticPosition: "A'", theme: 'What stands when everything else falls' },
    ],
  },
  peace: {
    slug: 'peace',
    title: 'Peace',
    question: "What if peace isn't found by controlling your circumstances?",
    framework: 'John 14:27',
    days: [
      { day: 1, title: 'The illusion of control', slug: 'peace-day-1', chiasticPosition: 'A', theme: 'You are exhausted from trying to control everything' },
      { day: 2, title: 'The exhaustion of managing', slug: 'peace-day-2', chiasticPosition: 'B', theme: 'Why managing every variable makes peace impossible' },
      { day: 3, title: "Peace the world can't give", slug: 'peace-day-3', chiasticPosition: 'C', theme: "PIVOT: Jesus offers peace that doesn't depend on circumstances" },
      { day: 4, title: 'Practicing surrender', slug: 'peace-day-4', chiasticPosition: "B'", theme: 'Practical: daily practices of releasing control' },
      { day: 5, title: 'Peace as gift', slug: 'peace-day-5', chiasticPosition: "A'", theme: 'Peace received, not achieved' },
    ],
  },
  community: {
    slug: 'community',
    title: 'Community',
    question: 'Who are your people when systems fail?',
    framework: 'Matthew 18:20',
    days: [
      { day: 1, title: 'When systems fail', slug: 'community-day-1', chiasticPosition: 'A', theme: 'Institutional trust is collapsing' },
      { day: 2, title: 'The loneliness epidemic', slug: 'community-day-2', chiasticPosition: 'B', theme: 'Transactional relationships leave you alone' },
      { day: 3, title: "You're not meant to be alone", slug: 'community-day-3', chiasticPosition: 'C', theme: 'PIVOT: Covenant community as God designed it' },
      { day: 4, title: 'Covenant in practice', slug: 'community-day-4', chiasticPosition: "B'", theme: 'Building real community in fragmented times' },
      { day: 5, title: 'Who remains', slug: 'community-day-5', chiasticPosition: "A'", theme: 'The people who stay when systems collapse' },
    ],
  },
  kingdom: {
    slug: 'kingdom',
    title: 'Kingdom',
    question: "What if the kingdom you're looking for is already here?",
    framework: 'Luke 17:21 + Matthew 6:33',
    days: [
      { day: 1, title: 'Searching in wrong places', slug: 'kingdom-day-1', chiasticPosition: 'A', theme: 'You have searched politics, economics, and curated spirituality' },
      { day: 2, title: 'The exhaustion of empires', slug: 'kingdom-day-2', chiasticPosition: 'B', theme: 'Every empire you trusted is crumbling' },
      { day: 3, title: 'The kingdom is here', slug: 'kingdom-day-3', chiasticPosition: 'C', theme: "PIVOT: The kingdom of God is in your midst — you've been looking in empires" },
      { day: 4, title: 'Seeking first', slug: 'kingdom-day-4', chiasticPosition: "B'", theme: 'What it looks like to seek the kingdom first in daily life' },
      { day: 5, title: 'Everything else added', slug: 'kingdom-day-5', chiasticPosition: "A'", theme: 'When you seek the kingdom, everything else falls into place' },
    ],
  },
  provision: {
    slug: 'provision',
    title: 'Provision',
    question: "What if provision isn't about having enough, but sharing what you have?",
    framework: 'Matthew 6:33',
    days: [
      { day: 1, title: 'The scarcity mindset', slug: 'provision-day-1', chiasticPosition: 'A', theme: 'Fear of not having enough drives everything' },
      { day: 2, title: 'Fear drives hoarding', slug: 'provision-day-2', chiasticPosition: 'B', theme: 'How scarcity thinking leads to isolation' },
      { day: 3, title: "God's backwards economy", slug: 'provision-day-3', chiasticPosition: 'C', theme: 'PIVOT: Sharing creates abundance, hoarding creates scarcity' },
      { day: 4, title: 'Mutual aid in practice', slug: 'provision-day-4', chiasticPosition: "B'", theme: 'Practical examples of kingdom economics' },
      { day: 5, title: 'When you share, needs are met', slug: 'provision-day-5', chiasticPosition: "A'", theme: 'The paradox of generosity — giving away creates fullness' },
    ],
  },
  truth: {
    slug: 'truth',
    title: 'Truth',
    question: "How do you know what's real when misinformation is everywhere?",
    framework: 'John 14:6',
    days: [
      { day: 1, title: 'Drowning in information', slug: 'truth-day-1', chiasticPosition: 'A', theme: 'Information overload has broken your ability to discern' },
      { day: 2, title: "Can't trust yourself", slug: 'truth-day-2', chiasticPosition: 'B', theme: 'Cognitive biases and epistemic humility' },
      { day: 3, title: 'Truth is a person', slug: 'truth-day-3', chiasticPosition: 'C', theme: 'PIVOT: Truth is not a proposition but a Person' },
      { day: 4, title: 'From information to wisdom', slug: 'truth-day-4', chiasticPosition: "B'", theme: 'Practical: moving from information consumption to wisdom' },
      { day: 5, title: 'Truth was searching for you', slug: 'truth-day-5', chiasticPosition: "A'", theme: 'You thought you were searching for truth, but Truth was searching for you' },
    ],
  },
  hope: {
    slug: 'hope',
    title: 'Hope',
    question: "What if hope isn't optimism, but faithfulness in the dark?",
    framework: 'Lamentations 3:22-23',
    days: [
      { day: 1, title: 'Optimism is dead', slug: 'hope-day-1', chiasticPosition: 'A', theme: 'Toxic positivity fails. Things are hard.' },
      { day: 2, title: 'Grief is holy', slug: 'hope-day-2', chiasticPosition: 'B', theme: 'Lament is not lack of faith — it is faith expressed in pain' },
      { day: 3, title: 'Hope enters darkness', slug: 'hope-day-3', chiasticPosition: 'C', theme: 'PIVOT: Resurrection hope enters darkness, it does not deny it' },
      { day: 4, title: 'Practicing faithfulness', slug: 'hope-day-4', chiasticPosition: "B'", theme: 'Daily practices of hope in hard times' },
      { day: 5, title: 'Resurrection promise', slug: 'hope-day-5', chiasticPosition: "A'", theme: 'New every morning — hope is not optimism, it is promise' },
    ],
  },
}

async function main() {
  const args = process.argv.slice(2)
  const seriesFlag = args.indexOf('--series')
  const dayFlag = args.indexOf('--day')
  const allFlag = args.includes('--all')
  const dryRun = args.includes('--dry-run')

  if (seriesFlag === -1) {
    console.log('Usage:')
    console.log('  npx tsx scripts/generate-devotionals.ts --series <slug> --day <1-5>')
    console.log('  npx tsx scripts/generate-devotionals.ts --series <slug> --all')
    console.log('  npx tsx scripts/generate-devotionals.ts --series <slug> --all --dry-run')
    console.log('')
    console.log('Available series:', Object.keys(SERIES_CONFIGS).join(', '))
    process.exit(0)
  }

  const seriesSlug = args[seriesFlag + 1]
  const series = SERIES_CONFIGS[seriesSlug]

  if (!series) {
    console.error(`Unknown series: ${seriesSlug}`)
    console.log('Available:', Object.keys(SERIES_CONFIGS).join(', '))
    process.exit(1)
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  if (allFlag) {
    console.log(`\nGenerating all 5 days for "${series.title}"...`)
    if (dryRun) {
      console.log('(DRY RUN — no API calls)')
      series.days.forEach((d) => {
        console.log(`  Day ${d.day}: ${d.slug} (${d.chiasticPosition}) — ${d.theme}`)
      })
      return
    }

    for (const day of series.days) {
      await generateDevotional(series, day)
      // Rate limit: wait 2 seconds between calls
      await new Promise((r) => setTimeout(r, 2000))
    }
    console.log(`\nDone. Generated ${series.days.length} devotionals for "${series.title}".`)
  } else if (dayFlag !== -1) {
    const dayNum = parseInt(args[dayFlag + 1])
    const dayConfig = series.days.find((d) => d.day === dayNum)

    if (!dayConfig) {
      console.error(`Day ${dayNum} not found in series ${seriesSlug}`)
      process.exit(1)
    }

    if (dryRun) {
      console.log('(DRY RUN)')
      console.log(`  Day ${dayConfig.day}: ${dayConfig.slug} (${dayConfig.chiasticPosition}) — ${dayConfig.theme}`)
      return
    }

    await generateDevotional(series, dayConfig)
    console.log('\nDone.')
  } else {
    console.error('Specify --day <1-5> or --all')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
