# The Daily Bread V2 — architecture (SA-142 / F-184)

The Daily Bread V2 turns the paper into a serialized daily publication. It is
assembled off-request, frozen, published at the 7am New York rollover, and archived
permanently. It is built behind a flag and does not replace the SA-090 paper until the
founder turns it on. Operations: `docs/runbooks/DAILY-BREAD-V2-RUNBOOK.md`.

## 1. The edition

`DailyEdition` (`src/lib/daily-bread/types.ts`) is one frozen document per editorial
date:

| Field | Meaning |
| --- | --- |
| `editionDate`, `slug` | `YYYY-MM-DD`, the editorial (New York) date |
| `archiveOrigin` | `native` or `backfilled` |
| `volume`, `issue` | Native only. Allocated at publish. `Vol. 1 · No. 001` is the first native paper |
| `lifecycle` | `draft → assembling → ready → published → superseded` |
| `quality` | `normal`, `fallback` or `minimum`. Independent of lifecycle |
| `activeRevision` | 1 at publication; +1 per correction |
| `title`, `deck`, `primaryScripture`, `liturgical`, `seed` | The day's frame |
| `composition` | Archetype, placements (module, region, span, tier, band, beat), rhythm, scoring |
| `modules` | 31 module types (reading, Scripture, comic, scene, puzzles, …) |
| `assets` | Lead plate, scene poster seed, OG card data, fallbacks |
| `generation` | Run id, providers used, fallbacks, usage and cost, module failures, comic level, source item ids |

Nothing in the document is recomputed when a reader requests the page.

## 2. Persistence

`supabase/migrations/20260913000001_daily_bread_v2.sql` (idempotent):

- `daily_bread_editions`: unique `edition_date`; partial unique index on native `issue`.
  CHECK constraints: backfilled rows have no issue; a ready row is complete; a
  published row is numbered and stamped; a withdrawn row has a reason.
- `daily_bread_edition_revisions`: `(edition_id, revision)`. A trigger rejects UPDATE
  and DELETE.
- `daily_bread_publication_attempts`: one row per pipeline attempt.
- Functions (SECURITY DEFINER, `search_path = public`, revoked from PUBLIC, granted
  to `service_role`):
  - `daily_bread_acquire_assembly(date, owner, ttl, origin)`
  - `daily_bread_release_assembly(date, owner)`
  - `daily_bread_mark_ready(date, owner, document)`: lease holder only
  - `daily_bread_reopen_ready(date)`
  - `daily_bread_publish(date, now)`: advisory lock, next issue number, revision 1
  - `daily_bread_create_revision(date, reason, patch)`
  - `daily_bread_supersede(date, reason)`
- RLS: anon and authenticated may SELECT only published or superseded editions. They
  have no write grants and no access to attempts.
- Provenance is internal (plan §27; migration `20260914000001_daily_bread_v2_private_provenance`).
  Client roles may read only the paper's public columns, not `generation`, `lock_owner`
  or `lock_expires_at`, and cannot read revisions, whose snapshots embed `generation`.
  The site reads with the service role, so nothing it renders changes.

`src/lib/daily-bread/repository/`: one `DailyBreadRepository` interface with three
implementations:

- `supabase.ts`: production. Calls the SQL functions; throws on error.
- `memory.ts`: tests and dry runs. Mirrors the SQL semantics.
- `fixture.ts`: read-only local preview. Loads `.daily-bread-local/fixtures.json` or
  the ASSETS copy.

The SQL itself is tested in real Postgres by `__tests__/daily-bread-v2-sql.test.ts`
(PGlite).

**Reversal.** The Supabase CLI runs migrations forward only. The reverse is
`database/ROLLBACK-2026-09-13-daily-bread-v2.sql`: one transaction that drops exactly
the 3 tables and 9 functions above. It refuses to run until the session sets
`daily_bread.confirm_rollback = 'destroy-archive'`, because it deletes the archive.
The SQL suite tests the refusal, the removal, and a clean re-apply afterwards.

**Domain records** (`types.ts`): `DailyEdition` carries its row `id`, `createdAt` and
`updatedAt`. `EditionRevision` is one immutable revision `{ editionId, revision,
createdAt, reason, snapshot }`, readable internally through
`repository.getRevisions(date)`. Lead plates link to their registry through their id
(`generated:<date>` is the generated lead-art manifest, `series:<slug>` is the series
hero art). `leadPlateRegistryLink()` in `modules/build.ts` resolves the link.

## 3. Time

