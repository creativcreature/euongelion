# Dual-Account Quota Failover & Side-by-Side Local Installs

**Date:** 2026-08-23
**Status:** Design — awaiting founder review
**Scope:** Two halves, one spec. (A) Automatic tiered quota failover for the
Euangelion content automations. (B) Two Claude Code accounts usable
simultaneously on the founder's machine.

## Problem

Account #1 (`chrisatmelt@gmail.com`) is at 86% of its cap and will exhaust
sooner than later. Two automations compose site content on that
subscription and will fail when it does:

- `.github/workflows/daily-edition.yml` — Wed 10:15 UTC, Sunday Lead.
- `.github/workflows/weekly-series.yml` — Wed 10:20 UTC, full weekly series.

Both authenticate via the `CLAUDE_CODE_OAUTH_TOKEN` repo secret (set
2026-08-19), minted from account #1 by `claude setup-token`. The token lives
in GitHub, not on the Mac, so a local logout does not invalidate it — but it
draws account #1's quota, and dies with account #1.

A second, unused account exists. The founder wants failover to be automatic,
and wants both accounts usable locally without logging in and out.

### Out of scope

The site's runtime AI (visitor chat, plan generation via the Supabase Edge
function and the Worker) runs on `ANTHROPIC_API_KEY` — metered API billing,
structurally separate. Unaffected. Per SA-100 a subscription cannot legally
serve visitor traffic; that boundary is unchanged by this design.

## Part A — Tiered failover

### Tier ladder

| Tier | Credential                  | Notes                                                                                                                   |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1    | `CLAUDE_CODE_OAUTH_TOKEN`   | Account #1. Current behaviour.                                                                                          |
| 2    | `CLAUDE_CODE_OAUTH_TOKEN_2` | Account #2. New secret.                                                                                                 |
| 3    | `CONTENT_PIPELINE_API_KEY`  | Metered floor. A **new, dedicated** Anthropic key with a console-side spend cap — _not_ the site's `ANTHROPIC_API_KEY`. |

#### Preserving SA-100's cost property

An earlier draft proposed restoring the site's `ANTHROPIC_API_KEY` to GitHub
secrets. That was wrong — it would have commingled the content pipeline with
the Worker's visitor-AI budget and partially reversed SA-100.

Instead, tier 3 uses a **separate, dedicated Anthropic key** with its own
spend ceiling set console-side. SA-100's architectural intent — "the Worker
keeps its own key for on-site visitor AI" — is thereby _preserved_: two keys,
two budgets, nothing commingled. Tier-3 spend is metered through the existing
`soul-audit/cost-ledger.ts`, which already prices real tokens at real
Anthropic rates and backs a budget cap.

Exposure is bounded and small. Per the cost log, devotional generation runs
~$0.07/day and ~$0.48 per 7-day plan, so a full tier-3 week is on the order
of a dollar. The property restates as: **$0.00 while either subscription
lives; bounded at a console-enforced ceiling on a dedicated key when both are
dead, ledgered and alerting.** Structural, not conditional — enforced by a
spend cap rather than by the rarity of the fallback.

### Pre-flight tier selection

Before any expensive work, `scripts/lib/claude-tier.sh` probes each tier in
order with a trivial `claude -p 'ok'` and selects the first with headroom.
The expensive run therefore starts on a full tank, and a tier with no quota
costs one cheap probe rather than a dead 25-minute job.

The probe classifies three outcomes, which must not be conflated:

- **healthy** — use this tier.
- **exhausted** — quota gone; advance. Expected, logged at info.
- **invalid/expired** — token bad. Advance, but raise an alert. An expired
  tier-1 token must never silently ride tier 2 for weeks until both are dead.

Classification is by exit code plus stderr pattern. The exact quota string is
to be pinned empirically during implementation (force a call against a known
exhausted or malformed token and capture the output) — not guessed from a
`strings` dump of the binary.

### Checkpoint and resume

`ci-orchestrate.sh` currently runs devo-go end to end inside one `claude -p`
call that writes files, spends ElevenLabs credits, drives Codex imagery,
commits, and pushes. A naive retry would re-spend real money.

Split into stages, each writing a completion marker plus its outputs to a run
directory (`.devo-run/<run-id>/state.json`):

1. `thematic` — derive or read the founder override.
2. `compose` — devo-go composition.
3. `narrate` — ElevenLabs. **Credit-spending.**
4. `imagery` — Codex image_gen. **Credit-spending.**
5. `assemble` — commit, push, gate artifact, notify.

