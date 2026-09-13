/**
 * Primary provider (subscription transport): the headless Claude Code CLI,
 * `claude -p`, authenticated by CLAUDE_CODE_OAUTH_TOKEN in CI (the project's
 * existing SA-100 path — the API key was removed from GitHub secrets).
 *
 * Node-only (child_process). Imported by the pipeline CLI, never by a route.
 * The prompt travels on stdin, so it never appears in a process listing.
 */
import { spawn, spawnSync } from 'node:child_process'
import { ProviderError, type TextProvider } from './types'

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
    Boolean((env.CLAUDE_CODE_OAUTH_TOKEN ?? '').trim() || (env.ANTHROPIC_API_KEY ?? '').trim())

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
      const args = ['-p', '--output-format', 'text']
      if (model) args.push('--model', model)
      const input = `${request.system}\n\n---\n\n${request.prompt}`
      return await new Promise((resolve, reject) => {
        const child = spawn(bin, args, {
          env: { ...process.env, ...env },
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
          const authFailure = /invalid api key|oauth|unauthori[sz]ed|please run \/login|401/i.test(stderr)
          const quota = /rate limit|usage limit|quota|429|overloaded/i.test(stderr)
          reject(
            new ProviderError(
              `claude-cli: exit ${code}${authFailure ? ' (auth)' : quota ? ' (quota)' : ''}`,
              { retryable: !authFailure && !quota },
            ),
          )
        })
        child.stdin.end(input)
      })
    },
  }
}
