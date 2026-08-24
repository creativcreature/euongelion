# CI Quota Failover (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The devotional and daily-bread automations survive account #1's quota running out, without a human in the loop.

**Architecture:** A tier ladder (account 1 → account 2 → a dedicated capped API key) selected by a cheap pre-flight probe before any expensive work. `ci-orchestrate.sh` becomes five checkpointed stages so a mid-run quota death resumes on the next tier without re-spending ElevenLabs or Codex credits. Tier 3 runs the _same committed devo-go skill text_ through the API rather than a second composer.

**Tech Stack:** POSIX shell, Node 20 (`.mjs` scripts), GitHub Actions, `@anthropic-ai/sdk`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-23-dual-account-failover-design.md`

**Prerequisite:** Part B Task 6 — repo secret `CLAUDE_CODE_OAUTH_TOKEN_2` must exist. Part B tasks 1–5 are complete as of 2026-08-24.

## Global Constraints

- Tier order is fixed: `CLAUDE_CODE_OAUTH_TOKEN` → `CLAUDE_CODE_OAUTH_TOKEN_2` → `CONTENT_PIPELINE_API_KEY`.
- `CONTENT_PIPELINE_API_KEY` is a **new, dedicated** Anthropic key with a console-side spend cap. Never reuse the site's `ANTHROPIC_API_KEY`; the Worker keeps its own key (SA-100).
- Exactly one credential env var may be set when Claude Code runs. The others must be `unset`, not empty.
- Tier transitions are always logged. Reaching tier 3, or exhausting all tiers, must additionally open a GitHub issue.
- The reading gate (SA-029) is untouched: automation stops at the gate and never publishes.
- Tier-3 output must be labelled as such in the gate artifact.
- The 12-word contiguous BSB verbatim gate applies to every tier. A composition that fails it fails the build.

---

### Task 1: Capture the real quota signals

**Files:**

- Create: `scripts/lib/fixtures/tier-exhausted.txt`
- Create: `scripts/lib/fixtures/tier-expired.txt`
- Create: `scripts/lib/fixtures/tier-healthy.txt`

**Interfaces:**

- Produces: three fixture files holding verbatim CLI output, consumed by Task 2's classifier tests.

This closes spec open question 1. Do not guess these strings.

- [ ] **Step 1: Capture a healthy response**

```bash
mkdir -p scripts/lib/fixtures
CLAUDE_CODE_OAUTH_TOKEN="$(cat ~/.claude-shared/.tier1-token 2>/dev/null || echo skip)" \
  claude -p 'ok' > scripts/lib/fixtures/tier-healthy.txt 2>&1; echo "exit=$?"
```

If you do not have a token file, run `claude -p 'ok'` on a logged-in account and save the output.

- [ ] **Step 2: Capture an invalid-token response**

```bash
CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-invalid-deadbeef" \
  claude -p 'ok' > scripts/lib/fixtures/tier-expired.txt 2>&1; echo "exit=$?"
cat scripts/lib/fixtures/tier-expired.txt
```

- [ ] **Step 3: Capture an exhausted-quota response**

Run `claude -p 'ok'` on the account that is at cap once it actually caps, and save stdout+stderr to `scripts/lib/fixtures/tier-exhausted.txt`. Record the exit code as the first line of the file, prefixed `EXIT=`.

If account #1 has not capped yet, mark this step blocked and proceed — Task 2's classifier treats _any_ unrecognised non-zero exit as `exhausted` (fail-safe: advance the tier) while still alerting, so the ladder works before the fixture exists.

- [ ] **Step 4: Record exit codes**

Prepend `EXIT=<code>` as the first line of each fixture if not already present.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/fixtures
git commit -m "test: capture verbatim Claude CLI tier fixtures"
```

---

### Task 2: Tier classifier and pre-flight probe

**Files:**

- Create: `scripts/lib/claude-tier.sh`
- Create: `__tests__/claude-tier.test.ts`

**Interfaces:**

- Consumes: fixtures from Task 1.
- Produces:
  - `classify_tier_output <exit_code> <output_file>` → prints one of `healthy` | `exhausted` | `invalid`.
  - `select_tier` → probes tiers in order; exports `CLAUDE_TIER` (`1`|`2`|`3`) and the single matching credential env var; unsets the others. Returns 1 if no tier is usable.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/claude-tier.test.ts
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function classify(exitCode: number, output: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'tier-'))
  const f = join(dir, 'out.txt')
  writeFileSync(f, output)
  return execFileSync('sh', [
    '-c',
    `. scripts/lib/claude-tier.sh; classify_tier_output ${exitCode} ${f}`,
  ])
    .toString()
    .trim()
}

