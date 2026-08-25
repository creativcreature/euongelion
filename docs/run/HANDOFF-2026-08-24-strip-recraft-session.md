# HANDOFF — 2026-08-24 session: the paper heals + the strip recraft

**Session scope:** SA-114 (F-158). Two threads: (1) Daily Bread outage
repairs, SHIPPED to production on main; (2) the Echo & Dust → funnies
recraft, IN FLIGHT on branch `feat/strip-recraft-handmade`, awaiting
founder verdicts. Read this before touching either thread.

---

## THREAD 1 — Daily Bread repairs (DONE, on main, live)

What the founder reported (2026-08-24): comics not loading daily,
crossword clues invisible on mobile, general mobile inconsistency.

What shipped (commits `5921035a`, `bc7dd579`, `7cfc5ca5` on main;
deployed; live SW v154):

1. **Comics outage root cause**: weekly Wednesday build ran Aug 19 with
   the strip machine PAUSED, hand-drawn strips covered only Aug 20-22,
   and `generate-strip.mjs` was committed with a split template literal
   (SyntaxError). Script fixed; strips No. 4-7 drawn + installed for
   Aug 23-26. (No. 6/7 later VETOED — see Thread 2.)
2. **daily-gapfill.yml** — 08:00 UTC daily CI backstop: fills missing
   guides/lead-plates/strips for today+2. Idempotent by construction;
   proven green in CI run 32757758362. Tier helper optional (falls back
   to plain CLAUDE_CODE_OAUTH_TOKEN until the failover branch merges).
3. **Crossword mobile**: clue lists print OPEN by default; toggle reads
   "Hide clues"/"All clues". Test re-pinned (`crossword-clues-visible`).
4. **Word search mobile**: cells fluid under 420px (was clipping two
   columns behind an invisible inner scroll). Guard test
   `wordsearch-mobile-fit.test.ts`.
5. **Lead plates + guides backfilled** through Aug 26 (Storage/DB, no
   deploy needed).

### Incident during this thread (recorded in memory + prod-ahead memory)
A clean-main deploy ROLLED BACK the other session's unmerged
`feat/seeking-help-georgia` work (help page + All These Things series).
Founder caught it. Restored via LOCAL merge deploy (never pushed):
worktree at their tip → merge origin/main → SW bumped past both
lineages (v154) → deploy. **Standing rule: before ANY main deploy,
check `git branch -a --no-merged origin/main` and curl branch-only
routes; if prod is ahead, deploy a local merge or wait for the PR.**

### Open hazards for the next session
- `feat/seeking-help-georgia` may still be unmerged; prod serves a
  local merge ahead of main. Any main-only deploy repeats the rollback.
