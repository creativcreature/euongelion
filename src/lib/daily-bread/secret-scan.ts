/**
 * Plan §56: prove no provider credential reaches a browser bundle.
 *
 * Two checks, because each misses what the other catches:
 *  - VALUES: every name in SECRET_ENV_NAMES that is set in this environment is
 *    searched for verbatim. A name that is not set cannot be checked by value,
 *    and the report says so instead of counting it as clean (the first scan,
 *    on 2026-09-14, silently skipped the Claude OAuth token and the Gemini key
 *    that way).
 *  - SHAPES: credential formats that are recognisable without the value
 *    (Anthropic API and OAuth tokens, Google API keys, OpenAI project keys).
 */
import { SECRET_ENV_NAMES } from './redact'

export const CREDENTIAL_SHAPES: { label: string; re: RegExp }[] = [
  { label: 'Anthropic API key', re: /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/ },
  { label: 'Anthropic OAuth token', re: /sk-ant-oat\d{2}-[A-Za-z0-9_-]{20,}/ },
  { label: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { label: 'OpenAI project key', re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
]

export interface SecretScanReport {
  filesScanned: number
  checkedByValue: string[]
  notCheckableByValue: string[]
  valueHits: { name: string; file: string }[]
  shapeHits: { label: string; file: string }[]
}

export function scanForSecrets(
  files: Iterable<{ path: string; content: string }>,
  env: Record<string, string | undefined>,
): SecretScanReport {
  const values = SECRET_ENV_NAMES.map((name) => ({ name, value: (env[name] ?? '').trim() }))
  const checkable = values.filter((v) => v.value.length >= 12)
  const report: SecretScanReport = {
    filesScanned: 0,
    checkedByValue: checkable.map((v) => v.name),
    notCheckableByValue: values.filter((v) => v.value.length < 12).map((v) => v.name),
    valueHits: [],
    shapeHits: [],
  }
  for (const file of files) {
    report.filesScanned += 1
    for (const { name, value } of checkable) {
      if (file.content.includes(value)) report.valueHits.push({ name, file: file.path })
    }
    for (const { label, re } of CREDENTIAL_SHAPES) {
      if (re.test(file.content)) report.shapeHits.push({ label, file: file.path })
    }
  }
  return report
}
