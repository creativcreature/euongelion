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
   credential values or credential-shaped strings. It also enforces the plan's
   **minimum publishable issue (§29)**:
   - core Scripture and the reading, both placed;
   - a prayer or spiritual response the reader sees: a placed `prayer` or `practice`,
     or a prayer inside the placed reading;
   - a composition with an archetype and placements;
   - a visual treatment (the scene poster).

   The prayer comes from a scripture canon in the committed BSB corpus, so a total AI
   outage still meets the minimum. The optional modules (comic, crossword, image, Good
   News, gallery, extra games, motion) never block.
9. **Mark ready.** Only the lease holder can mark ready. The document is frozen.

`publish.ts`:

1. The rollover must be reached.
2. Reviewed `edition_items` used by the build are re-checked. A row rejected since the
   build sends the edition back to draft for a rebuild.
3. `daily_bread_publish` runs.
4. A new publication logs one `edition_published` event (plan §28 step 34): date,
   issue, volume, quality, fallback level, frame provider, comic level, module failures
   and `secondsAfterRollover`. There is no metrics backend, so this log line is the
   metric.

The internal publish route then calls `revalidatePath` for `/daily-bread`, the dated
page and the archive (plan §28 step 31). It does this on `published` and on
`already_published`, so the Worker cron's call after a CI publish refreshes too.

**Plan §28 steps not built here:**
- **Step 25, static visual fallbacks frozen at build.** The poster is drawn from the
  frozen scene and seed by versioned code. Freezing its drawing waits for the founder's
  verdict on the scene direction (`daily-bread-scenes-a-vs-b`); freezing it now would
  lock in the scenes the founder called "not great".
- **Step 32, the current-edition pointer.** `/daily-bread` resolves the current paper
  by query: the newest published edition on or before today's editorial date. The
  published row is the pointer, so a separate stored pointer could only drift from it.

**Last-known-good (plan §31)**, in `read.ts` `loadLiveEdition`:
- `current`: today's paper is published.
- `on-press`: less than `PRESS_GRACE_MINUTES` (35) after rollover, with no paper for
  today. The previous paper shows under "Today's paper (date) is still on the
  press. This is the most recent edition, from (date)." The Worker cron publishes at
  :01 and retries at :15 and :30.
- `last-known-good`: past the grace window. The notice says "is delayed". Every
  render logs a `last_known_good_served` line at `level: critical` to Workers Logs.
  A cron firing past the window that cannot publish logs `cron_publish` at
  `level: critical`. Health reports `down` 90 minutes after rollover, and the
  scheduler workflow files an issue.
- An older paper always carries its own date and never the "That's today's bread"
  ending.

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
- `fallback`: under the full policy, Claude did not write the frame (the backup
  provider or the deterministic floor did: plan §30, "meaningful alternate providers").
  Also when the Scripture came from the weekly verse, the comic was reprinted or
  omitted, or any module failed.
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
Under the weekly model, the founder approves strips at `/admin/comics`, and the
machine stays paused until the founder rules on the drawing style
(`echo-dust-weekly-code-vs-codex`).

**The plan §32 trace**, checked on 2026-09-14 against every strip row in production:

| Link | Finding |
| --- | --- |
| Generation, output parsing | `generate-strip.mjs` writes the script with `claude -p`, draws with Codex and inspects it. It never ran in CI (causes above). |
| Asset creation, file format | 7 strip files, all `image/jpeg`, 0.70–0.85 MB, 1512×745. |
| Storage, permissions, signed URLs | Public `edition-assets` bucket: every file answers 200 with no signature, so nothing expires. |
| **Storage, stale path** | **Defect found.** Strip numbers named the files, and 2026-08-24 "No. 4: The Receipt" was written over `echo-dust-004.jpg`, the published No. 1. Files are now named by date and run stamp with `x-upsert: false`. A strip whose file another row shares is never reprinted. |
| Database reference, missing DB field | Every row has `image`, `alt`, `caption`, `panelId`, `width` and `height`. |
| **Database reference, overwrite** | **Defect found.** `--force` upserted the row, which could turn an approved strip back into a draft with a new picture. It now refuses when the date's strip is approved. |
| URL construction, CDN, CORS | Absolute Supabase public URLs, served with `access-control-allow-origin: *` and `cache-control: no-cache`. |
| Image-host allowlist, Next/Image | `images.unoptimized: true`, so there is no loader or host allowlist to fail. CSP `img-src 'self' data: https:` allows the host. |
| Browser request, malformed image | The build checks each image with a HEAD request (200 and `image/*`) before it prints the strip (`httpImageAvailable`). |
| Hydration, component rendering | Server-rendered with no client component, so hydration cannot fail. |
| Cache | None in front of the page (§11). |