`src/lib/daily-bread/time.ts` is the only place an instant becomes an editorial date.
The rollover is 07:00 America/New_York, resolved per instant with Intl, so it is
DST-safe. `__tests__/daily-bread-v2-time.test.ts` checks it against the SA-114
`effectiveEditionDate` every 37 minutes across 2026. `schedulePlan` returns the live
date, the next date and whether the 14-hour build window is open (both evening cron
runs fall inside it in EDT and EST).

## 4. The pipeline

`src/lib/daily-bread/orchestrator.ts` (Node only, never on a reader request):

1. **Lease.** `acquireAssembly` gives one owner per invocation. A duplicate job gets
   `skipped`.
2. **History.** The last 14 days of archetypes, scenes, comic ids and lead plates,
   used for anti-repeat.
3. **Modules** (`modules/build.ts`). Every module is built in isolation, and a failure
   is recorded without stopping the build. Sources, in order: `edition_items` rows
   live at the rollover (the SA-114 review queue), then the SA-090/092 generators and
   committed banks. The primary Scripture comes from the lead, then the reading, then
   the week's memory verse. It is trimmed to at most 6 verses and looked up in the BSB.
4. **Editorial frame** (`generate/frame.ts`). See section 5.
5. **Comic** (`comic/chain.ts`). See section 6.
6. **Scene.** The frame's scene, rendered by one of three renderers chosen by seed.
7. **Composition** (`composition/`). See section 7.
8. **Validation** (`validate.ts`). Checks required modules, placements against
   modules, safe links and assets, a 900 KB size cap, no script-like content, and no
   credential values or credential-shaped strings.
9. **Mark ready.** Only the lease holder can mark ready. The document is frozen.

`publish.ts`:

1. The rollover must be reached.
2. Reviewed `edition_items` used by the build are re-checked. A row rejected since the
   build sends the edition back to draft for a rebuild.
3. `daily_bread_publish` runs.

`runDailyBread`, the scheduler step:

1. The live date must be published: publish it if ready, or build and publish it now
   if it is missing.
2. Inside the build window, build tomorrow.

**Two clocks.** Each clock does the job it is reliable for.
- **GitHub Actions** (`.github/workflows/daily-bread-v2.yml`) BUILDS tomorrow.
  - It runs at 22:15, 00:15, 02:15, 05:15 and 08:15 UTC. Every run is inside the
    14-hour window in both EDT and EST, and each is a no-op once tomorrow is ready.
  - The build needs the Claude CLI and minutes of work.
  - GitHub's schedule is best-effort: on 2026-09-14 the 22:15 run never fired and the
    02:15 run started at 07:55. That is why there are five attempts.
  - Its 11:05, 12:05 and 13:05 runs stay as the emergency path: if nothing was ready,
    they build and publish.
- **The Worker** PUBLISHES on the minute.
  - A Cloudflare Cron Trigger (`1,15,30,45 11,12 * * *`, in `wrangler.jsonc`) fires
    `scheduled()` in `worker-entry.mjs`. That entry wraps OpenNext's worker; its fetch
    handling is unchanged.
  - `publishDueEdition` (`scheduled.ts`) posts the live editorial date to the internal
    publish route through the app handler: no network hop, `X-Internal-Secret`,
    idempotent.
  - In EDT the first live firing is 07:01, and in EST it is 07:01. Every later firing
    is `already_published`. Each run logs one `cron_publish` line.

Every call writes a `PublicationAttempt`.

**Quality:**
- `minimum`: no lead or reading, or at least half the standing and play modules failed.
- `fallback`: the frame fell to deterministic under the full policy, the Scripture
  came from the weekly verse, the comic was reprinted or omitted, or any module failed.
- `normal`: otherwise.

## 5. Generator chain

`providers/`:

| Order | Provider | Credential (server/CI only) | Transport |
| --- | --- | --- | --- |
| 1 | `claude-api` | `ANTHROPIC_API_KEY` | Messages API over fetch, `x-api-key` header |
| 1 | `claude-cli` | `CLAUDE_CODE_OAUTH_TOKEN` (or `DAILY_BREAD_CLAUDE_CLI_AUTH=login` locally) | `claude -p`, prompt on stdin, isolated (no settings or hooks; no tools, except Read and Grep for a task that searches the repo) |
| 2 | `openai` (backup) | `OPENAI_API_KEY` | Chat Completions, bearer header; default `gpt-5-mini` |
| 3 | `gemini` | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `x-goog-api-key` header; never in the URL |
| 4 | `deterministic` | none | committed banks + BSB context verses |

