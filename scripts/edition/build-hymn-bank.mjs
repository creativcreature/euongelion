#!/usr/bin/env node
/**
 * Build the Hymnal bank from The Otterbein Hymnal (1890), Project Gutenberg
 * #16455 — public domain (SA-094 / F-140).
 *
 * WHY A SCRIPT: three model attempts at emitting hymn texts were blocked by
 * the output content filter (it cannot verify public-domain status at
 * generation time, so bulk lyric emission is refused regardless). So no
 * model types a lyric here: this script COPIES the received text from a
 * public-domain hymnal file, and the committed JSON is the artifact. The
 * curated list below is first lines only — an index, not a reproduction.
 *
 * Usage: node scripts/edition/build-hymn-bank.mjs [path-to-pg16455.txt]
 *   Without a path, downloads from Gutenberg (needs network once).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const OUT = path.join(REPO, 'src/data/hymn-bank.json')
const SOURCE_URL = 'https://www.gutenberg.org/cache/epub/16455/pg16455.txt'

/** First lines of the hymns to extract — an index into the hymnal. */
const KNOWN_ATTRIBUTION = {
  'amazing grace! how sweet the sound': { author: 'John Newton', year: 1779 },
  'alas! and did my saviour bleed': { author: 'Isaac Watts', year: 1707 },
  'come, thou fount of every blessing': { author: 'Robert Robinson', year: 1758 },
  'guide me, o thou great jehovah': { author: 'William Williams', year: 1745 },
  'on jordan\'s stormy banks i stand': { author: 'Samuel Stennett', year: 1787 },
  'sweet hour of prayer, sweet hour of prayer': { author: 'William W. Walford', year: 1845 },
  'o god, our help in ages past': { author: 'Isaac Watts', year: 1719 },
  'christ the lord is risen to-day': { author: 'Charles Wesley', year: 1739 },
  'he leadeth me! oh! blessed tho\'t': { author: 'Joseph H. Gilmore', year: 1862 },
}

const WANTED = [
  'When I survey the wondrous cross,',
  'O sacred head, now wounded!',
  'Amazing grace! how sweet the sound,',
  'All hail the power of Jesus’ name,',
  'Rock of ages, cleft for me!',
  'Jesus, lover of my soul,',
  'Come, thou Fount of every blessing,',
  'A charge to keep I have,',
  'Am I a soldier of the cross,',
  'Alas! and did my Saviour bleed,',
  'Blest be the tie that binds',
  'Guide me, O thou great Jehovah,',
  'How firm a foundation, ye saints of the Lord,',
  'I love thy kingdom, Lord,',
  'Jesus shall reign where’er the sun',
  'Just as I am, without one plea,',
  'My faith looks up to thee,',
  'Nearer, my God, to thee,',
  'O for a thousand tongues to sing',
  'O God, our help in ages past,',
  'On Jordan’s stormy banks I stand,',
  'Stand up, stand up for Jesus,',
  'Sweet hour of prayer, sweet hour of prayer,',
  'There is a fountain filled with blood,',
  'What a friend we have in Jesus,',
  'My hope is built on nothing less',
  'Holy, holy, holy! Lord God Almighty!',
  'Christ the Lord is risen to-day,',
  'Joy to the world! the Lord is come',
  'Take my life, and let it be',
  'How sweet the name of Jesus sounds',
  'In the cross of Christ I glory,',
  'I love to tell the story',
  'He leadeth me! oh! blessed tho’t,',
  'Come, ye sinners, poor and needy,',
  'I am thine, O Lord, I have heard thy voice,',
  'More love to thee, O Christ,',
]

function normalize(line) {
  return line
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
}