`__tests__/daily-bread-v2-comic-root-cause.test.ts` pins each cause: the CLI installed
before the probe, the 150-minute timeout, tier-3 composition, `issues: write`, files
never overwritten, and approved strips never redrawn.

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

**Module tiers and rotation (plan §40).** Not every department prints every day.
`MODULE_ROLES` sorts modules into three roles:
- **Anchors** print whenever they exist, unless the archetype leaves them out by
  design. They are the Scripture, the reading and its lead, the practice, the prayer,
  the scene, the rabbit holes, and the comic. The comic is an anchor because the
  founder's weekly Echo & Dust strip "continues day to day" (2026-09-14).
- **Departments** rotate: the Hebrew word, red letters, catechism, gallery, hymnal,
  voices, archive pull, How to Read, proverb, Good News, season, memory verse,
  question, the Bible-in-a-year plan, and the letters, witness, screening and notices
  columns.
- **Interactives** rotate: crossword, verse rebuild, quiz, word search, coloring.

Each archetype prints a budget of departments and interactives:

| Archetype | Departments | Interactives |
| --- | --- | --- |
| Broadsheet | 7 | 2 |
| Illuminated, Field Notes, Red Letter | 5 | 1 |
| Joy | 5 | 2 |
| Study Table | 4 | 3 |
| Prayer Book | 4 | 0 |
| Quiet | 3 | 0 |

How the budget is filled:
- Required modules count toward it.
- The rest go to whichever department or interactive printed longest ago, or never,
  using the last 14 days of printed modules. Seeded jitter breaks ties.
- The frozen document keeps only what printed.
- `composition.rotation` lists what printed and what rested, with how long ago each
  rested module last ran.
- A band that loses a piece to rotation re-spans the rest so its row stays full.

A 14-day simulation prints every department at least once and none on more than 7
days.

**Superseded ruling, recorded.** SA-114 (founder, 2026-08-20) asked for "same modules
but slightly altered layouts". The V2 plan (2026-09-13) says "Do not render every
department every day", and this rotation follows the later instruction. The earlier
rule that games are never adjacent still holds: in every archetype, games sit in
separate bands.

**Anti-repetition (plan §42) and the selection engine (§43).** The build reads 90
days of history.

| Dimension | Rule | Kind |
| --- | --- | --- |
| Archetype | not yesterday's; recency penalty 3.0 / 1.6 / 1.0 over the last three days | hard + soft |
| Hero treatment | not yesterday's (Broadsheet and Field Notes share `lead-with-rail`; Illuminated and Joy share `scene`) | hard |
| Gallery work | not hung within 60 days. With 145 audited prints at 7 a day that cannot always hold, so when fewer than three days' worth remain, the longest-rested return first and a note says so | hard, sized to the library |
| Gallery artist | not hung this week, and not twice on one wall, where the pool allows | soft |
| Historical voice | not a quote from the last 30 days; not an author from the last week, where the 15-author bank allows | hard + soft |
| Procedural renderer | not yesterday's | hard |
| Scene | the frame avoids recent scenes | soft |
| Comic | the Echo & Dust reprint cooldown (§6) | hard |
| Games and departments | the longest-rested wins (§40) | soft |
| Module order | follows from the rules above; a 60-day simulation finds no order repeated within 14 days | tested |
| Reusable art (lead plates) | a series' hero art repeats for the days of its series by design; generated plates are per date | n/a |

Every pick uses the seeded PRNG, so the same inputs always give the same paper. The
debug explanation is stored with the issue:
- each archetype's `scoring[].why`, with the chosen one and any higher score passed
  over;
- `rotation.rested`, with how long ago each rested module last ran;
- `explanations`, with every cooldown that changed what printed.

`/admin/preview/daily-bread-v2` shows all three.

**Scroll rhythm (plan §41).** `composition.beats` gives each band one of the plan's
ten beats, read from what it holds. The order of precedence is: interactive, then
immersive (the front band), prayer, longform, dense, scriptural, visual, playful, quiet
and brief. A 60-day simulation uses all ten beats and never prints three bands in a row
with the same shape and beat. Back-sheet pairs rotate half/half, wide/narrow and
narrow/wide.

Rendering: `DailyBreadEdition.tsx` shows a masthead with the persisted serial, the
contents line, the bands, previous/next navigation, and a colophon naming the archetype
and any quality note. CSS lives in `design-system/daily-bread-v2.css`.

**The composition manifest (plan §37)**, archived in `edition.composition`:

