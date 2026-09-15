/**
 * The last gate before an edition is frozen: structural completeness, size,
 * link and asset policy, and a secret scan of the serialized document. A
 * document that fails here is NOT marked ready — the attempt records why.
 */
import { SECRET_ENV_NAMES } from './redact'
import { safeAssetSrc, safeHref } from './safe'
import { isValidDateSlug } from './time'
import type { EditionDocument } from './types'

export const MAX_DOCUMENT_BYTES = 900_000

export function validateEditionDocument(
  doc: EditionDocument,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const problems: string[] = []
  if (!isValidDateSlug(doc.editionDate) || doc.slug !== doc.editionDate) {
    problems.push('editionDate/slug invalid')
  }
  if (!['normal', 'fallback', 'minimum'].includes(doc.quality)) problems.push('quality invalid')
  if (!doc.title || doc.title.length > 200) problems.push('title missing or too long')
  if (doc.deck.length > 400) problems.push('deck too long')
  if (!doc.primaryScripture?.text || !doc.primaryScripture.reference) {
    problems.push('primary Scripture missing')
  }
  const types = new Set(doc.modules.map((m) => m.type))
  if (!types.has('scripture')) problems.push('scripture module missing')
  if (!types.has('reading')) problems.push('reading module missing')
  if (doc.modules.length !== types.size) problems.push('duplicate module types')
  const placed = new Set(doc.composition.placements.map((p) => p.module))
  for (const p of placed) {
    if (!types.has(p)) problems.push(`composition places absent module ${p}`)
  }

  // Plan §29, the minimum publishable issue: core Scripture and the reading (above),
  // a prayer or spiritual response the reader actually sees, a valid composition, and
  // a visual treatment (the scene poster; typography is the page itself).
  const readingPrays = doc.modules.some((m) => m.type === 'reading' && m.blocks.some((b) => b.kind === 'prayer'))
  if (!placed.has('prayer') && !placed.has('practice') && !(placed.has('reading') && readingPrays)) {
    problems.push('prayer or spiritual response missing from the printed paper')
  }
  if (!doc.composition.archetype || doc.composition.placements.length === 0) problems.push('composition invalid')
  for (const core of ['scripture', 'reading'] as const) {
    if (types.has(core) && !placed.has(core)) problems.push(`${core} is not placed`)
  }
  if (!doc.assets?.scenePoster?.scene) problems.push('visual treatment missing (scene poster)')

  for (const m of doc.modules) {
    if (m.type === 'goodNews') {
      for (const item of m.items) {
        if (!safeHref(item.sourceUrl)?.startsWith('https://')) problems.push('goodNews: unsafe source link')
      }
    }
    if (m.type === 'screening') {
      for (const item of m.items) {
        if (!safeHref(item.sourceUrl)) problems.push('screening: unsafe link')
      }
    }
    if (m.type === 'notices') {
      for (const n of m.notices) {
        if (n.href && !safeHref(n.href)) problems.push('notices: unsafe link')
      }
    }
    if (m.type === 'lead' && m.plate && !safeAssetSrc(m.plate.src)) problems.push('lead plate: unsafe src')
    if (m.type === 'comic' && m.image && !safeAssetSrc(m.image.src)) problems.push('comic image: unsafe src')
    if (m.type === 'gallery') {
      for (const plate of m.plates) {
        if (!safeAssetSrc(plate.image)) problems.push('gallery: unsafe plate src')
      }
    }
  }

  const serialized = JSON.stringify(doc)
  if (serialized.length > MAX_DOCUMENT_BYTES) problems.push(`document too large (${serialized.length} bytes)`)
  if (/<script|javascript:|on[a-z]+=\s*["']/i.test(serialized)) problems.push('document contains script-like content')
  for (const name of SECRET_ENV_NAMES) {
    const value = env[name]
    if (value && value.length >= 8 && serialized.includes(value)) {
      problems.push(`document contains the value of ${name}`)
    }
  }
  if (/sk-ant-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,}/.test(serialized)) {
    problems.push('document contains a credential-shaped string')
  }
  return problems
}