- **F-168 is double-claimed** (their series vs main's image fix) —
  registry adjudication needed when their PR lands.
- Full-suite failures in the SHARED tree (39-series count,
  narration-manifest) belong to their branch, not main.
- `edition-admin-queue` "CLEAR deletes the steer" test is a known
  cross-test flake: passes isolated and on rerun.

---

## THREAD 2 — the funnies recraft (IN FLIGHT, branch `feat/strip-recraft-handmade`)

### Founder rulings, in order (all 2026-08-24, binding)
1. "The comics are terrible... nothing like Peanuts... art still looks
   AI... needs to feel more handdrawn and handmade" + attached a café
   brush-sketch reference (now committed:
   `content/strip-reference/style-north-star-cafe.png`).
2. "Look at popular sunday comic strips and how they are written...
   use real world examples to measure against... you keep designing
   things without any type of reference."
3. "Make a new branch if need be, Im sick of everyone overwriting each
   others work" → all recraft work lives on this branch only.
4. After seeing drawn candidates: "Still not a fan. Give me several
   scripts - dont generate any images... The literal writing is
   terrible." → NO IMAGE GENERATION until a verdict approves writing.
5. Direction pivot: "content should feel closer to Beetle Moses or
   NakedPastor or Asherperlman... do a last 30 days for similar
   content and come with better options. More funny, more relevant."

### Machine state (IMPORTANT)
- `STRIP_MACHINE` repo variable = **paused** (founder-standard gate:
  do NOT re-enable until a strip standard is approved).
- Strip drafts for 2026-08-25 and 2026-08-26 = **status 'rejected'**
  in edition_items (vetoed; the paper prints the placeholder frame).
  Published strips Aug 20-24 remain as printed history.
- daily-gapfill.yml skips strips while STRIP_MACHINE != enabled;
  guides + lead plates continue daily.

### What exists on the branch
- **Canon v2** (`content/strip-reference/ECHO-AND-DUST-CANON.md`):
  THE CRAFT STANDARD (six engines: football pull, five-cent booth, the
  wall, the pounce, snowman escalation, reaction panel; photographable
  panel-1 law; ≤10-word balloons; voice cards; seven-point measured
  gate) + THE HANDMADE LAW (brush-pen wobble on cream, NO halftone/
  duotone/gradients, measured against the café reference).
- **Handmade character sheet**
  `workshop/character-sheet-handmade-v2.png` (canon-true: black hoodie,
  crimson heart, Teddy real nose, Dust galaxy).
- **Three drawn candidates** (`workshop/strip-recraft-{a,b,c}-*.png`)
  — founder saw A ("The Block") and said "still not a fan" of the
  writing; treat all three as style-samples only.
- **Generator recrafted** (`scripts/edition/strip/generate-strip.mjs`):
  writer prompt demands `engine` + `gate` JSON fields; draw prompt is
  handmade-law; anchors = handmade sheet + café north star.
- **Pitch**: euangelion.app/admin/pitches/strip-recraft-handmade
  (images embedded; superseded by the lanes below — update it after
  the next verdict).

### The current proposal (delivered in chat, AWAITING VERDICT)
Research: last30days run 5/5 sources, raw at
`~/Documents/Last30Days/christian-humor-comics-beetle-moses-nakedpastor-asher-perlman-style-raw-v3.md`.
Findings: all three reference artists win with SINGLE-PANEL,
caption-forward, screenshot-speed cartoons; captions survive without
the drawing; deadpan beats zinger; warmth is the open position
(NakedPastor's mechanics run bitter).

Three lanes pitched (scripts only, no images, per ruling #4):
- **Lane 1 "Bible, Deadpan"** (Beetle Moses register) — scripture
  scenes as present-tense logistics. 5 sample captions delivered.
- **Lane 2 "Jesus, Present Tense"** (NakedPastor mechanics, warm) —
  RECOMMENDED anchor identity. 5 samples incl. "UNEXPECTED ITEM"
  self-checkout and the waiting-room tender one.
- **Lane 3 "The Examined Life"** (Perlman register) — attention/hurry
  themes. 4 samples incl. "Post that." and "He had a system."
Recommendation: Lane 2 anchor, Lane 1 rotating, Lane 3 caption
discipline everywhere; single panel replaces the continuity strip
daily; **Echo & Dust retire to occasional Sunday guests** (founder has
NOT ruled on this).

Earlier same-session: seven Echo & Dust scripts in the craft-standard
register (The Cone, Draw Four, The Hoodie, Ready or Not, The Truck,
Fifty-Six, Picture Day) — no verdict given before the artist-reference
pivot; consider them superseded unless the founder revives them.

### Resume protocol (next session)
1. Check the pitch site + chat for verdicts (lane choice, per-gag
   approvals, Echo & Dust retirement ruling).
2. On approval: draw ONE sample panel per approved gag in the handmade
   style (anchors: café ref + — for Lane 2 — a Jesus design the
   founder must approve FIRST; no Jesus design exists yet and it is a
   sensitive design decision: propose 2-3 on the pitch site before any
   strip uses one).
3. Founder approves drawn samples → update canon (funnies format
   section), refit `generate-strip.mjs` writer/draw prompts to the
   chosen lane(s), re-enable STRIP_MACHINE, backfill vetoed dates.
4. Merge the branch via PR only after the founder approves the full
   standard. Never commit recraft work to main directly.
5. Traps: run `git branch --show-current` beside every commit (branch
   hijack happened this session); unset ANTHROPIC_API_KEY after
   sourcing .env.local before any `claude -p` (credit-balance trap);
   codex needs repo-cwd + stdin prompt.

### Founder decision queue (blocking)
1. Which lane leads (or mix), and which sample gags are approved.
2. Echo & Dust: retire from daily / Sunday guests / keep somehow?
3. Jesus-on-panel: allowed at all? If yes, design approval needed.
4. Re-enable timing for STRIP_MACHINE (after which approvals).
5. Backfill the vetoed Aug 25/26 slots retroactively, or leave the
   placeholder as history?
