// Build the WordNote bank — a small, client-shippable set of inline word-study
// notes, every gloss lifted VERBATIM from the precomputed lexicon index
// (public/lexicon-strongs.json: Brown-Driver-Briggs / Strong's / Abbott-Smith).
//
// WordNotes are referenced by bank ID only. Nothing here is invented: each entry
// is a real Strong's number whose word / transliteration / gloss / source come
// straight out of the public-domain lexica. If a seed's Strong's number is not
// in the lexicon, the build FAILS LOUDLY (no fabrication, no silent skip).
//
//   npm run build:wordnote-bank
//     → public/wordnote-bank.json   (canonical, parallels voice-bank.json)
//     → src/data/wordnote-bank.ts   (typed, client-importable, generated)
//
// To add a note: add a seed below with the correct Strong's number, re-run, and
// eyeball the printed table so the English `term` matches the lexicon gloss.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const strongsPath = path.join(root, 'public', 'lexicon-strongs.json')

if (!fs.existsSync(strongsPath)) {
  throw new Error(
    `Missing ${strongsPath}. Run \`npm run build:lexicon-index\` first.`,
  )
}
const strongs = JSON.parse(fs.readFileSync(strongsPath, 'utf8'))

// Curated seed list: { id, term, strong }.
//   id     — stable kebab slug used as the bank reference in content markers
//   term   — the English display word the note annotates
//   strong — Strong's number; the lexicon gloss/word/xlit/source are pulled from it
// The `term` is a label only; the authoritative meaning is always the lexicon gloss.
const SEEDS = [
  // --- Hebrew ---
  { id: 'shalom', term: 'peace', strong: 'H7965' },
  { id: 'chesed', term: 'steadfast love', strong: 'H2617' },
  { id: 'ruach', term: 'spirit', strong: 'H7307' },
  { id: 'nephesh', term: 'soul', strong: 'H5315' },
  { id: 'emunah', term: 'faithfulness', strong: 'H530' },
  { id: 'bara', term: 'create', strong: 'H1254' },
  { id: 'tehom', term: 'the deep', strong: 'H8415' },
  { id: 'kavod', term: 'glory', strong: 'H3519' },
  { id: 'torah', term: 'instruction', strong: 'H8451' },
  { id: 'berit', term: 'covenant', strong: 'H1285' },
  { id: 'qavah', term: 'wait', strong: 'H6960' },
  { id: 'nacham', term: 'comfort', strong: 'H5162' },
  { id: 'yare', term: 'fear', strong: 'H3372' },
  { id: 'yada', term: 'know', strong: 'H3045' },
  { id: 'shema', term: 'hear', strong: 'H8085' },
  { id: 'tsedeq', term: 'righteousness', strong: 'H6664' },
  { id: 'emet', term: 'truth', strong: 'H571' },
  { id: 'raphah', term: 'be still', strong: 'H7503' },
  { id: 'shuv', term: 'return', strong: 'H7725' },
  { id: 'or', term: 'light', strong: 'H216' },
  // --- Greek ---
  { id: 'agape', term: 'love', strong: 'G26' },
  { id: 'agapao', term: 'to love', strong: 'G25' },
  { id: 'charis', term: 'grace', strong: 'G5485' },
  { id: 'pistis', term: 'faith', strong: 'G4102' },
  { id: 'elpis', term: 'hope', strong: 'G1680' },
  { id: 'logos', term: 'word', strong: 'G3056' },
  { id: 'pneuma', term: 'spirit', strong: 'G4151' },
  { id: 'chara', term: 'joy', strong: 'G5479' },
  { id: 'eirene', term: 'peace', strong: 'G1515' },
  { id: 'metanoia', term: 'repentance', strong: 'G3341' },
  { id: 'hamartia', term: 'sin', strong: 'G266' },
  { id: 'dikaiosyne', term: 'righteousness', strong: 'G1343' },
  { id: 'soteria', term: 'salvation', strong: 'G4991' },
  { id: 'sozo', term: 'to save', strong: 'G4982' },
  { id: 'koinonia', term: 'fellowship', strong: 'G2842' },
  { id: 'doxa', term: 'glory', strong: 'G1391' },
  { id: 'aletheia', term: 'truth', strong: 'G225' },
  { id: 'makarios', term: 'blessed', strong: 'G3107' },
  { id: 'parakletos', term: 'advocate', strong: 'G3875' },
  { id: 'paraklesis', term: 'comfort', strong: 'G3874' },
  { id: 'hupomone', term: 'endurance', strong: 'G5281' },
  { id: 'kurios', term: 'Lord', strong: 'G2962' },
  { id: 'euangelion', term: 'good news', strong: 'G2098' },
]

const bank = []
const missing = []
const review = []
for (const seed of SEEDS) {
  const entry = strongs[seed.strong]
  if (!entry) {
    missing.push(seed)
    continue
  }
  bank.push({
    id: seed.id,
    term: seed.term,
    strong: seed.strong,
    word: entry.word,
    xlit: entry.xlit,
    gloss: entry.gloss,
    source: entry.source,
  })
  review.push(
    `${seed.id.padEnd(16)} ${seed.strong.padEnd(7)} ${String(entry.xlit).padEnd(14)} ${entry.word.padEnd(10)}  term="${seed.term}"  ::  ${String(entry.gloss).slice(0, 64)}`,
  )
}

if (missing.length) {
  throw new Error(
    `WordNote seeds with no lexicon entry (fix the Strong's number — never fabricate):\n` +
      missing.map((m) => `  ${m.id} (${m.term}) → ${m.strong}`).join('\n'),
  )
}

// Ensure ids are unique.
const ids = new Set()
for (const e of bank) {
  if (ids.has(e.id)) throw new Error(`Duplicate WordNote id: ${e.id}`)
  ids.add(e.id)
}

const jsonOut = path.join(root, 'public', 'wordnote-bank.json')
fs.writeFileSync(jsonOut, JSON.stringify(bank, null, 2) + '\n')

const dataDir = path.join(root, 'src', 'data')
fs.mkdirSync(dataDir, { recursive: true })
const tsOut = path.join(dataDir, 'wordnote-bank.ts')
fs.writeFileSync(
  tsOut,
  `// AUTO-GENERATED by scripts/build-wordnote-bank.mjs — DO NOT EDIT.\n` +
    `// Every gloss is verbatim from public/lexicon-strongs.json (BDB / Strong's /\n` +
    `// Abbott-Smith). Run \`npm run build:wordnote-bank\` to regenerate.\n` +
    `import type { WordNoteEntry } from '@/lib/wordnote'\n\n` +
    `export const WORDNOTE_BANK: WordNoteEntry[] = ${JSON.stringify(bank, null, 2)}\n`,
)

console.log('WordNote bank — review term↔gloss alignment:\n')
console.log(review.join('\n'))
console.log(`\n✓ ${bank.length} notes → public/wordnote-bank.json + src/data/wordnote-bank.ts`)