**Backup model choice** (founder: "figure out the best versions that are extremely
cheap, basically free"). List prices were read from OpenAI's pricing page on
2026-09-13. Each model then built three real editions with Claude turned off:

| Model | $/1M in / out | Valid tasks | Cost per edition |
| --- | --- | --- | --- |
| `gpt-5-nano` | 0.05 / 0.40 | 6/6 | $0.0003–0.0005 |
| `gpt-4o-mini` | 0.15 / 0.60 | 5/6 | $0.0005–0.0009 |
| `gpt-4.1-nano` | 0.10 / 0.40 | 3/6 (comic vocabulary) | $0.0005 |
| `gpt-5.4-nano` | 0.20 / 1.25 | 0/6 (rejects `reasoning_effort=minimal`) | — |

That first bake-off measured validity only. On 2026-09-14 the CI Claude account hit
its weekly limit and the backup ran for real. Its content showed the gap: decks of
several sentences, decks reciting the verse printed beside them, a reference tacked
on the end. The deck rules were tightened (one sentence, no recited verse, no
leading label or trailing reference, no first-person plural), and failed output is
now fed back to the model on its retry. Re-run against 2026-09-15, three editions each:

| Model | Frames valid | Comics valid | Cost per edition |
| --- | --- | --- | --- |
| `gpt-5-nano` | 0/3 (fed-back retries too) | 3/3 | $0.0004 |
| `gpt-5-mini` | 3/3, first attempt | 3/3 | $0.0012–0.0014 |

**Default: `gpt-5-mini`.** A year of daily backup use costs about $0.50. Override
with `DAILY_BREAD_OPENAI_MODEL`.

`runProviderChain`:

- Skips providers that are not configured.
- Aborts each attempt at the timeout (default 90 s).
- Retries once on a retryable failure or a validation failure, with backoff. A
  validation retry carries the rejection reasons in the prompt; a transport retry
  resends the prompt unchanged.
- Treats the Claude CLI's usage, weekly or daily limit messages as quota (never
  retried), like auth and billing failures.
- Does not retry auth failures.
- Records `ProviderUsage` for every attempt.
- Lands on the deterministic floor last. If the floor throws, the task fails loudly.
  A task with no floor throws `ProviderChainExhausted`, naming every provider's reason.

**The editorial generation interface (plan §21).** `generate/editorial.ts` defines
`EditorialGenerator.generate(request)`. A caller describes the task (prompt, parser,
validator, optional floor) and never names a provider or spawns a CLI. Three tasks
use it:

| Task | Writes | Floor | Where it runs |
| --- | --- | --- | --- |
| `editorial-frame` | the edition's deck, rabbit holes, scene | deterministic frame | the V2 build |
| `sunday-lead` (SA-100) | the Sunday feature, a DRAFT `lead` row | none: the rotation lead prints | `npm run daily-bread -- sunday-lead` in `daily-edition.yml` |
| `guides` (SA-114) | three How-to-Read articles, DRAFT `guide` rows | none: the guide bank prints | `npm run daily-bread -- guides` in `daily-edition.yml` and `daily-gapfill.yml` |

The last two are the Claude workflows that existed before V2. They ran as
`scripts/edition/compose-lead-claude.mjs` and `compose-guides-claude.mjs`, each calling
`claude -p` itself; those scripts are removed. Their prompts, checks and rows are
unchanged, with two exceptions the interface requires:
- **Output.** The Sunday lead used to write `/tmp/sunday-lead.json` with Claude's
  Write tool. It now returns the same JSON as its answer.
- **Files.** The Sunday lead's rules send the model to `docs/PUBLIC-FACING-LANGUAGE.md`
  and `public/reference-index.json`. Claude Code still gets read-only access (Read,
  Grep) and those rules verbatim. A provider that cannot read files gets the rules
  without the file references, and may not quote historic voices, because the rule
  forbids quoting from memory.

The draft writers try `claude-cli` first (the subscription transport, and the only
one that can search the repo), then `claude-api`, `openai` and `gemini`. `--dry-run`
writes nothing to the database.

The model writes only the frame:
- **Deck:** 60–220 characters, one sentence.
- **Rabbit holes:** 2–4 references with a reason; the verse text is looked up.
- **Scene:** one of three.

The comic is not written by a model at build time (§6).

`generate/guards.ts` rejects, in the deck and rabbit-hole reasons:
- quotation marks
- URLs, emoji and markup
- first person
- the AI-CONTENT-CONSTRAINTS §4.2 forbidden patterns

**Output validation (plan §26).** For every task, before parsing, the chain rejects
an empty answer or a refusal ("I'm sorry, I can't…", "as an AI…"). The rejection
reason goes back to the model once, then the chain moves on. `generatedTextProblems`
applies to every model-written field: the frame, and each field of the Sunday lead and
the guides. It flags:
- placeholder residue (`lorem ipsum`, `TODO`, `[insert …]`, `{{…}}`);
- refusal text;
- HTML tags;
- `javascript:` and `data:text/html` links;
- malformed characters.

