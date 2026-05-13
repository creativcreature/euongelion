#!/usr/bin/env node
/**
 * Convert a sequence of devotional JSON files into a single readable markdown
 * file (founder-friendly, end-to-end review format).
 *
 * Usage:
 *   node scripts/devotional-to-markdown.mjs <file1.json> [file2.json] ... <out.md>
 *
 * Designed for proof-reading the prose. Strips renderer-only fields and
 * reflows each module as labeled prose with verses, vocab callouts, and
 * citations preserved. NOT a faithful render of the production page —
 * a readability draft for end-to-end editorial sign-off.
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error(
    'Usage: devotional-to-markdown.mjs <file1.json> [file2.json] ... <out.md>',
  )
  process.exit(2)
}
const outPath = args[args.length - 1]
const inputs = args.slice(0, -1)

function escapeMd(s) {
  if (typeof s !== 'string') return ''
  return s
}

function blockQuote(text) {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

function fmtScripture(m) {
  const lines = []
  const ref = m.reference || ''
  const trans = m.translation || ''
  const label = trans ? `**${ref} — ${trans}**` : `**${ref}**`
  lines.push(`> ${label}`)
  lines.push('>')
  const text = m.passage || m.text || ''
  if (text) lines.push(blockQuote(text))
  if (m.greekOriginal) {
    lines.push('>')
    lines.push(`> *Greek:* ${m.greekOriginal}`)
  }
  if (m.hebrewOriginal) {
    lines.push('>')
    lines.push(`> *Hebrew:* ${m.hebrewOriginal}`)
  }
  if (Array.isArray(m.emphasis) && m.emphasis.length) {
    lines.push('>')
    lines.push(`> *Emphasis:* ${m.emphasis.map((e) => `“${e}”`).join(', ')}`)
  }
  return lines.join('\n')
}

function fmtVocab(m) {
  const lines = []
  const lang = m.language ? m.language.toUpperCase() : ''
  lines.push(`### Vocab — ${lang} ${m.word || ''}`)
  if (m.transliteration) {
    lines.push(`*${m.transliteration}*${m.pronunciation ? ` (${m.pronunciation})` : ''}`)
  }
  if (m.strongsNumber) lines.push(`Strong's ${m.strongsNumber}`)
  if (m.definition) {
    lines.push('')
    lines.push(`**Definition:** ${m.definition}`)
  }
  if (m.rootMeaning) {
    lines.push('')
    lines.push(`**Root meaning:** ${m.rootMeaning}`)
  }
  if (m.usage) {
    lines.push('')
    lines.push(`**Usage:** ${m.usage}`)
  }
  if (m.usageNote) {
    lines.push('')
    lines.push(`**Note:** ${m.usageNote}`)
  }
  if (Array.isArray(m.relatedWords) && m.relatedWords.length) {
    lines.push('')
    lines.push('**Related:**')
    for (const r of m.relatedWords) {
      const bits = [
        r.word,
        r.transliteration ? `(*${r.transliteration}*)` : '',
        r.note ? `— ${r.note}` : '',
        r.reference ? `— ${r.reference}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(`- ${bits}`)
    }
  }
  return lines.join('\n')
}

function fmtTeaching(m) {
  const lines = []
  const heading = m.heading || 'Teaching'
  const cp = m.chiasm_position ? ` *(${m.chiasm_position})*` : ''
  lines.push(`### ${heading}${cp}`)
  lines.push('')
  if (m.body) lines.push(m.body)
  else if (m.content) lines.push(m.content)
  if (m.keyInsight) {
    lines.push('')
    lines.push(`> **Key insight:** ${m.keyInsight}`)
  }
  return lines.join('\n')
}

function fmtBridge(m) {
  const lines = []
  lines.push('### Bridge — ancient ↔ modern')
  if (m.ancientTruth || m.ancient) {
    lines.push('')
    lines.push(`**Ancient:** ${m.ancientTruth || m.ancient}`)
  }
  if (m.modernApplication || m.modern) {
    lines.push('')
    lines.push(`**Modern:** ${m.modernApplication || m.modern}`)
  }
  if (m.connectionPoint || m.connection) {
    lines.push('')
    lines.push(`**Connection:** ${m.connectionPoint || m.connection}`)
  }
  if (m.question) {
    lines.push('')
    lines.push(`**Question:** ${m.question}`)
  }
  if (m.answer) {
    lines.push('')
    lines.push(`**Answer:** ${m.answer}`)
  }
  if (m.newTestamentEcho) {
    lines.push('')
    lines.push(`**NT echo:** ${m.newTestamentEcho}`)
  }
  return lines.join('\n')
}

function fmtStory(m) {
  const lines = []
  lines.push(`### Story — ${m.heading || m.title || 'narrative'}`)
  lines.push('')
  lines.push(m.body || m.content || '')
  if (m.connectionToTheme || m.connection) {
    lines.push('')
    lines.push(`*Connection:* ${m.connectionToTheme || m.connection}`)
  }
  if (m.source) {
    lines.push('')
    lines.push(`*Source note:* ${m.source}`)
  }
  return lines.join('\n')
}

function fmtInsight(m) {
  const lines = []
  if (m.heading) lines.push(`### ${m.heading}`)
  else lines.push('### Insight')
  lines.push('')
  if (m.body) lines.push(`> *${m.body}*`)
  else if (m.content) lines.push(`> *${m.content}*`)
  else if (m.text) lines.push(`> *${m.text}*`)
  if (m.attribution) lines.push(`> — ${m.attribution}`)
  if (m.historicalContext) {
    lines.push('')
    lines.push(`**Historical context:** ${m.historicalContext}`)
  }
  if (m.fascinatingFact) {
    lines.push('')
    lines.push(`**Note:** ${m.fascinatingFact}`)
  }
  return lines.join('\n')
}

function fmtReflection(m) {
  const lines = []
  lines.push('### Reflection')
  if (m.prompt) {
    lines.push('')
    lines.push(`**Primary question:** ${m.prompt}`)
  }
  if (Array.isArray(m.additionalQuestions) && m.additionalQuestions.length) {
    lines.push('')
    lines.push('**Follow-ups:**')
    for (const q of m.additionalQuestions) lines.push(`- ${q}`)
  }
  return lines.join('\n')
}

function fmtPrayer(m) {
  const lines = []
  lines.push('### Prayer')
  if (m.heading) lines.push(`*${m.heading}*`)
  if (m.posture) lines.push(`*Posture: ${m.posture}*`)
  lines.push('')
  const txt = m.prayerText || m.text || m.content || ''
  if (txt) lines.push(blockQuote(txt))
  return lines.join('\n')
}

function fmtTakeaway(m) {
  const lines = []
  lines.push('### Takeaway')
  const c = m.commitment || m.content || ''
  if (c) {
    lines.push('')
    lines.push(`**Commitment:** ${c}`)
  }
  if (Array.isArray(m.leavingAtCross) && m.leavingAtCross.length) {
    lines.push('')
    lines.push('**Leaving at the cross:**')
    for (const x of m.leavingAtCross) lines.push(`- ${x}`)
  }
  if (Array.isArray(m.receivingFromCross) && m.receivingFromCross.length) {
    lines.push('')
    lines.push('**Receiving from the cross:**')
    for (const x of m.receivingFromCross) lines.push(`- ${x}`)
  }
  return lines.join('\n')
}

function fmtInteractive(m) {
  const lines = []
  const kind = m.interaction_type || m.interactionType || 'practice'
  lines.push(`### Interactive — ${kind}`)
  if (m.prompt) {
    lines.push('')
    lines.push(`**Prompt:** ${m.prompt}`)
  }
  if (Array.isArray(m.steps) && m.steps.length) {
    lines.push('')
    for (const s of m.steps) {
      lines.push(`- ${s.title ? `**${s.title}** — ` : ''}${s.description || ''}`)
    }
  }
  if (m.followUp || m.follow_up) {
    lines.push('')
    lines.push(`*Follow-up:* ${m.followUp || m.follow_up}`)
  }
  if (m.body || m.content || m.instruction) {
    lines.push('')
    lines.push(m.body || m.content || m.instruction)
  }
  return lines.join('\n')
}

function fmtResource(m) {
  const lines = []
  lines.push(`### ${m.heading || 'Sources & resources'}`)
  if (Array.isArray(m.resources) && m.resources.length) {
    lines.push('')
    for (const r of m.resources) {
      const bits = [
        r.title ? `**${r.title}**` : '',
        r.author ? `— ${r.author}` : '',
        r.note || r.description ? `— ${r.note || r.description}` : '',
        r.url ? `<${r.url}>` : '',
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(`- ${bits}`)
    }
  }
  if (Array.isArray(m.relatedScriptures) && m.relatedScriptures.length) {
    lines.push('')
    lines.push('**Related scriptures:**')
    for (const s of m.relatedScriptures) {
      lines.push(`- **${s.reference}** — ${s.text}`)
    }
  }
  if (Array.isArray(m.forDeeperStudy) && m.forDeeperStudy.length) {
    lines.push('')
    lines.push('**For deeper study:**')
    for (const s of m.forDeeperStudy) {
      const bits = [
        s.title ? `**${s.title}**` : '',
        s.note ? `— ${s.note}` : '',
        s.url ? `<${s.url}>` : '',
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(`- ${bits}`)
    }
  }
  return lines.join('\n')
}

function fmtRecap(m) {
  const lines = []
  lines.push(`### ${m.heading || 'Recap'}`)
  if (m.intro) {
    lines.push('')
    lines.push(m.intro)
  }
  if (Array.isArray(m.days) && m.days.length) {
    for (const d of m.days) {
      lines.push('')
      lines.push(`**Day ${d.day} — ${d.title}**`)
      if (d.anchor_verse) lines.push(`*${d.anchor_verse}*`)
      lines.push('')
      lines.push(d.key_insight || '')
    }
  }
  if (m.integration_question) {
    lines.push('')
    lines.push(`**Sit with this:** ${m.integration_question}`)
  }
  if (m.transition_to_sabbath) {
    lines.push('')
    lines.push(`*${m.transition_to_sabbath}*`)
  }
  return lines.join('\n')
}

function fmtSabbath(m) {
  const lines = []
  lines.push(`### ${m.heading || 'Sabbath'}`)
  if (m.scripture_anchor) {
    const a = m.scripture_anchor
    lines.push('')
    lines.push(`> **${a.reference}${a.translation ? ` — ${a.translation}` : ''}**`)
    lines.push('>')
    lines.push(blockQuote(a.text || ''))
  }
  if (m.invitation) {
    lines.push('')
    lines.push(`**Invitation:** ${m.invitation}`)
  }
  const px = m.prayerText || m.prayer
  if (px) {
    lines.push('')
    lines.push('**Prayer:**')
    lines.push(blockQuote(px))
  }
  return lines.join('\n')
}

function fmtComprehension(m) {
  const lines = []
  lines.push('### Comprehension')
  if (Array.isArray(m.forReflection) && m.forReflection.length) {
    lines.push('')
    lines.push('**For reflection:**')
    for (const q of m.forReflection) lines.push(`- ${q}`)
  }
  if (Array.isArray(m.forAccountabilityPartners) && m.forAccountabilityPartners.length) {
    lines.push('')
    lines.push('**With accountability partners:**')
    for (const q of m.forAccountabilityPartners) lines.push(`- ${q}`)
  }
  return lines.join('\n')
}

function fmtProfile(m) {
  const lines = []
  lines.push(`### Profile — ${m.name || m.heading || 'figure'}`)
  if (m.title) lines.push(`*${m.title}*`)
  if (m.era) lines.push(`*${m.era}*`)
  if (m.description) {
    lines.push('')
    lines.push(m.description)
  }
  if (m.keyQuote) {
    lines.push('')
    lines.push(`> ${m.keyQuote}`)
  }
  if (m.lessonForUs) {
    lines.push('')
    lines.push(`*${m.lessonForUs}*`)
  }
  return lines.join('\n')
}

function fmtFallback(m) {
  const lines = []
  lines.push(`### ${m.type[0].toUpperCase() + m.type.slice(1)}`)
  if (m.heading) lines.push(`*${m.heading}*`)
  if (m.body || m.content || m.text) {
    lines.push('')
    lines.push(m.body || m.content || m.text)
  }
  return lines.join('\n')
}

function fmtModule(m) {
  switch (m.type) {
    case 'scripture':
      return fmtScripture(m)
    case 'vocab':
      return fmtVocab(m)
    case 'teaching':
      return fmtTeaching(m)
    case 'bridge':
      return fmtBridge(m)
    case 'story':
      return fmtStory(m)
    case 'insight':
      return fmtInsight(m)
    case 'reflection':
      return fmtReflection(m)
    case 'prayer':
      return fmtPrayer(m)
    case 'takeaway':
      return fmtTakeaway(m)
    case 'interactive':
      return fmtInteractive(m)
    case 'resource':
      return fmtResource(m)
    case 'recap':
      return fmtRecap(m)
    case 'sabbath':
      return fmtSabbath(m)
    case 'comprehension':
      return fmtComprehension(m)
    case 'profile':
      return fmtProfile(m)
    default:
      return fmtFallback(m)
  }
}

function fmtDay(json, idx, total) {
  const lines = []
  lines.push(`# Day ${json.day} — ${escapeMd(json.title || '')}`)
  if (json.teaser) {
    lines.push('')
    lines.push(`*${json.teaser}*`)
  }
  const meta = []
  if (json.chiasm_position) meta.push(`Chiasm: **${json.chiasm_position}**`)
  if (json.scriptureReference) meta.push(`Anchor: **${json.scriptureReference}**`)
  if (meta.length) {
    lines.push('')
    lines.push(meta.join(' · '))
  }
  if (json.framework && json.framework !== json.scriptureReference) {
    lines.push('')
    lines.push(`> ${json.framework}`)
  }

  for (const m of json.modules || []) {
    if (!m || !m.type) continue
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(fmtModule(m))
  }

  if (idx < total - 1) {
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('<div style="page-break-after: always;"></div>')
  }
  return lines.join('\n')
}

const dayJsons = inputs.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')))
dayJsons.sort((a, b) => (a.day || 0) - (b.day || 0))

const seriesTitle = 'Pilot Devotional Draft — for end-to-end review'
const out = []
out.push(`% ${seriesTitle}`)
out.push('% Euangelion')
out.push(`% ${new Date().toISOString().slice(0, 10)}`)
out.push('')
out.push('> **Note for the reader.** This is a proof-reading draft, not a finished render. Module headings, chiasm position labels, and citation blocks are visible inline so you can sign off on the prose without flipping back to the JSON. The actual product page will hide these scaffolding labels and present the prose typographically — see <http://localhost:3333/devotional/what-is-euangelion-day-1> for the in-app render once Supabase env vars land in this worktree.')
out.push('')
out.push('## Series — What is Euangelion?')
out.push('')
out.push('Seven days that take the word *euangelion* seriously. Where it came from, what it meant before church language buried it, what it meant when Jesus started saying it, and why it still matters. Written for readers who would rather be respected than convinced.')
out.push('')
out.push('Pathway: **Sleep** (the drifted, the skeptical, the never-was).')
out.push('')
out.push('---')
out.push('')

for (let i = 0; i < dayJsons.length; i++) {
  out.push(fmtDay(dayJsons[i], i, dayJsons.length))
  out.push('')
}

fs.writeFileSync(outPath, out.join('\n'))
console.log(`Wrote ${outPath} (${out.join('\n').length} chars, ${dayJsons.length} days)`)