describe('classify_tier_output', () => {
  it('treats exit 0 as healthy', () => {
    expect(classify(0, 'ok')).toBe('healthy')
  })
  it('detects an invalid or expired token', () => {
    expect(classify(1, 'Invalid API key · Please run /login')).toBe('invalid')
    expect(classify(1, 'OAuth token has expired')).toBe('invalid')
  })
  it('detects an exhausted subscription', () => {
    expect(classify(1, 'Claude AI usage limit reached|1234567890')).toBe(
      'exhausted',
    )
  })
  it('fails safe: unrecognised non-zero output advances the tier', () => {
    expect(classify(1, 'some unexpected network burp')).toBe('exhausted')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/claude-tier.test.ts`
Expected: FAIL — `scripts/lib/claude-tier.sh` not found.

- [ ] **Step 3: Write minimal implementation**

```sh
# scripts/lib/claude-tier.sh
# Tier ladder for subscription-billed composition. Source, don't execute.

classify_tier_output() {
  _code="$1"; _file="$2"
  [ "$_code" = "0" ] && { echo healthy; return; }
  if grep -qiE 'invalid api key|invalid.*token|token has expired|please run /login|unauthorized' "$_file"; then
    echo invalid; return
  fi
  # Anything else non-zero is treated as exhausted so the ladder advances.
  echo exhausted
}

_probe_tier() {
  # $1 = env var name, $2 = its value
  [ -n "$2" ] || return 2
  _out=$(mktemp)
  env -u CLAUDE_CODE_OAUTH_TOKEN -u CLAUDE_CODE_OAUTH_TOKEN_2 \
      -u ANTHROPIC_API_KEY -u CONTENT_PIPELINE_API_KEY \
      "$1=$2" claude -p 'ok' >"$_out" 2>&1
  _code=$?
  _verdict=$(classify_tier_output "$_code" "$_out")
  rm -f "$_out"
  [ "$_verdict" = "healthy" ]
}

select_tier() {
  unset ANTHROPIC_API_KEY

  if _probe_tier CLAUDE_CODE_OAUTH_TOKEN "${CLAUDE_CODE_OAUTH_TOKEN:-}"; then
    export CLAUDE_TIER=1
    unset CLAUDE_CODE_OAUTH_TOKEN_2 CONTENT_PIPELINE_API_KEY
    echo "[tier] 1 — account 1 subscription"
    return 0
  fi
  echo "[tier] 1 unavailable, advancing" >&2

  if _probe_tier CLAUDE_CODE_OAUTH_TOKEN "${CLAUDE_CODE_OAUTH_TOKEN_2:-}"; then
    export CLAUDE_TIER=2
    export CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN_2"
    unset CONTENT_PIPELINE_API_KEY
    echo "[tier] 2 — account 2 subscription"
    return 0
  fi
  echo "[tier] 2 unavailable, advancing to metered API floor" >&2

  if [ -n "${CONTENT_PIPELINE_API_KEY:-}" ]; then
    export CLAUDE_TIER=3
    export ANTHROPIC_API_KEY="$CONTENT_PIPELINE_API_KEY"
    unset CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_2
    echo "[tier] 3 — dedicated metered API key"
    return 0
  fi

  echo "[tier] NO TIER AVAILABLE" >&2
  return 1
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/claude-tier.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/claude-tier.sh __tests__/claude-tier.test.ts
git commit -m "feat: tier classifier and pre-flight probe for quota failover"
```

---

### Task 3: Checkpointed stages in ci-orchestrate.sh

**Files:**

- Modify: `scripts/devo-weekly/ci-orchestrate.sh`
- Create: `scripts/devo-weekly/lib/stages.sh`
- Create: `__tests__/devo-stages.test.ts`

**Interfaces:**

- Consumes: `select_tier` from Task 2.
- Produces:
  - `stage_done <run_dir> <name>` → exit 0 if that stage already completed.
  - `mark_stage <run_dir> <name>` → records completion.
  - `run_stage <run_dir> <name> <command...>` → skips if done, else runs and marks.

Stage order is fixed: `thematic`, `compose`, `narrate`, `imagery`, `assemble`. `narrate` and `imagery` spend real money and must never re-run.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/devo-stages.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let run: string
const sh = (script: string) =>
  execFileSync('sh', [
    '-c',
    `. scripts/devo-weekly/lib/stages.sh; ${script}`,
  ]).toString()

beforeEach(() => {
  run = mkdtempSync(join(tmpdir(), 'devorun-'))
})

describe('stage checkpointing', () => {
  it('runs a stage that has not completed', () => {
    const out = sh(`run_stage ${run} narrate echo SPENT`)
    expect(out).toContain('SPENT')
  })
  it('skips a stage that already completed', () => {
    sh(`mark_stage ${run} narrate`)
    const out = sh(`run_stage ${run} narrate echo SPENT`)
    expect(out).not.toContain('SPENT')
    expect(out).toContain('skip')
  })
  it('does not mark a stage that failed', () => {
    try {
      sh(`run_stage ${run} imagery false`)
    } catch {
      /* expected */
    }
    expect(existsSync(join(run, 'stages', 'imagery.done'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/devo-stages.test.ts`
Expected: FAIL — `scripts/devo-weekly/lib/stages.sh` not found.

- [ ] **Step 3: Write minimal implementation**

```sh
# scripts/devo-weekly/lib/stages.sh
stage_done() { [ -f "$1/stages/$2.done" ]; }

mark_stage() { mkdir -p "$1/stages"; date -u +%FT%TZ > "$1/stages/$2.done"; }

run_stage() {
  _run="$1"; _name="$2"; shift 2
  if stage_done "$_run" "$_name"; then
    echo "[stage] skip $_name (already complete)"
    return 0
  fi
  echo "[stage] run $_name (tier ${CLAUDE_TIER:-?})"
  "$@" || return $?
  mark_stage "$_run" "$_name"
  echo "[stage] done $_name"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/devo-stages.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire into ci-orchestrate.sh**

At the top, after `set -euo pipefail`:

```sh
. "$(dirname "$0")/lib/stages.sh"
. "$(dirname "$0")/../lib/claude-tier.sh"
RUN_DIR="${RUN_DIR:-.devo-run/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$RUN_DIR"
select_tier || { echo "no usable tier; aborting" >&2; exit 78; }
```

Then wrap each existing block: the thematic `claude -p` call becomes
`run_stage "$RUN_DIR" thematic <that command>`, and likewise for the
devo-go call (`compose`). Narration, imagery and the commit/push block get
`narrate`, `imagery` and `assemble`.

- [ ] **Step 6: Commit**

```bash
git add scripts/devo-weekly/lib/stages.sh scripts/devo-weekly/ci-orchestrate.sh __tests__/devo-stages.test.ts
git commit -m "feat: checkpointed stages so quota failover never re-spends credits"
```

---

### Task 4: Enumerate devo-go's tool surface

**Files:**

- Create: `docs/run/TIER3-TOOL-SURFACE.md`

**Interfaces:**

- Produces: the definitive list of capabilities the tier-3 arm must reproduce. Task 5 implements against this list and nothing else.

This closes spec open question 2 and must precede Task 5.

- [ ] **Step 1: Read the skill's workflow**

```bash
cat .claude/skills/devo-go/SKILL.md
cat .claude/skills/devo-go/references/workflow.md
cat .claude/skills/devo-go/references/verification-standards.md
```

- [ ] **Step 2: Write the enumeration**

Create `docs/run/TIER3-TOOL-SURFACE.md` with one row per capability devo-go
relies on, in this exact table shape:

```markdown
| Capability   | Used for                          | Tier-3 substitute | Reproducible? |
| ------------ | --------------------------------- | ----------------- | ------------- |
| Read (files) | grounding index, lexicons, corpus | node fs           | yes           |
| WebSearch    | ...                               | ...               | ...           |
```

Any row marked **no** becomes an explicit capability difference recorded in
the gate artifact by Task 5.

- [ ] **Step 3: Commit**

```bash
git add docs/run/TIER3-TOOL-SURFACE.md
git commit -m "docs: enumerate devo-go tool surface for the tier-3 API arm"
```

---

### Task 5: Tier-3 API composition arm

**Files:**

- Create: `scripts/devo-weekly/compose-api.mjs`
- Create: `__tests__/compose-api.test.ts`

**Interfaces:**

- Consumes: `docs/run/TIER3-TOOL-SURFACE.md` (Task 4).
- Produces: `composeViaApi({ thematic, outDir })` → `{ text, tier: 3, capabilityGaps: string[] }`.

The arm loads the **same committed skill text**. It must never contain its own
authored voice guidance — if it needs a rule, that rule belongs in
`SKILL.md` where both runtimes read it.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/compose-api.test.ts
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

describe('tier-3 composition arm', () => {
  it('builds its system prompt from the committed skill files', async () => {
    const { buildSystemPrompt } =
      await import('../scripts/devo-weekly/compose-api.mjs')
    const prompt = buildSystemPrompt()
    const skill = readFileSync('.claude/skills/devo-go/SKILL.md', 'utf8')
    expect(prompt).toContain(skill.trim().slice(0, 200))
  })

  it('includes the standing brief', async () => {
    const { buildSystemPrompt } =
      await import('../scripts/devo-weekly/compose-api.mjs')
    const brief = readFileSync('scripts/devo-weekly/STANDING-BRIEF.md', 'utf8')
    expect(buildSystemPrompt()).toContain(brief.trim().slice(0, 120))
  })

  it('contains no authored voice guidance of its own', () => {
    const src = readFileSync('scripts/devo-weekly/compose-api.mjs', 'utf8')
    expect(src).not.toMatch(/pastoral|devotional voice|tone should/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/compose-api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/devo-weekly/compose-api.mjs
// Tier-3 composition. Runs the SAME committed devo-go skill text through the
// API. Deliberately carries no voice guidance of its own — see
// docs/superpowers/specs/2026-08-23-dual-account-failover-design.md.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const SKILL_DIR = '.claude/skills/devo-go'

export function buildSystemPrompt() {
  const parts = [readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')]
  for (const f of readdirSync(join(SKILL_DIR, 'references')).sort()) {
    parts.push(readFileSync(join(SKILL_DIR, 'references', f), 'utf8'))
  }
  parts.push(readFileSync('scripts/devo-weekly/STANDING-BRIEF.md', 'utf8'))
  return parts.join('\n\n---\n\n')
}

export async function composeViaApi({ thematic }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: `Compose this week's series.\n\nTHEMATIC:\n${thematic}`,
      },
    ],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { text, tier: 3, capabilityGaps: readCapabilityGaps() }
}

function readCapabilityGaps() {
  const md = readFileSync('docs/run/TIER3-TOOL-SURFACE.md', 'utf8')
  return md
    .split('\n')
    .filter((l) => l.includes('|') && /\|\s*no\s*\|?\s*$/i.test(l))
    .map((l) => l.split('|')[1].trim())
    .filter(Boolean)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/compose-api.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/devo-weekly/compose-api.mjs __tests__/compose-api.test.ts
git commit -m "feat: tier-3 API composition arm reusing the committed devo-go skill"
```

---

### Task 6: Voice parity gate on tier-3 output

**Files:**

- Modify: `__tests__/soul-audit-evals/rubric.ts`
- Create: `__tests__/tier3-voice-parity.test.ts`
- Create: `__tests__/fixtures/exemplars/` (3 committed subscription-path devotionals)

**Interfaces:**

- Consumes: `composeViaApi` (Task 5), the existing rubric harness.
- Produces: `scoreVoiceParity(candidate, exemplars)` → `{ score: number, failures: string[] }`. Build fails below threshold.

- [ ] **Step 1: Commit three exemplars**

```bash
mkdir -p __tests__/fixtures/exemplars
# copy three published, subscription-composed devotionals verbatim
```

- [ ] **Step 2: Write the failing test**

```ts
// __tests__/tier3-voice-parity.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { scoreVoiceParity } from './soul-audit-evals/rubric'

const enabled =
  process.env.RUN_SOULAUDIT_LLM_RUBRIC === '1' &&
  !!process.env.ANTHROPIC_API_KEY

describe.skipIf(!enabled)('tier-3 voice parity', () => {
  const exemplars = readdirSync('__tests__/fixtures/exemplars').map((f) =>
    readFileSync(`__tests__/fixtures/exemplars/${f}`, 'utf8'),
  )

  it('scores an exemplar against its peers above threshold', async () => {
    const { score } = await scoreVoiceParity(exemplars[0], exemplars.slice(1))
    expect(score).toBeGreaterThanOrEqual(0.75)
  })

  it('rejects obviously off-voice text', async () => {
    const { score } = await scoreVoiceParity(
      'Here are 5 actionable tips to optimize your faith journey! #blessed',
      exemplars,
    )
    expect(score).toBeLessThan(0.75)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `RUN_SOULAUDIT_LLM_RUBRIC=1 npx vitest run __tests__/tier3-voice-parity.test.ts`
Expected: FAIL — `scoreVoiceParity` is not exported.

- [ ] **Step 4: Implement `scoreVoiceParity` in `rubric.ts`**

Follow the file's existing rubric-call pattern. The judge prompt must ask only
about voice, cadence and pastoral register — never about factual content,
which the BSB verbatim gate already covers. Return `{ score, failures }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `RUN_SOULAUDIT_LLM_RUBRIC=1 npx vitest run __tests__/tier3-voice-parity.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add __tests__/soul-audit-evals/rubric.ts __tests__/tier3-voice-parity.test.ts __tests__/fixtures/exemplars
git commit -m "test: voice parity gate for tier-3 composed output"
```

---

### Task 7: Provision the dedicated API key

**Files:**

- No repo files. GitHub secrets only.

- [ ] **Step 1: Mint the key**

In the Anthropic console, create a **new** API key named `euangelion-content-pipeline`. Do not reuse the site key.

- [ ] **Step 2: Set a spend cap**

Set a monthly limit on that key. $25 is ample — a full tier-3 week costs roughly a dollar at the rates in `docs/production-decisions.yaml`.

- [ ] **Step 3: Store it**

```bash
gh secret set CONTENT_PIPELINE_API_KEY
```

- [ ] **Step 4: Verify**

Run: `gh secret list | grep CONTENT_PIPELINE_API_KEY`
Expected: listed with today's date. Confirm `ANTHROPIC_API_KEY` is still absent.

---

### Task 8: Wire both workflows to the ladder

**Files:**

- Modify: `.github/workflows/weekly-series.yml`
- Modify: `.github/workflows/daily-edition.yml`

**Interfaces:**

- Consumes: everything above.

- [ ] **Step 1: Add the tier secrets to weekly-series.yml**

In the `Build the week's series` step's `env:` block, add:

```yaml
CLAUDE_CODE_OAUTH_TOKEN_2: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN_2 }}
CONTENT_PIPELINE_API_KEY: ${{ secrets.CONTENT_PIPELINE_API_KEY }}
```

`ci-orchestrate.sh` already calls `select_tier` from Task 3, so no `run:` change is needed.

- [ ] **Step 2: Replace daily-edition.yml's presence check**

The existing `if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]` branch selects on
presence, not headroom. Replace it with the ladder:

```yaml
CLAUDE_CODE_OAUTH_TOKEN_2: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN_2 }}
CONTENT_PIPELINE_API_KEY: ${{ secrets.CONTENT_PIPELINE_API_KEY }}
```

```sh
          . scripts/lib/claude-tier.sh
          if select_tier; then
            node scripts/edition/compose-lead-claude.mjs --days="$EDITION_DAYS" $FROM_FLAG
            node scripts/edition/compose-guides-claude.mjs --days="$EDITION_DAYS" $FROM_FLAG
            node scripts/edition/build.mjs --days="$EDITION_DAYS" $FROM_FLAG \
              --kinds=rail,season,word,practice,strip,crossword,unscramble,quiz,gallery,prayer
          else
            node scripts/edition/build.mjs --days="$EDITION_DAYS" $FROM_FLAG
          fi
```

- [ ] **Step 3: Add the all-tiers-dead notifier**

Append a step to both workflows:

```yaml
- name: Report exhausted ladder
  if: failure()
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    gh issue create \
      --title "Content pipeline: tier ladder exhausted ($(date -u +%F))" \
      --body "All credential tiers failed or the run errored. Check the tier log above. Run dir preserved in the workflow artifacts." \
      --label automation || true
```

- [ ] **Step 4: Validate the workflow files**

Run: `npx --yes action-validator .github/workflows/weekly-series.yml && npx --yes action-validator .github/workflows/daily-edition.yml`
Expected: both valid.

- [ ] **Step 5: Dry run**

Run: `gh workflow run weekly-series.yml -f mode=dry-run` then watch with `gh run watch`.
Expected: the tier log names a tier; the run reaches the reading gate without publishing.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/weekly-series.yml .github/workflows/daily-edition.yml
git commit -m "feat: wire both content workflows to the tier ladder"
```

---

## Final verification

- [ ] `npm run type-check` clean
- [ ] Full suite green (2097 tests plus the new ones)
- [ ] `gh secret list` shows `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN_2`, `CONTENT_PIPELINE_API_KEY`, and **not** `ANTHROPIC_API_KEY`
- [ ] Forced tier-2 run (temporarily set tier 1 to an invalid token via workflow dispatch) reaches tier 2, logs the transition, and completes
- [ ] Forced tier-3 run produces output labelled tier 3 in the gate artifact and passes the voice parity gate
- [ ] Reading gate still stops the run: nothing published without a merged PR
