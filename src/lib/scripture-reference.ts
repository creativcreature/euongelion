export function scriptureLeadFromFramework(framework: string): string {
  const normalized = framework.trim()
  if (!normalized) return ''

  const [lead] = normalized.split(/\s+-\s+/)
  return lead?.trim() || normalized
}