On quota death the ladder advances and the run resumes at the last incomplete
stage. Completed stages are never re-executed, so narration and imagery are
paid for at most once per run. Stage boundaries were chosen so that the two
credit-spending stages are individually resumable.

### Tier 3 composition arm

devo-go is a Claude Code **skill**, but it is a _committed repo skill_ —
`.claude/skills/devo-go/SKILL.md` (98 lines) plus five reference files, all
versioned here. The voice is not locked inside the Claude Code harness; it is
text this repo owns.

The tier-3 arm therefore **does not reimplement composition**. It loads the
same `SKILL.md`, the same `references/`, and the same
`scripts/devo-weekly/STANDING-BRIEF.md` as its system prompt, and implements
the tool surface those instructions require against the API. One set of
instructions, two runtimes. Editing devo-go changes both paths at once
because both read the same files — divergent authored voice is structurally
impossible rather than merely discouraged.

Voice is additionally gated by machinery that already exists:
`__tests__/soul-audit-evals/rubric.ts` is an LLM-judge rubric harness
(`RUN_SOULAUDIT_LLM_RUBRIC=1`). Tier-3 output is scored against committed
exemplars from the subscription path before it reaches the reading gate.

**Bounded residual risk.** The remaining drift vector is the _harness gap_ —
tools devo-go's workflow assumes that the API arm must reimplement. This is
enumerable up front by reading `references/workflow.md`, and the enumeration
is a required first task of the tier-3 work, not a discovery made later. Any
tool that cannot be reproduced must be recorded as an explicit capability
difference in the gate artifact.

Tier-3 output is labelled as such in the gate artifact regardless, so the
founder always knows which runtime produced what they are reading.

### Failure visibility

Every tier transition logs loudly in the Actions tab. Exhausting all three
tiers stops at the last checkpoint, pushes what exists, and opens a GitHub
issue. The reading gate (SA-029) is untouched: automation still stops at the
gate and never publishes.

## Part B — Side-by-side local installs

### Feasibility

Confirmed in the 2.1.241 native binary:

- `join(e.configDir, ".credentials.json")` — the credentials file path is
  scoped to the config dir, so `CLAUDE_CONFIG_DIR` yields separate
  credentials per install.
- `CLAUDE_SECURESTORAGE_CONFIG_DIR` exists as a secure-storage scoping knob.
- `--mcp-config <configs...>` and `--strict-mcp-config` allow MCP servers to
  be loaded from an external file instead of `.claude.json`.
- `permissions.allow`, `defaultMode`, `hasTrustDialogAccepted` are
  `settings.json` keys.

### Layout

`~/.claude` remains account #1, untouched. `~/.claude-2` is a thin shell:
real files only for what must differ, symlinks for everything else.

