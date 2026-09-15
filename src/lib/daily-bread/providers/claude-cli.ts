/**
 * Primary provider (subscription transport): the headless Claude Code CLI,
 * `claude -p`, authenticated by CLAUDE_CODE_OAUTH_TOKEN in CI (the project's
 * existing SA-100 path — the API key was removed from GitHub secrets).
 *
 * Node-only (child_process). Imported by the pipeline CLI, never by a route.
 * The prompt travels on stdin, so it never appears in a process listing.
 */
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { errorMessage } from '../redact'
import { ProviderError, type TextGenerationResult, type TextProvider } from './types'

/**
 * The child's environment. Three rules, each learned from a real failure
 * (2026-09-13):
 *  - Parent Claude Code session variables are dropped, or the child refuses
 *    to start as a nested session (exit 1).
 *  - With a subscription token (or DAILY_BREAD_CLAUDE_CLI_AUTH=login for a
 *    locally logged-in CLI) ANTHROPIC_API_KEY is removed, because the CLI
 *    prefers an API key and an unfunded one fails with "credit balance too low".
 *  - Otherwise the API key, if any, authenticates the CLI.
 */
export function cliChildEnv(
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(env)) {
    if (k === 'CLAUDECODE' || k === 'CLAUDE_PID') continue
    if (k.startsWith('CLAUDE_CODE_') && k !== 'CLAUDE_CODE_OAUTH_TOKEN') continue
    out[k] = v
  }
  const subscription =
    Boolean((env.CLAUDE_CODE_OAUTH_TOKEN ?? '').trim()) || env.DAILY_BREAD_CLAUDE_CLI_AUTH === 'login'
  if (subscription) delete out.ANTHROPIC_API_KEY
  return out
}

/**
 * Why the CLI failed, when the reason makes a retry pointless. Seen in CI on
 * 2026-09-14: "You've hit your weekly limit · resets Sep 16, 9am (UTC)" — two
 * retries of that burned time for nothing. null = worth one retry.
 */
export function classifyCliFailure(detail: string): 'auth' | 'billing' | 'quota' | null {
  if (/invalid api key|oauth|unauthori[sz]ed|please run \/login|\b401\b/i.test(detail)) return 'auth'
  if (/credit balance|billing/i.test(detail)) return 'billing'
  if (/rate limit|usage limit|weekly limit|daily limit|hit your .{0,20}limit|quota|\b429\b|resets? (on )?[A-Z][a-z]{2} \d/i.test(detail)) {
    return 'quota'
  }
  return null
}

/**
 * Read `claude -p --output-format json`: `{ type: 'result', is_error, result,
 * usage: { input_tokens, cache_creation_input_tokens, cache_read_input_tokens,
 * output_tokens }, total_cost_usd, modelUsage: { <model>: … } }` (shape checked
 * against the CLI on 2026-09-14). `total_cost_usd` is the API-equivalent price;
 * on the subscription it is a measure, not a bill. Output that is not that JSON
 * is taken as plain text with no usage: missing cost never fails a task (§72).
 */
export function parseCliResult(
  stdout: string,
  fallbackModel: string,
): { result: TextGenerationResult; error?: undefined } | { error: string; result?: undefined } {
  let json: {
    type?: unknown
    is_error?: unknown
    result?: unknown
    usage?: Record<string, unknown>
    total_cost_usd?: unknown
    modelUsage?: Record<string, unknown>
  }
  try {
    json = JSON.parse(stdout.trim())
  } catch {
    return { result: { text: stdout.trim(), model: fallbackModel } }
  }
  if (!json || typeof json !== 'object' || json.type !== 'result') {
    return { result: { text: stdout.trim(), model: fallbackModel } }
  }
  if (json.is_error === true) return { error: typeof json.result === 'string' ? json.result : 'the CLI reported an error' }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const u = json.usage ?? {}
  const models = Object.keys(json.modelUsage ?? {})
  // The CLI also bills a small helper model; name the one that wrote the answer.
  const writer = models.find((m) => !/haiku/i.test(m)) ?? models[0] ?? fallbackModel
  return {
    result: {
      text: typeof json.result === 'string' ? json.result.trim() : '',
      model: writer,
      inputTokens: num(u.input_tokens) + num(u.cache_creation_input_tokens) + num(u.cache_read_input_tokens),
      outputTokens: num(u.output_tokens),
      ...(typeof json.total_cost_usd === 'number' ? { estimatedCostUsd: json.total_cost_usd } : {}),
    },
  }
}

