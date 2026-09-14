// @vitest-environment node
/**
 * Daily Bread V2 provider chain (SA-142 / F-184): Claude → secondary →
 * deterministic, with timeouts, limited retries, output validation, and
 * usage accounting. Includes the editorial frame's validators (no quotes, no
 * invented Scripture, BSB lookups) and the transports' credential handling.
 */
import { describe, expect, it, vi } from 'vitest'
import { runProviderChain, extractJsonObject } from '@/lib/daily-bread/providers/chain'
import {
  OutputValidationError,
  ProviderError,
  type TextProvider,
} from '@/lib/daily-bread/providers/types'
import { createClaudeApiProvider } from '@/lib/daily-bread/providers/claude-api'
import { createGeminiProvider } from '@/lib/daily-bread/providers/gemini'
import { classifyCliFailure, cliChildEnv } from '@/lib/daily-bread/providers/claude-cli'
import { createOpenAiProvider, openAiCostUsd } from '@/lib/daily-bread/providers/openai'
import {
  composeFrame,
  contextRabbitHoles,
  deterministicScene,
  resolveFrame,
  type FrameInput,
} from '@/lib/daily-bread/generate/frame'
import { proseProblems } from '@/lib/daily-bread/generate/guards'
import { bsbLookup } from '@/lib/daily-bread/modules/build'

const noSleep = async () => {}

function provider(id: TextProvider['id'], impl: () => Promise<string>, available = true): TextProvider & { calls: number } {
  const p = {
    id,
    model: `${id}-model`,
    calls: 0,
    available: () => available,
    async generate() {
      p.calls += 1
      return { text: await impl(), model: `${id}-model`, inputTokens: 10, outputTokens: 5, estimatedCostUsd: 0.001 }
    },
  }
  return p
}

const parseNumber = (text: string) => {
  const n = Number(text)
  if (!Number.isFinite(n)) throw new OutputValidationError(['not a number'])
  return n
}