| Path                                                                | Treatment                | Rationale                                                                                                                                         |
| ------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/`, `plugins/`, `hooks/`, `CLAUDE.md`, `settings.json`       | symlink                  | One copy. Cannot drift or clobber.                                                                                                                |
| `projects/` (carries `memory/` and all project history)             | symlink                  | "Same account" means #2 sees your memory and can resume your sessions. Session files are UUID-keyed, so concurrent writes land in distinct files. |
| `.credentials.json`, `history.jsonl`, `shell-snapshots/`, telemetry | separate                 | Per-account by nature.                                                                                                                            |
| `.claude.json`                                                      | separate, **not synced** | Confirmed created _inside_ `CLAUDE_CONFIG_DIR`. See below.                                                                                        |

### Why `.claude.json` needs no sync

It is a single ~76KB blob rewritten wholesale, holding `oauthAccount` (must
differ) alongside `mcpServers` and project entries (wanted shared). It cannot
be symlinked — two processes read-modify-writing it would clobber each other
— and an earlier draft of this design proposed syncing it on a schedule. That
was wrong. The correct move is to relocate what needs sharing:

- **MCP servers** — the four local servers (`mobbin`, `nanobanana-mcp`,
  `robinhood-trading`, `comfyui`) move to `~/.claude-shared/mcp.json`, passed
  via `--mcp-config` by the launcher for **both** accounts, with
  `--strict-mcp-config` so the copy inside `.claude.json` is ignored. One
  source of truth; the two files cannot disagree because only one is read.
- **Tool permissions** — already in the symlinked `settings.json` under
  `permissions.allow`.
- **Project trust** — `hasTrustDialogAccepted` is a settings key; pre-seed or
  accept one dialog per project in #2.

What remains in `.claude.json` is identity, prompt history, and UI/cache
state — all of which _should_ be per-account. **The sync surface is zero.**
There is no scheduler, no manifest, no writeback, and therefore no class of
silent sync failure to guard against. This was the founder's stated
requirement and it is met by construction, not by policing.

### Launcher

`claude --1` cannot be a real CLI flag; the binary would reject it. A shell
function named `claude` intercepts `--1` / `--2` as the first argument, sets
`CLAUDE_CONFIG_DIR` accordingly, appends
`--mcp-config ~/.claude-shared/mcp.json --strict-mcp-config`, and execs the
real binary with the remaining arguments. Bare `claude` defaults to account
#1. The requested ergonomics are preserved without patching anything.

### SessionStart guard

One hook, running in the session the founder is sitting in — not a log, not a
cron:

1. **Account banner.** One line naming the live account. With two accounts,
   always know which one you are spending.
2. **Symlink integrity.** Every expected symlink resolves.
3. **MCP drift.** If `.claude.json` has gained an `mcpServers` entry absent
   from the shared file — the one realistic mistake, since a future
   `claude mcp add` writes there and is then ignored under strict mode — say
   so loudly.

### What does not transfer

The claude.ai connectors (Gmail, Calendar, Drive, Canva, Adobe, Higgsfield,
Granola, Cloudflare, Microsoft 365) are provisioned per claude.ai account,
server-side. Account #2 must re-authorise each by hand. One-time, unavoidable,
not scriptable.

## Sequencing

Both halves share one prerequisite — provisioning account #2 and minting its
token — so they are built together:

1. Provision account #2 locally (`~/.claude-2`, launcher, hook).
2. `claude setup-token` on account #2 → `CLAUDE_CODE_OAUTH_TOKEN_2` secret.
3. Mint dedicated `CONTENT_PIPELINE_API_KEY` with a console spend cap; add as a secret.
4. `claude-tier.sh` with probe and classification.
5. Stage decomposition of `ci-orchestrate.sh` with resume.
6. Tier-3 API composition arm for the series.
7. Wire `daily-edition.yml` and `weekly-series.yml` to the ladder.

## Testing

- **Tier probe** — unit tests over captured stderr fixtures for healthy /
  exhausted / expired. Expired must alert, not silently advance.
- **Resume** — kill each stage mid-run; assert completed stages do not
  re-execute and that ElevenLabs and Codex are called at most once per run.
- **Ladder** — force tier-1 and tier-2 failure; assert tier 3 is reached,
  logged, and labelled in the gate artifact.
- **Voice parity** — tier-3 output scored by the existing soul-audit rubric
  against committed subscription-path exemplars; regression fails the build.
- **All tiers dead** — assert clean stop at last checkpoint, branch pushed,
  issue opened, nothing published.
- **Local split** — both accounts running concurrently; assert `.claude.json`
  files stay independent and correct, shared MCP servers load in both, and
  neither corrupts the other's credentials.
- **Existing suite** — 2097 tests, type-check and lint must stay clean.

## Resolved by empirical check (2026-08-23)

`CLAUDE_CONFIG_DIR` was exercised against a scratch directory:

- `.claude.json` is created **inside** the config dir, not at `$HOME`. The
  symlink map in Part B is therefore correct as written.
- `claude mcp list` under the alt config dir reported _"No MCP servers
  configured"_ — it did not see the four servers in `~/.claude.json`. MCP
  config is config-dir scoped, which both confirms isolation and confirms the
  need for the shared `--mcp-config` file.
- `$HOME/.claude.json` mtime was unchanged by the run: full isolation.

## Open questions

1. Exact stderr string and exit code for subscription quota exhaustion, and
   how it differs from an expired token. To be captured empirically against a
   known-bad token during implementation of the probe — never guessed from a
   `strings` dump.
2. Whether `CLAUDE_SECURESTORAGE_CONFIG_DIR` must be set explicitly, or
   whether `CLAUDE_CONFIG_DIR` alone namespaces the Keychain entry. The
   current entry is `svce="Claude Code-credentials"`, `acct="jamesparker"` —
   neither obviously varies with the config dir. If the Keychain entry proves
   shared between the two installs, force file-based credentials per config
   dir as the fallback. This is the last feasibility risk in Part B and is
   settled by the first task of that half.
3. The enumeration of devo-go's tool surface (`references/workflow.md`) that
   the tier-3 arm must reproduce. Required first task of the tier-3 work.
