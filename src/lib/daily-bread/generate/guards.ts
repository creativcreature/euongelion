/**
 * Content guards for anything a model writes into a Daily Bread edition.
 * Derived from docs/AI-CONTENT-CONSTRAINTS.md §4.2 (forbidden patterns) and the
 * invention line: a model may frame the day, it may not quote, report, or
 * speak for a person.
 */

export const FORBIDDEN_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /in today['’]s world/i, label: "\"In today's world\"" },
  { re: /let['’]s unpack/i, label: '"Let\'s unpack"' },
  { re: /it['’]s important to note/i, label: '"It\'s important to note"' },
  { re: /this begs the question/i, label: '"This begs the question"' },
  { re: /at the end of the day/i, label: '"At the end of the day"' },
  { re: /\bin essence\b/i, label: '"In essence"' },
  { re: /embark on a journey/i, label: '"Embark on a journey"' },
  { re: /\bit['’]s not [^.]{1,40}, it['’]s\b/i, label: '"It\'s not X, it\'s Y"' },
  { re: /\bthat['’]s not [^.]{1,40}\. that['’]s\b/i, label: 'seesaw formula' },
  { re: /and that matters\b/i, label: 'self-applause' },
  { re: /which is exactly the point/i, label: 'self-applause' },
  { re: /here['’]s the thing/i, label: 'throat-clearing' },
  { re: /let me be clear/i, label: 'throat-clearing' },
  { re: /\bin short\b/i, label: 'recap ending' },
  { re: /\b\d+\s*(?:to|-|–)\s*\d+\s+minutes\b/i, label: 'hedged range' },
  { re: /\bdelve\b/i, label: '"delve"' },
  { re: /\btapestry\b/i, label: '"tapestry"' },
]

const URL_RE = /\bhttps?:\/\/|www\./i
const PICTOGRAPH_RE = /\p{Extended_Pictographic}/u
const QUOTE_RE = /["“”]/

export function proseProblems(
  text: string,
  field: string,
  limits: { min: number; max: number },
): string[] {
  const problems: string[] = []
  const t = text.trim()
  if (t.length < limits.min) problems.push(`${field}: too short`)
  if (t.length > limits.max) problems.push(`${field}: too long`)
  if (URL_RE.test(t)) problems.push(`${field}: contains a URL`)
  if (PICTOGRAPH_RE.test(t)) problems.push(`${field}: contains an emoji`)
  if (QUOTE_RE.test(t)) problems.push(`${field}: contains a quotation (models may not quote)`)
  if (/[<>{}]/.test(t)) problems.push(`${field}: contains markup characters`)
  if (/\b(I|I['’]m|I['’]ve|my)\b/.test(t)) problems.push(`${field}: first-person voice`)
  // Plural too: a model paraphrasing a verse slips into it ("If we have food and clothing").
  if (/\b(we|we['’]re|we['’]ve|us|our|ours|ourselves)\b/i.test(t)) problems.push(`${field}: first-person plural voice`)
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    if (re.test(t)) problems.push(`${field}: forbidden pattern ${label}`)
  }
  return problems
}