describe('runProviderChain', () => {
  it('uses the primary when it succeeds', async () => {
    const claude = provider('claude-api', async () => '42')
    const gemini = provider('gemini', async () => '7')
    const out = await runProviderChain({
      task: 't',
      providers: [claude, gemini],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      deterministic: () => 0,
      sleep: noSleep,
    })
    expect(out).toMatchObject({ value: 42, provider: 'claude-api', deterministic: false, fallbackProvidersUsed: [] })
    expect(gemini.calls).toBe(0)
    expect(out.usage[0]).toMatchObject({ ok: true, attempts: 1, estimatedCostUsd: 0.001 })
  })

  it('retries a retryable failure once, then falls to the secondary', async () => {
    const claude = provider('claude-api', async () => {
      throw new ProviderError('HTTP 529', { retryable: true, status: 529 })
    })
    const gemini = provider('gemini', async () => '7')
    const out = await runProviderChain({
      task: 't',
      providers: [claude, gemini],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      deterministic: () => 0,
      retries: 1,
      sleep: noSleep,
    })
    expect(claude.calls).toBe(2)
    expect(out).toMatchObject({ value: 7, provider: 'gemini', fallbackProvidersUsed: ['gemini'] })
    expect(out.usage.find((u) => u.provider === 'claude-api')).toMatchObject({ ok: false, attempts: 2 })
  })

  it('does not retry an auth failure', async () => {
    const claude = provider('claude-api', async () => {
      throw new ProviderError('HTTP 401', { retryable: false, status: 401 })
    })
    await runProviderChain({
      task: 't',
      providers: [claude],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      deterministic: () => 0,
      retries: 2,
      sleep: noSleep,
    })
    expect(claude.calls).toBe(1)
  })

  it('rejects invalid output, retries once, then moves on', async () => {
    const claude = provider('claude-api', async () => 'not json at all')
    const gemini = provider('gemini', async () => '3')
    const out = await runProviderChain({
      task: 't',
      providers: [claude, gemini],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      validate: (n) => (n > 100 ? ['too big'] : []),
      deterministic: () => 0,
      sleep: noSleep,
    })
    expect(claude.calls).toBe(2)
    expect(out.provider).toBe('gemini')
  })

  it('times out a hung provider through the abort signal', async () => {
    const hung: TextProvider = {
      id: 'claude-api',
      model: 'm',
      available: () => true,
      generate: (req) =>
        new Promise((_, reject) => {
          req.signal.addEventListener('abort', () =>
            reject(new ProviderError('claude-api: timed out', { retryable: true })),
          )
        }),
    }
    const out = await runProviderChain({
      task: 't',
      providers: [hung],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      deterministic: () => -1,
      timeoutMs: 20,
      retries: 0,
      sleep: noSleep,
    })
    expect(out).toMatchObject({ value: -1, deterministic: true })
    expect(out.usage[0].error).toContain('timed out')
  })

  it('total outage: skips unconfigured providers and lands on deterministic', async () => {
    const out = await runProviderChain({
      task: 't',
      providers: [provider('claude-api', async () => '1', false), provider('gemini', async () => '1', false)],
      request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
      parse: parseNumber,
      deterministic: () => 99,
      sleep: noSleep,
    })
    expect(out).toMatchObject({ value: 99, provider: 'deterministic', deterministic: true })
    expect(out.usage.filter((u) => u.error?.startsWith('unavailable'))).toHaveLength(2)
  })

  it('surfaces a deterministic failure instead of inventing a value', async () => {
    await expect(
      runProviderChain({
        task: 't',
        providers: [],
        request: { system: 's', prompt: 'p', maxOutputTokens: 10 },
        parse: parseNumber,
        deterministic: () => {
          throw new Error('bank empty')
        },
      }),
    ).rejects.toThrow('bank empty')
  })

  it('extracts JSON from fenced or chatty output', () => {
    expect(extractJsonObject('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJsonObject('prefix {"b": [1,2]} suffix')).toEqual({ b: [1, 2] })
    expect(() => extractJsonObject('nothing here')).toThrow(OutputValidationError)
  })
})

describe('transports', () => {
  it('claude-api sends the key only in the x-api-key header and maps status to retryability', async () => {
    const fetchImpl = vi.fn(async () => new Response('overloaded', { status: 529 }))
    const p = createClaudeApiProvider({ env: { ANTHROPIC_API_KEY: 'sk-ant-test-key-123456' }, fetchImpl })
    expect(p.available()).toBe(true)
    const err = await p
      .generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 5, signal: new AbortController().signal })
      .catch((e) => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.retryable).toBe(true)
    expect(err.message).not.toContain('sk-ant')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test-key-123456')
    expect(String(init.body)).not.toContain('sk-ant')
  })

  it('gemini never puts the key in the URL', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 } }),
    )
    const p = createGeminiProvider({ env: { GEMINI_API_KEY: 'AIzaTESTKEY000000000000000' }, fetchImpl })
    const out = await p.generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 5, json: true, signal: new AbortController().signal })
    expect(out.text).toBe('{"ok":true}')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).not.toContain('AIza')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaTESTKEY000000000000000')
  })

  it('unconfigured transports report unavailable', () => {
    expect(createClaudeApiProvider({ env: {} }).available()).toBe(false)
    expect(createGeminiProvider({ env: {} }).available()).toBe(false)
    expect(createOpenAiProvider({ env: {} }).available()).toBe(false)
  })

  it('openai sends the key only as a bearer header, asks for JSON, and reports usage', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        model: 'gpt-4o-mini-2024-07-18',
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 4 },
      }),
    )
    const p = createOpenAiProvider({ env: { OPENAI_API_KEY: 'sk-proj-TESTKEY0000000000000000' }, fetchImpl })
    const out = await p.generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 5, json: true, signal: new AbortController().signal })
    expect(out).toMatchObject({ text: '{"ok":true}', inputTokens: 12, outputTokens: 4 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(url).not.toContain('sk-proj')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-proj-TESTKEY0000000000000000')
    expect(JSON.parse(String(init.body)).response_format).toEqual({ type: 'json_object' })
  })

  it('HTTP failures carry the provider’s redacted reason; billing is never retried', async () => {
    const billing = vi.fn(async () =>
      Response.json(
        { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } },
        { status: 400 },
      ),
    )
    const err = await createClaudeApiProvider({ env: { ANTHROPIC_API_KEY: 'sk-ant-test-key-123456' }, fetchImpl: billing })
      .generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 5, signal: new AbortController().signal })
      .catch((e) => e)
    expect(err.message).toContain('(billing)')
    expect(err.message).toContain('credit balance is too low')
    expect(err.retryable).toBe(false)

    const depleted = vi.fn(async () =>
      Response.json({ error: { code: 429, message: 'Your prepayment credits are depleted. Manage your project and billing.' } }, { status: 429 }),
    )
    const gErr = await createGeminiProvider({ env: { GEMINI_API_KEY: 'AIzaTESTKEY000000000000000' }, fetchImpl: depleted })
      .generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 5, signal: new AbortController().signal })
      .catch((e) => e)
    expect(gErr.retryable).toBe(false)
    expect(gErr.message).not.toContain('AIza')
  })

  it('CLI failures that make a retry pointless are classified (the CI weekly limit)', () => {
    expect(classifyCliFailure("You've hit your weekly limit · resets Sep 16, 9am (UTC)")).toBe('quota')
    expect(classifyCliFailure('Claude usage limit reached. Your limit will reset at 5pm')).toBe('quota')
    expect(classifyCliFailure('Invalid API key · Please run /login')).toBe('auth')
    expect(classifyCliFailure('Your credit balance is too low to access the Anthropic API.')).toBe('billing')
    expect(classifyCliFailure('Error: socket hang up')).toBeNull()
  })

  it('the CLI child drops parent session variables and prefers the subscription over an API key', () => {
    const child = cliChildEnv({
      PATH: '/usr/bin',
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
      CLAUDE_CODE_SESSION_ID: 'abc',
      CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
      ANTHROPIC_API_KEY: 'sk-ant-unfunded',
    })
    expect(child).toMatchObject({ PATH: '/usr/bin', CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token' })
    expect(child).not.toHaveProperty('CLAUDECODE')
    expect(child).not.toHaveProperty('CLAUDE_CODE_ENTRYPOINT')
    expect(child).not.toHaveProperty('CLAUDE_CODE_SESSION_ID')
    expect(child).not.toHaveProperty('ANTHROPIC_API_KEY')
    expect(cliChildEnv({ ANTHROPIC_API_KEY: 'sk-ant-funded' })).toHaveProperty('ANTHROPIC_API_KEY')
    expect(cliChildEnv({ ANTHROPIC_API_KEY: 'k', DAILY_BREAD_CLAUDE_CLI_AUTH: 'login' })).not.toHaveProperty('ANTHROPIC_API_KEY')
  })

  it('a lookup past the end of a chapter names only the verses that exist', async () => {
    expect((await bsbLookup('Matthew 6:34-36')).canonical).toBe('Matthew 6:34')
    expect((await bsbLookup('John 3:16')).canonical).toBe('John 3:16')
    expect((await bsbLookup('Jude 3-5')).canonical).toBe('Jude 3-5')
  })
})