| Plan field | Stored as | Source |
| --- | --- | --- |
| archetype | `archetype` | the scoring |
| heroVariant | `heroVariant` | derived from the first band actually placed: `lead-with-rail`, `lead-with-word`, `lead`, `scene`, `scripture`, `red-letter`, `prayer` |
| density | `density` | the archetype's `presentation` |
| moduleOrder | `moduleOrder` | placements in reading order |
| visualRhythm | `rhythm` | one beat per band |
| accentStrategy | `accentStrategy` | `presentation`; each value names a real `.db2-arch--*` rule (a test checks the stylesheet) |
| separatorStyle | `separatorStyle` | `presentation`, checked the same way |
| motionLevel | `motionLevel` | `presentation`: `full`, or `gentle` (half speed) for Quiet and Prayer Book; `ProceduralScene` honours it, and `still` keeps the poster |
| proceduralPreset, proceduralSeed | `procedural: { scene, renderer, seed }` | the scene module as printed; named presets arrive with §50–51 |
| rendererVersion | `rendererVersion` | `DAILY_BREAD_RENDERER_VERSION` |

Editions composed before 2026-09-14 lack these fields. Readers fall back to the
archetype's definition, and the admin preview shows the manifest.

## 8. Procedural visual engine

**Read first: `docs/daily-bread/VISUAL-ENGINE-CONSTRAINTS.md` (plan §44).** It
measures the founder's style anchors and sets 13 constraints (palette, screen, grain,
composition, negative space, ASCII). The engine below fails most of them as of
2026-09-14; the rebuild waits on the scenes verdict.

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
- No runtime image generation and no third-party rendering library. Licences and the
  audit run are in `DEPENDENCIES-AND-LICENCES.md` (plan §46).

**Fallback tiers (plan §52).** Each tier is reached as follows:
1. **Live frame:** WebGL, or the Canvas2D ASCII overlay.
2. **Static poster:** the SVG halftone. Readers get it with no JS, with reduced motion,
   without WebGL or 2D canvas, with a `still` motion level, or after context loss.
3. **CSS texture:** a halftone screen drawn in CSS, when no poster can be drawn (a scene
   this renderer version does not know).
4. **Typography only:** the scene's label, set as a rubric, under
   `forced-colors: active` and in print.

No essential content lives in the canvas.

**Stored images degrade to type (plan §55).**
- At build: a generated lead plate is used only if its file answers 200 with an image.
  Otherwise the series art is used, with an asset-fallback note. The comic already has
  this check (§6).
- At read time: `PlateImage` replaces a plate that fails to load. A lead plate simply
  goes, and the headline carries the lead. The Echo & Dust strip prints its own words
  as type.

**The asset reservoir (plan §53).** `npm run daily-bread -- reservoir [--usage]`
writes `docs/daily-bread/asset-reservoir.json`. It holds 192 assets: 145 audited
historical prints, 42 series riso plates, 3 procedural posters and 2 approved Echo &
Dust strips. Each carries tags, Scripture affinity, liturgical affinity, artist,
rights, aspect ratio, usage count and last use. Only recorded facts are filled in:
- The print audit records no rights, so those prints say `unrecorded`.
- No source records liturgical affinity yet.
- Usage comes from the published editions.

**Waiting on the scenes verdict** (`daily-bread-scenes-a-vs-b`, §4 of the constraints
document):
- the approved preset system (§50–51);
- the dither, grain and typography module split (§47).

Option B would replace the procedural engine with series art, so both wait.

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
  - Each entry carries `verifiedAt` (plan §73): when a person checked the source. It must
    fall after the report's date and on or before the print date; anything else is
    dropped, and the paper prints "Source checked <date>".
  - The list is empty today. Nothing prints until the founder adds a verified item.
- Rabbit-hole threads (plan §74) are same-site links only: a past Daily Bread edition
  (newest first) or a devotional on the same book and chapter. There is one per rabbit
  hole, never the same thread twice in an edition, and never a feed.
  `validateEditionDocument` rejects an off-site thread.

## 10. Observability

- **Logs:** structured `[daily-bread] {json}` lines with run id, event, stage timings
  and redaction.
  - Every attempt ends with one `attempt_completed` line (plan §66): `target_date`,
    `attempt_id`, `edition_id`, `issue_number`, `stage`, `provider`, `fallback_level`,
    `quality`, `duration_ms`, `result`. A failed attempt adds `failed_stage` and
    `error`.
- **Stages (plan §67):** `scheduler_received`, `lock_acquired`, `sources_loaded`,
  `asset_selection`, `primary_generation`, `fallback_generation` (a warning, when the
  chain moved past Claude), `comic_generation`, `composition`, `validation`,
  `static_capture` (logged as skipped until the poster is frozen at build), `ready`,
  `published`, `cache_revalidated`. The attempt records the stage in progress, so a
  failure is filed against the stage that failed. Before 2026-09-14 every build failure
  read "assemble".