Schema, required fields, length, duplicate modules, unsafe links and missing Scripture
are checked by each task's parser and by `validateEditionDocument`.

**Provenance (plan §27).** Every usage row carries the task's `promptVersion`.
`edition.generation` records who wrote the frame (`provider`, `model`), its
`promptVersion`, `generatedAt`, and `fallbackLevel` (0 Claude, 1 secondary remote,
2 deterministic). Prompt versions: frame 3, Sunday lead 2, guides 1. Bump the constant
whenever a prompt's wording changes. Editions built before 2026-09-14 lack these
fields. The admin preview shows them.

## 6. The comic

**Root cause of "the comic doesn't load".** The page printed its reserved placeholder
because no strip rows existed. These faults stopped the rows from being made:
- The strip machine is paused by default.
- `daily-gapfill.yml` never installed the Claude CLI, so its tier probe always failed
  and the job exited 0.
- `daily-edition.yml` timed out at 15 minutes, before its final strip step.
- Tier 3 unset the OAuth token, and `compose-lead-claude.mjs` then threw.
- The failure alert had no `issues: write` permission.

Items 2–5 are repaired. `STRIP_MACHINE` is unchanged: it is a founder switch.

**Correction (2026-09-14): the funnies are ECHO & DUST.** The founder's strip is Teddy,
Echo and Dust, locked in `content/strip-reference/ECHO-AND-DUST-CANON.md` and drawn by
the SA-114 strip machine from the locked character sheet. The first V2 build treated
the paused machine as a fault and printed a generic wordless silhouette strip in its
place, on 23 of 28 editions. Founder: "the comic strip is completely wrong… where is
Dust and Echo?" That strip is gone from the pipeline.

