export interface ScriptureLead {
  reference: string
  snippet: string
}

const DEFAULT_SNIPPET_MAX = 118

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function clampScriptureSnippet(
  value: string,
  maxLength = DEFAULT_SNIPPET_MAX,
): string {
  const normalized = collapseWhitespace(value)
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  if (maxLength <= 3) return normalized.slice(0, maxLength)
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

export function scriptureLeadPartsFromFramework(
  framework: string,
  options?: {
    maxSnippetLength?: number
  },
): ScriptureLead {
  const normalized = collapseWhitespace(framework)
  if (!normalized) return { reference: '', snippet: '' }

  const [referencePart, ...snippetParts] = normalized.split(/\s+-\s+/)
  const reference = collapseWhitespace(referencePart)
  const snippetRaw = collapseWhitespace(snippetParts.join(' - '))
  const snippet = clampScriptureSnippet(
    snippetRaw,
    options?.maxSnippetLength ?? DEFAULT_SNIPPET_MAX,
  )

  if (!reference) return { reference: 'Scripture', snippet }
  return { reference, snippet }
}

export function scriptureLeadFromFramework(framework: string): string {
  const { reference, snippet } = scriptureLeadPartsFromFramework(framework)
  if (!reference && !snippet) return ''
  if (!snippet) return reference
  return `${snippet} (${reference || 'Scripture'})`
}