- **Attempts:** the `daily_bread_publication_attempts` table. `attempt_id` is now set by
  the pipeline, so the log line and the row share it.
- **Metrics (plan §68):** the repo has no metrics backend. The attempt line,
  `edition_published` and the health JSON are the counters. No platform was added.
- **Health** (`health.ts`, the CLI, and `/api/admin/daily-bread/health`):
  - `down` when today is unpublished 90 minutes after rollover.
  - `degraded` when today is fallback or minimum, tomorrow is not ready 2 hours before
    rollover, or 2 or more consecutive failures have occurred.
  - Plan §69 fields: `latestPublished`; `next.rollover` (the next expected
    publication); `next.lifecycle` (whether the next issue is ready); `live.quality`;
    `latestFailure`, with stage and message; `providers.claude` (`ok`, `failing` with
    the reason, `not configured` or `unknown`); `providers.secondary` (`configured` or
    `not configured`). Provider state is read from the newest recorded frame
    generation.
  - Also reports 7-day counts and estimated cost.
- **Alerts (plan §70):** `alertLevel` is `none`, `warning` or `critical`.
  - **Critical:** today missing after rollover; no issue ready 2 hours before the
    deadline; 2 or more consecutive failures; the database publication transaction
    failed; 3 or more duplicate attempts on one date.
  - **Warning:** Claude failed and the backup wrote the frame; the secondary provider
    failed; the comic was omitted; today published at fallback or minimum quality.
  - `npm run daily-bread -- health` exits 1 on `down` or `critical`. The scheduler
    workflow then files a GitHub issue. Warnings are never shown to readers.
- **Client visual failures (plan §71, optional):** not collected. The scene falls back
  silently to its poster.
- **Cost (plan §72):** API providers record tokens and estimated cost. The Claude CLI
  now runs with `--output-format json` and records input tokens (including cache),
  output tokens, the writing model and `total_cost_usd`. On the subscription, that
  figure is the API-equivalent price, a measure rather than a bill. Output with no
  usage never fails a task.

## 11. Routes and cache

| Route | Flag off | Flag on | Cache |
| --- | --- | --- | --- |
| `/daily-bread` | SA-090 paper | newest published ≤ today; notice if today is still on the press | ISR 300 s |
| `/daily-bread/YYYY-MM-DD` | 404 | frozen edition, prev/next | ISR 3600 s |
| `/daily-bread/archive` | SA-114 date list | persisted index, `?before=` cursor | ISR 300 s (dynamic with cursor) |
| `/daily-bread/archive/[date]` | SA-114 re-render | redirect to `/daily-bread/[date]` | dynamic |
| `/daily-bread/[date]/opengraph-image` | house card | serial + title + verse card | 3600 s |

**What the Cache column means in production (checked 2026-09-14).** The Worker has no
OpenNext incremental cache (`open-next.config.ts` configures none). `/daily-bread`
answers `x-nextjs-cache: MISS` on every request. The dated page and the archive answer
`no-store`. Nothing sits in Cloudflare's cache in front of the Worker. A publication
or revision is therefore visible on the next request. `/daily-bread` still sends
`s-maxage=300, stale-while-revalidate=31535700`. If a Cloudflare cache rule is ever
added for these paths, that header would let a shared cache serve a stale paper.
Review it at that time; the publish route's `revalidatePath` does not purge
Cloudflare's CDN.

**SEO (plan §78).** Each dated issue carries:
- a unique title (title, serial, paper name) and the deck as its description;
- a canonical dated URL;
- `og:type article` with `publishedTime`;
- a 1200×630 OG card and `twitter:card summary_large_image`;
- NewsArticle and PublicationIssue JSON-LD (checked in production's HTML on
  2026-09-14).

Withdrawn issues are `noindex`, and so is the admin preview. `sitemap.ts` now lists
every published issue and the archive. It renders per request, so a new issue appears
the morning it publishes, and a failed read leaves the rest of the sitemap serving.

**Historical-issue caching (plan §79): a decision, not built.** Published issues could
be cached for a long time, invalidating only a revised issue and the archive. The
Worker has no OpenNext incremental cache today (§11). Turning one on means binding R2
or KV plus a tag cache: a Cloudflare configuration and cost choice for the founder. The
publish route already revalidates the right paths when a cache exists.

**Posters as archive thumbnails and share images (plan §80): waiting.** The poster is
already the reduced-motion and WebGL fallback. Using it for archive thumbnails and OG
cards would spread art that fails `VISUAL-ENGINE-CONSTRAINTS.md`. That waits on the
scenes verdict. Until then the OG card stays the house text card, with serial, title
and verse.

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
