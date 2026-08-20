/**
 * Assemble the day's paper as a narration document (SA-114 / F-158).
 *
 * Founder: "Ideally the page has a full audio for the day as well, for all
 * the written non interactive sections of daily bread."
 *
 * Emits a panels-format JSON (the narration pipeline's parity-tested path):
 * one panel per written, non-interactive section — practice, the word, the
 * red letters, the season, the hymnal, the proverb, the memory verse, the
 * question, the catechism, the daily prayer, voices. Games, the gallery,
 * the strip, and the reading (which has its own audio) are deliberately
 * absent.
 *
 * Usage: npx tsx scripts/edition/assemble-paper-narration.mts <date> <out.json>
 */
import { writeFileSync } from 'node:fs'
import { generateRedLetter } from '../../src/lib/edition/generators/redletter'
import { generateVerse } from '../../src/lib/edition/generators/verse'
import { generateQuestion } from '../../src/lib/edition/generators/question'
import { pageProverb } from '../../src/lib/edition/page-modules'
import { pickVoiceForDay } from '../../src/data/voices-bank'
import { getSeasonEssay } from '../../src/data/season-essays'
import { pickCatechismForDay } from '../../src/data/catechism-bank'
import { pickHymnForDay } from '../../src/data/hymn-bank'
import { liturgicalDay } from '../../src/lib/liturgical'

const [dateIso, outPath] = process.argv.slice(2)
if (!dateIso || !outPath) throw new Error('usage: assemble-paper-narration.mts <YYYY-MM-DD> <out.json>')
const now = new Date(`${dateIso}T12:00:00Z`)

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Supabase env missing')

async function dbKind(kind: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(
    `${URL_}/rest/v1/edition_items?kind=eq.${kind}&publish_date=eq.${dateIso}&status=in.(published,draft)&order=slot&limit=1`,
    { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` } },
  )
  const rows = (await r.json()) as { payload: Record<string, unknown> }[]
  return rows[0]?.payload ?? null
}

const panels: { heading: string; content: string }[] = [
  { heading: 'cover', content: '' }, // panel 0 is skipped by the pipeline
]
const add = (heading: string, ...parts: (string | undefined | null)[]) => {
  const content = parts.filter(Boolean).join(' ').trim()
  if (content.split(/\s+/).length >= 2) panels.push({ heading, content })
}

const practice = await dbKind('practice')
add('The practice', practice?.instruction as string, practice?.reason as string)

const word = await dbKind('word')
add(
  'The word of the day',
  // The transliteration is the SPOKEN form — Greek/Hebrew glyphs would be
  // mangled by the voice; the gloss carries the meaning.
  word?.translit ? `The word of the day is ${word.translit as string}.` : '',
  word?.gloss as string,
  word?.note as string,
)

const red = (await generateRedLetter(now))[0]?.payload
add('The red letters', red?.text, red ? `${red.reference}.` : '')

const season = getSeasonEssay(liturgicalDay(now))
add('The season', season?.plainName, season?.essay, season?.weekLine)

const hymn = pickHymnForDay(now)
add(
  'The hymnal',
  hymn ? `${hymn.title}, by ${hymn.author}, ${hymn.year}.` : '',
  hymn?.verses?.map((v: string[]) => v.join(' ')).join(' '),
)

const proverb = pageProverb(now)
add('The proverb', proverb?.text, proverb ? `${proverb.reference}.` : '')

const verse = (await generateVerse(now))[0]?.payload
add('The memory verse', verse?.text, verse ? `${verse.reference}.` : '')

const question = (await generateQuestion(now))[0]?.payload
add('The question', question?.text)

const catechism = pickCatechismForDay(now)
add(
  'The catechism corner',
  catechism ? `${catechism.question}` : '',
  catechism?.answer,
)

const prayer = await dbKind('prayer')
add(
  'The daily prayer',
  prayer?.prayedBy ? `The prayer of ${prayer.prayedBy as string}.` : '',
  prayer?.text as string,
  prayer?.reference ? `${prayer.reference as string}.` : '',
)

const voice = pickVoiceForDay(now)
add(
  'Voices',
  (voice as { quote?: string } | null)?.quote,
  voice ? `${voice.author}.` : '',
)

const doc = {
  title: `The Daily Bread. ${new Date(`${dateIso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}.`,
  panels,
}
writeFileSync(outPath, JSON.stringify(doc, null, 2))
console.log(`[paper-audio] ${dateIso}: ${panels.length - 1} sections, ${panels.reduce((n, p) => n + p.content.split(/\s+/).length, 0)} words → ${outPath}`)
