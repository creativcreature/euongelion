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
import { ProviderError, type TextProvider } from './types'

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
      // Isolated: no user/project settings (no hooks), no tools, no session
      // file, and a neutral cwd so no CLAUDE.md is auto-loaded into the prompt.
      const args = [
        '-p',
        '--output-format',
        'text',
        '--setting-sources',
        '',
        '--tools',
        '',
        '--no-session-persistence',
      ]
      if (model) args.push('--model', model)
      const input = `${request.system}\n\n---\n\n${request.prompt}`
      return await new Promise((resolve, reject) => {
        const child = spawn(bin, args, {
          env: cliChildEnv({ ...process.env, ...env }) as NodeJS.ProcessEnv,
          cwd: tmpdir(),
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
            resolve({ text: stdout.trim(), model: model || 'claude-code-default' })
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