const INPUT: FrameInput = {
  dateSlug: '2026-09-14',
  scripture: {
    reference: 'Matthew 6:33',
    text: 'But seek first the kingdom of God and His righteousness, and all these things will be added unto you.',
    translation: 'BSB',
  },
  title: 'Seek first',
  teaser: 'THE PIVOT: What would change if the kingdom came first today.',
  seriesTitle: 'Kingdom',
  liturgicalLabel: 'Ordinary Time',
  comicCandidates: [
    { id: 'the-lost-sheep', title: 'The Lost Sheep', scriptureReference: 'Luke 15:4-5' },
    { id: 'lamp-on-a-stand', title: 'A Lamp on a Stand', scriptureReference: 'Matthew 5:15' },
  ],
  recentScenes: ['grain'],
  seed: 12345,
}

describe('editorial frame', () => {
  it('accepts a clean frame and fills verse text from the BSB (never from the model)', async () => {
    const frame = await resolveFrame(
      {
        deck: 'A plain question for the morning: what would it look like to put the kingdom ahead of the list today.',
        rabbitHoles: [
          { reference: 'Luke 12:31', why: 'Luke sets the same saying beside ravens and lilies and a worried crowd.' },
          { reference: 'Romans 14:17', why: 'Paul describes what that kingdom is made of when food is not the point.' },
        ],
        comicTemplateId: 'the-lost-sheep',
        scene: 'grain',
        sceneLabel: 'Wheat under a low sun',
      },
      INPUT,
      bsbLookup,
    )
    expect(frame.rabbitHoles).toHaveLength(2)
    expect(frame.rabbitHoles[0].text).toContain('seek His kingdom')
  })

  it('rejects quotations, invented references, unknown templates, and forbidden patterns', async () => {
    const err = await resolveFrame(
      {
        deck: 'In today\'s world, "seek first" is hard, and at the end of the day that matters.',
        rabbitHoles: [
          { reference: 'Hezekiah 3:16', why: 'A verse that does not exist in any Bible at all, invented.' },
          { reference: 'Matthew 6:33', why: 'Same as the primary Scripture, which is not a rabbit hole.' },
        ],
        comicTemplateId: 'echo-and-dust-001',
        scene: 'volcano',
        sceneLabel: 'x',
      },
      INPUT,
      bsbLookup,
    ).catch((e) => e)
    expect(err).toBeInstanceOf(OutputValidationError)
    const text = (err as OutputValidationError).problems.join(' | ')
    expect(text).toMatch(/quotation/)
    expect(text).toMatch(/In today's world/)
    expect(text).toMatch(/unparseable reference|not found/)
    expect(text).toMatch(/overlaps the primary Scripture/)
    expect(text).toMatch(/comicTemplateId/)
    expect(text).toMatch(/scene: unknown/)
  })

  it('a rabbit hole inside the day’s own passage is rejected (gpt-5-nano offered Matthew 6:26 for 6:25-30)', async () => {
    const input = { ...INPUT, scripture: { ...INPUT.scripture, reference: 'Matthew 6:25-30' } }
    const err = await resolveFrame(
      {
        deck: 'A plain question for the morning: what would it look like to put the kingdom ahead of the list today.',
        rabbitHoles: [
          { reference: 'Matthew 6:26', why: 'Shows creatures cared for by God, inviting trust beyond everyday worry.' },
          { reference: 'Luke 12:24', why: 'Luke gives the ravens the same place in the argument against anxiety.' },
          { reference: 'Luke 12:23-24', why: 'Overlaps the rabbit hole above and should be refused as a duplicate.' },
        ],
        comicTemplateId: 'the-lost-sheep',
        scene: 'grain',
        sceneLabel: 'Wheat under a low sun',
      },
      input,
      bsbLookup,
    ).catch((e) => e)
    const text = (err as OutputValidationError).problems.join(' | ')
    expect(text).toMatch(/rabbitHoles\[0\]: overlaps/)
    expect(text).not.toMatch(/rabbitHoles\[1\]/)
    expect(text).toMatch(/rabbitHoles\[2\]: overlaps/)
  })

  it('reasoning models get max_completion_tokens and no temperature; costs use verified list prices', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ model: 'gpt-5-nano-2025-08-07', choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 1000, completion_tokens: 1000 } }),
    )
    const out = await createOpenAiProvider({ env: { OPENAI_API_KEY: 'sk-proj-TESTKEY0000000000000000' }, fetchImpl })
      .generate({ task: 't', system: 's', prompt: 'p', maxOutputTokens: 900, temperature: 0.5, signal: new AbortController().signal })
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body).toMatchObject({ model: 'gpt-5-nano', max_completion_tokens: 4000, reasoning_effort: 'minimal' })
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('max_tokens')
    expect(out.estimatedCostUsd).toBeCloseTo(0.00045, 8)
    expect(openAiCostUsd('gpt-4.1-nano-2025-04-14', 1_000_000, 0)).toBeCloseTo(0.1, 8)
    expect(openAiCostUsd('unknown-model', 10, 10)).toBeUndefined()
  })

  it('the deterministic frame needs no provider and strips outline labels from the deck', async () => {
    const out = await composeFrame(INPUT, { providers: [], lookup: bsbLookup, pickComic: () => 'lamp-on-a-stand' })
    expect(out.deterministic).toBe(true)
    expect(out.value.deck.startsWith('What would change')).toBe(true)
    expect(out.value.comicTemplateId).toBe('lamp-on-a-stand')
    expect(out.value.rabbitHoles.length).toBeGreaterThan(0)
    expect(out.value.scene).not.toBe('grain') // yesterday was grain
  })

  it('a model frame that passes validation is used; one that fails falls back', async () => {
    const good = JSON.stringify({
      deck: 'A plain question for the morning: what would it look like to put the kingdom ahead of the list today.',
      rabbitHoles: [
        { reference: 'Luke 12:31', why: 'Luke sets the same saying beside ravens and lilies and a worried crowd.' },
        { reference: 'Romans 14:17', why: 'Paul describes what that kingdom is made of when food is not the point.' },
      ],
      comicTemplateId: 'the-lost-sheep',
      scene: 'living-water',
      sceneLabel: 'Slow water at first light',
    })
    const ok = await composeFrame(INPUT, {
      providers: [provider('claude-api', async () => good)],
      lookup: bsbLookup,
      pickComic: () => 'lamp-on-a-stand',
      sleep: noSleep,
    })
    expect(ok).toMatchObject({ provider: 'claude-api', deterministic: false })
    expect(ok.value.scene).toBe('living-water')

    const bad = await composeFrame(INPUT, {
      providers: [provider('claude-api', async () => '{"deck":"\\"quoted\\""}')],
      lookup: bsbLookup,
      pickComic: () => 'lamp-on-a-stand',
      sleep: noSleep,
    })
    expect(bad.deterministic).toBe(true)
  })

  it('context rabbit holes are the real neighbouring verses', async () => {
    const holes = await contextRabbitHoles('John 3:16', bsbLookup)
    expect(holes.map((h) => h.reference)).toEqual(['John 3:13-15', 'John 3:17-19'])
  })

  it('scene keywords win, but never yesterday’s scene', () => {
    expect(deterministicScene({ ...INPUT, scripture: { ...INPUT.scripture, text: 'He leads me beside still waters.' }, recentScenes: [] })).toBe('living-water')
    expect(deterministicScene({ ...INPUT, scripture: { ...INPUT.scripture, text: 'the bread and the harvest' }, recentScenes: ['grain'] })).not.toBe('grain')
  })

  it('prose guard flags first person and markup', () => {
    expect(proseProblems('I think this is <b>bold</b> and long enough to pass length.', 'x', { min: 1, max: 200 }).join(' ')).toMatch(/first-person.*|markup/)
  })
})
