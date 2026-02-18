export function scriptureLeadFromFramework(framework: string): string {
  const normalized = framework.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const [reference, ...verseParts] = normalized.split(/\s+-\s+/)
  if (verseParts.length === 0) {
    return normalized
  }

  const verse = verseParts.join(' - ').trim()
  if (!verse) return reference?.trim() || normalized

  return `${verse} (${reference.trim()})`
}