export function createClaudeCliProvider(
  options: {
    env?: Record<string, string | undefined>
    bin?: string
    model?: string
  } = {},
): TextProvider {
  const env = options.env ?? process.env
  const bin = options.bin ?? env.DAILY_BREAD_CLAUDE_BIN ?? 'claude'
  const model = options.model ?? env.DAILY_BREAD_CLAUDE_CLI_MODEL ?? ''
  let binaryPresent: boolean | null = null

  const hasCredential = () =>
    Boolean(
      (env.CLAUDE_CODE_OAUTH_TOKEN ?? '').trim() ||
        (env.ANTHROPIC_API_KEY ?? '').trim() ||
        env.DAILY_BREAD_CLAUDE_CLI_AUTH === 'login',
    )

  return {
    id: 'claude-cli',
    model: model || 'claude-code-default',
    canReadFiles: true,
    available() {
      if (!hasCredential()) return false
      if (binaryPresent === null) {
        try {
          const probe = spawnSync(bin, ['--version'], { timeout: 15_000, encoding: 'utf8' })
          binaryPresent = probe.status === 0
        } catch {
          binaryPresent = false
        }
      }
      return binaryPresent
    },
    async generate(request) {
      // Isolated: no user/project settings (no hooks), no session file, and by
      // default no tools and a neutral cwd so no CLAUDE.md is auto-loaded into
      // the prompt. A task that searches files (readOnlyDir) runs there with
      // Read and Grep only — the SA-100 Sunday lead ran with repo read access.
      const tools = request.readOnlyDir ? 'Read,Grep' : ''
      const args = [
        '-p',
        '--output-format',
        // JSON carries the answer plus token usage and cost (plan §72).
        'json',
        '--setting-sources',
        '',
        '--tools',
        tools,
        ...(tools ? ['--allowedTools', tools] : []),
        '--no-session-persistence',
      ]
      if (model) args.push('--model', model)
      const input = request.system ? `${request.system}\n\n---\n\n${request.prompt}` : request.prompt
      return await new Promise((resolve, reject) => {
        const child = spawn(bin, args, {
          env: cliChildEnv({ ...process.env, ...env }) as NodeJS.ProcessEnv,
          cwd: request.readOnlyDir ?? tmpdir(),
          stdio: ['pipe', 'pipe', 'pipe'],
          signal: request.signal,
        })
        let stdout = ''
        let stderr = ''
        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (chunk: string) => {
          stdout += chunk
          if (stdout.length > 2_000_000) child.kill('SIGKILL')
        })
        child.stderr.on('data', (chunk: string) => {
          stderr += chunk.slice(0, 4000)
        })
        child.on('error', (error: Error & { name?: string }) => {
          const aborted = error.name === 'AbortError'
          reject(
            new ProviderError(aborted ? 'claude-cli: timed out' : 'claude-cli: failed to start', {
              retryable: aborted,
            }),
          )
        })
        child.on('close', (code) => {
          if (code === 0) {
            const parsed = parseCliResult(stdout, model || 'claude-code-default')
            if (parsed.error !== undefined) {
              const kind = classifyCliFailure(parsed.error)
              reject(
                new ProviderError(
                  `claude-cli: error result${kind ? ` (${kind})` : ''} — ${errorMessage(parsed.error, 160).replace(/^Error: /, '')}`,
                  { retryable: kind === null },
                ),
              )
              return
            }
            resolve(parsed.result as TextGenerationResult)
            return
          }
          const detail = `${stderr}\n${stdout}`
          const kind = classifyCliFailure(detail)
          const reason = detail.trim().split('\n').filter(Boolean).slice(-1)[0] ?? ''
          reject(
            new ProviderError(
              `claude-cli: exit ${code}${kind ? ` (${kind})` : ''}${reason ? ` — ${errorMessage(reason, 160).replace(/^Error: /, '')}` : ''}`,
              { retryable: kind === null },
            ),
          )
        })
        child.stdin.end(input)
      })
    },
  }
}