**One strip per week** (founder, 2026-09-14: "the comic should be weekly and the bread
daily… One strip shown all week"; "I want to approve the months of comics at once"). A
week's strip is an `edition_items` `strip` row dated that week's Monday. It prints only
after the founder APPROVES it (status `published`); a draft never prints on its own.

`src/lib/daily-bread/comic/chain.ts`, for an edition date:
1. **approved-art.** The week's approved strip. For the daily-strip era, the approved
   strip dated that very day also counts.
2. **archive-reprint.** Otherwise, one approved strip from before the week, reprinted
   every day of that week and credited ("A reprint — first ran ..."). The least
   recently printed strip goes first. A strip printed in the three weeks before is
   never chosen while another one is available.
3. **omitted.** Nothing approved ran before the week. Never a stand-in drawing.

**Batch approval.** `/admin/comics` (admin-gated) lays out last week and the next twelve,
each with its strip or the gap. It records verdicts one week at a time, or every draft
on the page with one confirmed click, through the existing `/api/admin/edition` review
endpoint.

Every image is checked at build: HTTP 200 and an `image/*` type.

No model is called for the comic. The strip is written and drawn upstream against the
canon, and it passes the founder's review queue.

**Correcting published editions.** `npm run daily-bread -- repair-comics
--from=... --to=... [--dry-run]` recomputes each published edition's comic with the
chain above. It writes a revision only where the level or image a reader sees would
change.

The frozen silhouette scripts still render (`render.ts`, `svg.ts`, `ComicStrip.tsx`)
until those editions are revised. After that, that code is removed.

**Strip storage.** `generate-strip.mjs` used to name files by strip number. On
2026-08-24, "No. 4: The Receipt" was written over `echo-dust-004.jpg`, the file behind
the published No. 1 "The Microwave Minute". Files are now named
`echo-dust-<date>-<stamp>.jpg` and uploaded with no overwrite. The Microwave Minute
master (`content/strip-reference/workshop/echo-dust-004.jpg`) is re-uploaded as
`strip/echo-dust-001-microwave-minute.jpg`. Pointing No. 1's row at it is a pending
production step.

## 7. Composition

`composition/archetypes.ts` defines eight structural layouts. Each is a front band set
plus body bands, with span assignments on a 6-column grid and an omit list:
- **Broadsheet:** lead with rail, then the ruled sheet.
- **Illuminated:** scene, illuminated Scripture, lead, then the reading.
- **Quiet:** one 44rem column, no games.
- **Field Notes:** a 2:1 main column plus a ruled margin.
- **Red Letter:** Christ's words set at display size.
- **Study Table:** word and puzzles first.
- **Joy:** scene, comic, good news and hymnal up front.
- **Prayer Book:** the prayer first, rubric-numbered, no games.

Choosing an archetype (`compose.ts`):
- Score = affinity (weekday, season, somber days, Gospel reference, good news
  present) + seeded jitter − recency penalty.
- An archetype repeats on consecutive days only if nothing else is eligible.
- Modules left unplaced join a back sheet in standard order.

Rendering: `DailyBreadEdition.tsx` shows a masthead with the persisted serial, the
contents line, the bands, previous/next navigation, and a colophon naming the archetype
and any quality note. CSS lives in `design-system/daily-bread-v2.css`.

## 8. Procedural visual engine

`src/lib/daily-bread/visual/` and `src/components/daily-bread/visual/ProceduralScene.tsx`:

- **Scenes:** Living Water, Grain and Wilderness Stars. Each is a pure seeded scalar
  field (`field.ts`) mirrored in GLSL ES 1.00 (`shaders.ts`).
- **Renderers:** riso (halftone plus crimson misregistration and stepped grain),
  halftone, and ASCII on Canvas2D.
- **Poster:** a static halftone SVG (`poster.ts`), server-rendered first and always
  present.
- **Runtime:**
  - Motion runs only when both OS and in-app reduced motion are off, the scene is
    intersecting, and the page is visible.
  - Capped at 30 fps and DPR 1.5.
  - On `webglcontextlost` the scene shows the poster and rebuilds on restore.
  - The canvas is `aria-hidden` and needs no CSP change.
- No runtime image generation and no third-party rendering library.

## 9. Security

- Secrets are read at call time, never stored on objects. They are never in the
  document, never in `NEXT_PUBLIC_*`, and redacted from every log line and error.
- `/api/admin/daily-bread/publish` requires `X-Internal-Secret`. It validates the date
  (the live date or the two days before), is rate-limited to 10/min, reads a body of
  at most 256 bytes, and refuses a fixture source.
- `/api/admin/daily-bread/health` accepts the internal secret or an allowlisted
  founder session, and is rate-limited to 30/min.
- `/admin/preview/daily-bread-v2` is admin-only and noindex.
- The reader path renders text as text. The JSON-LD is the only injected block, with
  `<` escaped.
- Links pass `safeHref`: same-site paths, or public https without credentials or IP
  literals.
- Images pass `safeAssetSrc`: `/images/**` or the project's `edition-assets` public
  bucket.
- Good News is human-curated only (`src/data/daily-bread-good-news.ts`) and validated.
  Models never produce it.

## 10. Observability

- **Logs:** structured `[daily-bread] {json}` lines with run id, event, stage timings
  and redaction.
- **Attempts:** the `daily_bread_publication_attempts` table.
- **Health** (`health.ts`):
  - `down` when today is unpublished 90 minutes after rollover.
  - `degraded` when today is fallback or minimum, tomorrow is not ready 2 hours before
    rollover, or 2 or more consecutive failures have occurred.
  - Also reports 7-day counts and estimated cost.
- **Alerts:** the scheduler workflow files a GitHub issue when a run fails or health
  is down.

## 11. Routes and cache

| Route | Flag off | Flag on | Cache |
| --- | --- | --- | --- |
| `/daily-bread` | SA-090 paper | newest published ≤ today; notice if today is still on the press | ISR 300 s |
| `/daily-bread/YYYY-MM-DD` | 404 | frozen edition, prev/next | ISR 3600 s |
| `/daily-bread/archive` | SA-114 date list | persisted index, `?before=` cursor | ISR 300 s (dynamic with cursor) |
| `/daily-bread/archive/[date]` | SA-114 re-render | redirect to `/daily-bread/[date]` | dynamic |
| `/daily-bread/[date]/opengraph-image` | house card | serial + title + verse card | 3600 s |

## 12. Tests

| File | Covers |
| --- | --- |
| `daily-bread-v2-sql` | Postgres semantics, RLS, grants |
| `daily-bread-v2-time` | Clock, DST, parity |
| `daily-bread-v2-composition` | PRNG, archetypes, anti-repeat |
| `daily-bread-v2-providers` | Chain, transports, frame validation |
| `daily-bread-v2-comic` and `-comic-verses` | Renderer, SVG safety, templates, verbatim captions |
| `daily-bread-v2-procedural` | Fields, poster, shaders, frame gate, component lifecycle |
| `daily-bread-v2-security` | Links, redaction, document validation, endpoint auth, rate limit |
| `daily-bread-v2-pipeline` | Quality, failure injection, scheduler, backfill, health, E2E |
| `daily-bread-v2-routes` | Loaders, rendering all eight archetypes, flag behaviour |

CI also runs `npm run daily-bread -- e2e`.