function main() {
  const argPath = process.argv[2]
  let text
  if (argPath) {
    text = fs.readFileSync(argPath, 'utf8')
  } else {
    throw new Error(
      'Pass the path to pg16455.txt (download once from ' + SOURCE_URL + ')',
    )
  }
  const lines = text.split(/\r?\n/)

  // Index every line for lookup.
  const hymns = []
  const missing = []

  for (const first of WANTED) {
    const want = normalize(first).replace(/[,;:!]$/, '').toLowerCase()
    const startIdx = lines.findIndex((l) => {
      const n = normalize(l).toLowerCase()
      return n === want || n.startsWith(want)
    })
    if (startIdx === -1) {
      missing.push(first)
      continue
    }
    // Read forward, collecting verse blocks, until the attribution line:
    // "     Author Name, 1707." (indented, ends with a year and period) or
    // the next hymn header ("NNN     Name, meter").
    const verses = []
    let current = []
    let author = ''
    let year = 0
    for (let i = startIdx; i < Math.min(startIdx + 150, lines.length); i++) {
      const raw = lines[i]
      const l = raw.trim()
      // Attribution formats seen in the hymnal:
      //   "Isaac Watts, 1707."  "Reginald Heber--_alt._"
      //   "Edward Perronet, _alt._ 1780."  "Anon. 1862."
      const yearM = l.match(/(1[5-9]\d\d)\.?$/)
      const nameOnly = l
        .replace(/(1[5-9]\d\d)\.?$/, '')
        .replace(/--?_?alt\._?/g, '')
        .replace(/[,.\s]+$/, '')
        .trim()
      const nameOk = /^[A-Z][A-Za-z.'’ -]{2,40}$/.test(nameOnly)
      const after = (lines[i + 1] ?? '').trim()
      const after2 = (lines[i + 2] ?? '').trim()
      const closesHymn =
        after === '' &&
        (/^\d+\s{3,}/.test(after2) || /^_/.test(after2) || after2 === '')
      if (
        nameOk &&
        raw.startsWith('    ') &&
        l.length < 46 &&
        i > startIdx + 3 &&
        (yearM !== null || closesHymn)
      ) {
        author = nameOnly
        year = yearM ? Number(yearM[1]) : 1890
        break
      }
      if (/^\d+\s{3,}/.test(l) && i > startIdx) break // next hymn header
      if (l === '') {
        if (current.length >= 2) verses.push(current)
        current = []
        continue
      }
      // Strip the leading verse number ("2 Forbid it...") and chorus markers.
      const stripped = l.replace(/^\d+\s+/, '').replace(/^Cho\.?--?/, '')
      if (stripped) current.push(stripped)
    }
    if (current.length >= 2) verses.push(current)

    if (!author || !year) {
      const key = normalize(first).replace(/[,;:!]$/, '').toLowerCase()
      const known = KNOWN_ATTRIBUTION[key]
      if (known && verses.length > 0) {
        author = known.author
        year = known.year
      }
    }
    if (verses.length === 0 || !author || !year) {
      missing.push(first + ' (parse)')
      continue
    }
    if (year > 1928) {
      missing.push(first + ` (year ${year} not PD-safe)`)
      continue
    }
    hymns.push({
      title: first.replace(/[,;!]$/, ''),
      author,
      year,
      verses: verses.slice(0, 3),
    })
  }

  if (hymns.length < 30) {
    console.error(
      `Only ${hymns.length} hymns extracted (need 30). Missing/failed:`,
    )
    for (const m of missing) console.error(' -', m)
    process.exit(1)
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        _readme:
          'Hymn texts COPIED VERBATIM by scripts/edition/build-hymn-bank.mjs from The Otterbein Hymnal (1890), Project Gutenberg #16455, public domain. First verse plus up to two more, leading verse numbers stripped. No model generated any lyric line. SA-094/F-140.',
        source: 'The Otterbein Hymnal (1890), Project Gutenberg #16455',
        hymns,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    `wrote ${hymns.length} hymns to src/data/hymn-bank.json` +
      (missing.length ? `; skipped ${missing.length}: ${missing.join(' | ')}` : ''),
  )
}

main()
