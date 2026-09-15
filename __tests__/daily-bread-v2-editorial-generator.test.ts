// @vitest-environment node
/**
 * Plan §21 (SA-142 / F-184): one provider-neutral editorial generation
 * interface, with the pre-V2 Claude workflows — the SA-100 Sunday lead and the
 * SA-114 How-to-Read guides — implemented behind it and their prompts kept.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEditorialGenerator } from '@/lib/daily-bread/generate/editorial'
import { FRAME_PROMPT_VERSION } from '@/lib/daily-bread/generate/frame'
import { generatedTextProblems } from '@/lib/daily-bread/generate/guards'
import {
  composeSundayLead,
  SUNDAY_LEAD_PROMPT_VERSION,
  sundayLeadPayload,
  sundayLeadProblems,
  sundayLeadPrompt,
  type SundayLead,
} from '@/lib/daily-bread/generate/sunday-lead'
import {
  composeGuides,
  GUIDES_PROMPT_VERSION,
  guidesProblems,
  guidesPrompt,
  parseGuides,
} from '@/lib/daily-bread/generate/guides'
import { fallbackLevel, ProviderChainExhausted } from '@/lib/daily-bread/providers/chain'
import { createClaudeCliProvider } from '@/lib/daily-bread/providers/claude-cli'
import { ProviderError, type TextGenerationRequest, type TextProvider } from '@/lib/daily-bread/providers/types'

const noSleep = async () => {}

function recorder(id: TextProvider['id'], reply: (req: TextGenerationRequest) => string, canReadFiles = false) {
  const requests: TextGenerationRequest[] = []
  const provider: TextProvider = {
    id,
    model: `${id}-model`,
    canReadFiles,
    available: () => true,
    async generate(request) {
      requests.push(request)
      return { text: reply(request), model: `${id}-model` }
    },
  }
  return { provider, requests }
}

const BRIEF = {
  theme: 'Come to me, all who are weary',
  scriptureReference: 'Matthew 11:28-30',
  struggle: 'carrying more than you were built for',
}
const SCRIPTURE = {
  canonical: 'Matthew 11:28-30',
  text: 'Come to Me, all you who are weary and burdened, and I will give you rest. Take My yoke upon you and learn from Me, for I am gentle and humble in heart, and you will find rest for your souls. For My yoke is easy and My burden is light.',
}

function leadBody(words: number, quote = true): string {
  const span = 'Come to Me, all you who are weary and burdened, and I will give you rest.'
  const filler = Array.from({ length: words }, (_, i) => (i % 9 === 8 ? 'rest.' : 'word')).join(' ')
  return quote ? `${span}\n\n${filler}` : filler
}

const GOOD_LEAD: SundayLead = {
  title: 'The yoke that fits',
  body: leadBody(900),
  pullQuotes: ['What are you carrying that was never yours?', 'Where would rest begin?', 'extra'],
}

describe('EditorialGenerator', () => {
  it('routes a task through the providers in order and reports who wrote it', async () => {
    const claude = recorder('claude-cli', () => {
      throw new ProviderError('claude-cli: exit 1 (quota)', { retryable: false })
    })
    const openai = recorder('openai', () => '{"n": 3}')
    const generator = createEditorialGenerator({ providers: [claude.provider, openai.provider], sleep: noSleep })
    const out = await generator.generate({
      task: 't',
      promptVersion: 4,
      system: 's',
      prompt: 'p',
      maxOutputTokens: 10,
      parse: (text) => JSON.parse(text) as { n: number },
      deterministic: () => ({ n: 0 }),
    })
    expect(out).toMatchObject({ value: { n: 3 }, provider: 'openai', deterministic: false })
    expect(out.usage.map((u) => [u.provider, u.ok, u.promptVersion])).toEqual([
      ['claude-cli', false, 4],
      ['openai', true, 4],
    ])
  })

  it('a task with no floor fails loudly with every provider’s reason, never an invented value', async () => {
    const claude = recorder('claude-cli', () => {
      throw new ProviderError('claude-cli: exit 1 (quota)', { retryable: false })
    })
    const generator = createEditorialGenerator({ providers: [claude.provider], sleep: noSleep })
    const failure = await generator
      .generate({ task: 'sunday-lead', promptVersion: 1, system: '', prompt: 'p', maxOutputTokens: 10, parse: (t) => t })
      .catch((e) => e)
    expect(failure).toBeInstanceOf(ProviderChainExhausted)
    expect(failure.message).toBe('sunday-lead: no provider produced valid output — claude-cli: exit 1 (quota)')
  })

  it('file access goes only to a provider that can read files; the others get the prompt that does not ask for it', async () => {
    const cli = recorder('claude-cli', () => {
      throw new ProviderError('claude-cli: timed out', { retryable: false })
    }, true)
    const api = recorder('claude-api', () => 'ok')
    const generator = createEditorialGenerator({ providers: [cli.provider, api.provider], sleep: noSleep })
    await generator.generate({
      task: 't',
      promptVersion: 1,
      system: '',
      prompt: 'search the index',
      files: { dir: '/repo', promptWithoutFiles: 'no index' },
      maxOutputTokens: 10,
      parse: (t) => t,
    })
    expect(cli.requests[0]).toMatchObject({ prompt: 'search the index', readOnlyDir: '/repo' })
    expect(api.requests[0].prompt).toBe('no index')
    expect(api.requests[0]).not.toHaveProperty('readOnlyDir')
    expect(api.requests[0]).not.toHaveProperty('files')
  })
})

describe('the Sunday lead (SA-100) behind the interface', () => {
  it('keeps the SA-100 prompt: brief, verbatim scripture and every rule, with JSON as the answer', () => {
    const prompt = sundayLeadPrompt(BRIEF, SCRIPTURE, { files: true })
    expect(prompt).toContain("You are composing THE SUNDAY FEATURE for Euangelion's Daily Bread — a devotional feature article. It lands as a DRAFT for human review, so write your best and invent nothing.")
    expect(prompt).toContain(`- Theme: ${BRIEF.theme}\n- Scripture: ${SCRIPTURE.canonical}\n- The reader's condition this speaks to: ${BRIEF.struggle}`)
    expect(prompt).toContain(`THE SCRIPTURE TEXT (BSB, verbatim — quote from THIS text only, never from memory):\n${SCRIPTURE.text}`)
    expect(prompt).toContain('match the voice in docs/PUBLIC-FACING-LANGUAGE.md (read it).')
    expect(prompt).toContain('ONLY if you take them verbatim from public/reference-index.json in this repo (search it; every chunk carries its source). Never quote from memory. If nothing fits, use none.')
    expect(prompt).toContain('4. No headers in the body; paragraphs separated by blank lines. No em-dashes.')
    expect(prompt).toContain('{"title": "...", "body": "...", "pullQuotes": ["...", "..."]}')
    expect(prompt).not.toContain('/tmp/sunday-lead.json')
  })

  it('a provider that cannot read files is never told to search them, and may not quote historic voices', () => {
    const prompt = sundayLeadPrompt(BRIEF, SCRIPTURE, { files: false })
    expect(prompt).not.toContain('reference-index')
    expect(prompt).not.toContain('docs/')
    expect(prompt).toContain('3. Do not quote historic voices.')
    expect(prompt).toContain('quote a contiguous span of the scripture above, at least 12 words, verbatim')
  })

  it('keeps the SA-100 checks: word range and a 12-word verbatim span of the scripture', () => {
    expect(sundayLeadProblems(GOOD_LEAD, SCRIPTURE.text)).toEqual([])
    expect(sundayLeadProblems({ ...GOOD_LEAD, body: leadBody(300) }, SCRIPTURE.text)[0]).toMatch(/words — outside 700–1400/)
    expect(sundayLeadProblems({ ...GOOD_LEAD, body: leadBody(900, false) }, SCRIPTURE.text)).toEqual([
      'composed lead never quotes a 12-word contiguous span of the scripture — grounding check failed',
    ])
  })

  it('composes through the generator — Claude Code with repo access first — and writes the SA-100 draft payload', async () => {
    const cli = recorder('claude-cli', () => JSON.stringify(GOOD_LEAD), true)
    const generator = createEditorialGenerator({ providers: [cli.provider], sleep: noSleep })
    const out = await composeSundayLead({ generator, brief: BRIEF, scripture: SCRIPTURE, repoDir: '/repo' })
    expect(out.provider).toBe('claude-cli')
    expect(cli.requests[0]).toMatchObject({ task: 'sunday-lead', readOnlyDir: '/repo', system: '' })
    expect(sundayLeadPayload(BRIEF, SCRIPTURE, out.value)).toEqual({
      mode: 'authored',
      title: 'The yoke that fits',
      standfirst: BRIEF.theme,
      body: GOOD_LEAD.body,
      scriptureReference: 'Matthew 11:28-30',
      pullQuotes: GOOD_LEAD.pullQuotes.slice(0, 2),
    })
  })

  it('an ungrounded lead goes back once with the reason, then the chain moves on', async () => {
    const cli = recorder('claude-cli', () => JSON.stringify({ ...GOOD_LEAD, body: leadBody(900, false) }), true)
    const openai = recorder('openai', () => JSON.stringify(GOOD_LEAD))
    const generator = createEditorialGenerator({ providers: [cli.provider, openai.provider], sleep: noSleep })
    const out = await composeSundayLead({ generator, brief: BRIEF, scripture: SCRIPTURE, repoDir: '/repo' })
    expect(cli.requests).toHaveLength(2)
    expect(cli.requests[1].prompt).toContain('- composed lead never quotes a 12-word contiguous span')
    expect(out.provider).toBe('openai')
    expect(openai.requests[0].prompt).not.toContain('reference-index')
  })
})

const guide = (kicker: string, words = 300) => ({
  kicker,
  title: 'Read one book whole',
  standfirst: 'A book is a letter; read it in one sitting.',
  steps: ['Pick a short book', 'Read it aloud', 'Write one sentence'],
  minutes: '6 MIN',
  body: Array.from({ length: 4 }, () => Array.from({ length: Math.ceil(words / 4) }, () => 'word').join(' ')),
})

describe('How to Read guides (SA-114) behind the interface', () => {
  it('keeps the SA-114 prompt and lists what is already covered', () => {
    const prompt = guidesPrompt('2026-09-15', ['Lectio divina', 'Using a concordance'])
    expect(prompt).toContain('You write the "How to read" column for The Daily Bread')
    expect(prompt).toContain('for the 2026-09-15 edition.')
    expect(prompt).toContain('ALREADY-COVERED topics (do NOT repeat or closely echo):\n- Lectio divina\n- Using a concordance')
    expect(prompt).toContain('Answer ONLY this JSON (no fences): an array of EXACTLY 3 objects:')
    expect(guidesPrompt('2026-09-15', [])).toContain('- (none yet)')
  })

  it('keeps the SA-114 rules and reports every broken one', () => {
    expect(guidesProblems([guide('Method'), guide('Practice'), guide('Tools')])).toEqual([])
    expect(guidesProblems([guide('Method')])).toEqual(['need exactly 3'])
    expect(guidesProblems([guide('Sermon'), guide('Practice', 100), { ...guide('Tools'), steps: ['one'] }])).toEqual([
      'article 1: kicker Sermon',
      'article 2: body too thin',
      'article 3: steps 3-5',
    ])
  })

  it('parses a fenced or chatty array', () => {
    expect(parseGuides('```json\n[1,2,3]\n```')).toEqual([1, 2, 3])
    expect(() => parseGuides('{"not": "an array"}')).toThrow('no JSON array in output')
  })

  it('composes through the generator without file access', async () => {
    const set = [guide('Method'), guide('Practice'), guide('Getting started')]
    const cli = recorder('claude-cli', () => JSON.stringify(set), true)
    const generator = createEditorialGenerator({ providers: [cli.provider], sleep: noSleep })
    const out = await composeGuides({ generator, date: '2026-09-15', coveredTitles: [] })
    expect(out.value).toHaveLength(3)
    expect(cli.requests[0]).not.toHaveProperty('readOnlyDir')
  })
})

describe('claude-cli transport', () => {
  function fakeClaude(): { bin: string; dir: string } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'db2-fake-claude-'))
    const bin = path.join(dir, 'claude')
    fs.writeFileSync(bin, '#!/bin/sh\nprintf "cwd=%s\\n" "$(pwd -P)"\nfor a in "$@"; do printf "arg=[%s]\\n" "$a"; done\nprintf "stdin=%s" "$(cat)"\n')
    fs.chmodSync(bin, 0o755)
    return { bin, dir }
  }

  it('runs without tools in a neutral directory by default, and sends a system-less prompt as-is', async () => {
    const { bin } = fakeClaude()
    const p = createClaudeCliProvider({ env: { CLAUDE_CODE_OAUTH_TOKEN: 't' }, bin })
    const out = await p.generate({ task: 't', system: '', prompt: 'hello', maxOutputTokens: 5, signal: new AbortController().signal })
    expect(out.text).toContain('arg=[--tools]\narg=[]\n')
    expect(out.text).not.toContain('--allowedTools')
    expect(out.text).toContain(`cwd=${fs.realpathSync(os.tmpdir())}`)
    expect(out.text.endsWith('stdin=hello')).toBe(true)
  })

  it('a file-reading task runs in its directory with Read and Grep only', async () => {
    const { bin, dir } = fakeClaude()
    const p = createClaudeCliProvider({ env: { CLAUDE_CODE_OAUTH_TOKEN: 't' }, bin })
    const out = await p.generate({
      task: 't',
      system: 'sys',
      prompt: 'search',
      maxOutputTokens: 5,
      readOnlyDir: dir,
      signal: new AbortController().signal,
    })
    expect(out.text).toContain(`cwd=${fs.realpathSync(dir)}`)
    expect(out.text).toContain('arg=[--tools]\narg=[Read,Grep]\narg=[--allowedTools]\narg=[Read,Grep]\n')
    expect(out.text).toContain('arg=[--setting-sources]\narg=[]\n')
    expect(out.text.endsWith('stdin=sys\n\n---\n\nsearch')).toBe(true)
  })
})

describe('output validation (plan §26)', () => {
  it('flags placeholder residue, refusal text, HTML, unsafe links and malformed characters', () => {
    expect(generatedTextProblems('A plain, finished sentence about bread.', 'deck')).toEqual([])
    expect(generatedTextProblems('Read [insert verse here] slowly.', 'deck')).toEqual(['deck: placeholder text'])
    expect(generatedTextProblems('Lorem ipsum dolor sit amet.', 'body')).toEqual(['body: placeholder text'])
    expect(generatedTextProblems('TODO: finish the ending', 'body')).toEqual(['body: placeholder text'])
    expect(generatedTextProblems('Welcome, {{name}}.', 'body')).toEqual(['body: placeholder text'])
    expect(generatedTextProblems("I'm sorry, but I can't help with that.", 'body')).toEqual(['body: refusal text'])
    expect(generatedTextProblems('As an AI, reflection is new to me.', 'body')).toEqual(['body: refusal text'])
    expect(generatedTextProblems('Read <b>slowly</b>.', 'body')).toEqual(['body: contains HTML'])
    expect(generatedTextProblems('Follow javascript:alert(1)', 'body')).toEqual(['body: unsafe link'])
    expect(generatedTextProblems('Broken � text', 'body')).toEqual(['body: malformed characters'])
    expect(generatedTextProblems('Broken \u0007 text', 'body')).toEqual(['body: malformed characters'])
    expect(generatedTextProblems('   ', 'title')).toEqual(['title: empty'])
    // Ordinary devotional prose is not a refusal or a placeholder.
    expect(generatedTextProblems('You cannot enter the womb a second time. Nobody is asking you to.', 'body')).toEqual([])
  })

  it('a refusal is rejected as a refusal, fed back once, and the chain moves on', async () => {
    const cli = recorder('claude-cli', () => "I'm sorry, but I can't write that article.")
    const openai = recorder('openai', () => '{"n": 1}')
    const generator = createEditorialGenerator({ providers: [cli.provider, openai.provider], sleep: noSleep })
    const out = await generator.generate({
      task: 't',
      promptVersion: 1,
      system: '',
      prompt: 'p',
      maxOutputTokens: 10,
      parse: (text) => JSON.parse(text) as { n: number },
    })
    expect(out.provider).toBe('openai')
    expect(cli.requests).toHaveLength(2)
    expect(cli.requests[1].prompt).toContain('- refusal output')
    expect(out.usage[0].error).toContain('refusal output')
  })

  it('an empty answer is rejected before parsing', async () => {
    const cli = recorder('claude-cli', () => '   ')
    const generator = createEditorialGenerator({ providers: [cli.provider], retries: 0, sleep: noSleep })
    const failure = await generator
      .generate({ task: 't', promptVersion: 1, system: '', prompt: 'p', maxOutputTokens: 10, parse: (t) => t })
      .catch((e) => e)
    expect(failure.message).toContain('empty output')
  })

  it('the Sunday lead and the guides apply the same text checks', () => {
    expect(sundayLeadProblems({ ...GOOD_LEAD, title: 'TODO title' }, SCRIPTURE.text)).toEqual(['title: placeholder text'])
    expect(sundayLeadProblems({ ...GOOD_LEAD, pullQuotes: ['Only one?'] }, SCRIPTURE.text)).toEqual(['composed lead needs 2 pull quotes'])
    const set = [guide('Method'), guide('Practice'), { ...guide('Tools'), steps: ['Open <em>John</em>', 'Read', 'Pray'] }]
    expect(guidesProblems(set)).toEqual(['article 3 step 1: contains HTML'])
  })
})

describe('generation provenance (plan §27)', () => {
  it('fallback level follows the plan’s chain: Claude 0, secondary 1, deterministic 2', () => {
    expect(fallbackLevel('claude-cli')).toBe(0)
    expect(fallbackLevel('claude-api')).toBe(0)
    expect(fallbackLevel('openai')).toBe(1)
    expect(fallbackLevel('gemini')).toBe(1)
    expect(fallbackLevel('deterministic')).toBe(2)
  })

  it('each task declares its prompt version', () => {
    expect(FRAME_PROMPT_VERSION).toBe(3)
    expect(SUNDAY_LEAD_PROMPT_VERSION).toBe(2)
    expect(GUIDES_PROMPT_VERSION).toBe(1)
  })
})
