# HANDOFF — "All These Things" series build (devo-go)

**Started:** 2026-08-24 · **Branch:** `series/all-these-things` · **Slug:** `all-these-things`
**Ids claimed:** **SA-123** (week shape ruling) · **F-168** (feature PRD)
**Founder instruction (verbatim, this session):**

> "build now and make live. ensure the audio is full and doesnt clip at thr end"
> "Please run fully, no approval gate tonight. Please make the entire devotional images and audio etc and post live to the site, deploy commit."

So: **no reading-gate pause.** Artifact still published (SA-031), but non-blocking. Ship to production.

---

## Founder rulings captured this session (these ARE the brief header)

| Question          | Founder's answer                                                                                                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Override          | Build now AND make live. Audio must be **full and must not clip at the end**.                                                                                                                                                                                                                |
| Week shape        | **7 days, MONDAY start** (deviates from SA-029's Sunday/sabbath-first — this is why SA-123 exists)                                                                                                                                                                                           |
| Stance on baggage | Name the misuse **once, early, then teach** (Jabez precedent)                                                                                                                                                                                                                                |
| Spine             | "Seek ye First the Kingdom. God big promises, our crying out to Him, standing deeply on Faith (the movie silence), Him Being a Rock with no need for mediation in relationship, He is the wholeness, and all things come from Him. We continue to become anxious inspite of His steadyness." |

**Spine decoded into the week:** God's steadiness vs. our recurring anxiety. The
film/novel _Silence_ (Endō Shūsaku, 1966; Scorsese 2016) is the Day 3 pivot
reference — faith that stands while God says nothing. "No mediation" = Day 4,
the torn veil / Heb 4:16 / 1 Tim 2:5. "All things come from Him" = Day 5, and
note **1 Chron 29:14 KJV reads "for all things come of thee"** — the founder's
own phrase is in the text. Use it.

---

## Week shape (SA-123) — Monday start

Because the week STARTS Monday, the sabbath moves to the END (Day 7 = Sunday).
The week now _ends_ in rest, which is Matthew 6:34's own logic ("sufficient
unto the day"). All SA-029 shapes are preserved, just reordered.

| Day | Weekday | Position      | Target words | Content                                                                |
| --- | ------- | ------------- | ------------ | ---------------------------------------------------------------------- |
| 1   | Mon     | A (hook)      | 3,500        | "Seek ye first" — the command + the promise. Matt 6:33.                |
| 2   | Tue     | B (build)     | 3,500        | merimnaō; name the weaponising of Phil 4:6 ONCE, then teach.           |
| 3   | Wed     | **C (pivot)** | 4,000        | **God's silence.** Faith standing when nothing is answered. _Silence_. |
| 4   | Thu     | B′ (apply)    | 3,500        | The Rock; direct access, no mediator. Phil 4:5 "The Lord is at hand."  |
| 5   | Fri     | A′ (resolve)  | 3,000        | He is the wholeness; all things come from Him; peace that garrisons.   |
| 6   | Sat     | recap         | 1,500        | No new teaching. MUST carry Further-Your-Learning.                     |
| 7   | Sun     | sabbath       | 400          | Silence/rest.                                                          |

Every day opens with **two-minute-open-v2** (SA-030/SA-034): scripture → vocab →
teaching write-up (150-250w) → reflection → prayer → cta
(`ctaLabel: "DEEP DIVE"`, `ctaHref: "#devotional-section-7"`), and declares
`"format": "two-minute-open-v2"` at top level.

---

## Phase status

- [x] **P1** Read governing docs; AskUserQuestion answered; shape locked; branch created
- [ ] **P2** Research fan-out — 4 agents running (stories / quotes / lexicon+context / videos)
- [x] **P2b** Scripture pulled verbatim from `public/bibles/` corpus (see below)
- [ ] **P3** Brief + source pack
- [ ] **P4** Draft — SINGLE AUTHOR, days 1-7 in order, no per-day agents (trap #19)
- [ ] **P5** Editor agent + readability gate (`scripts/check-readability.mjs`)
- [ ] **P6** Reading artifact (published, NON-blocking per founder)
- [ ] **P7** Imagery via Codex CLI + video finalisation
- [ ] **P8** Wiring (`series.ts`, `series-rails.ts`, test counts)
- [ ] **P9** Tracking (SA-123, F-168, CHANGELOG)
- [ ] **P10** Narration + score — **COST GATE FIRST (--dry-run)**
- [ ] **P11** Gates
- [ ] **P12** Preview verification (Workers runtime)
- [ ] **P13** Ship + deploy live + warm cache + live-verify

---

## Environment findings (already resolved — don't re-litigate)

- **`ffmpeg` is NOT installed and is NOT needed.** `render_el_catalog.py` and
  `produce.py` use macOS **`afconvert`** (`/usr/bin/afconvert`). Narration works.
- **`codex` CLI was missing; installed** `@openai/codex` 0.149.1 →
  `/Users/jamesparker/.local/node/bin/codex`. `~/.codex/auth.json` exists.
  Claude Code has NO `image_gen` — imagery MUST go through Codex (CLAUDE.md).
  Note `references/imagery-and-video.md` still describes Higgsfield; that is
  STALE — CLAUDE.md's 2026-08-16 ruling (Codex built-in only) governs.
- ElevenLabs key present in `.env.local`; voice id
  `0M0xGVTkQm5KFMY3Sci2` (`euangelion-voice-prototype/el-voice-id.txt`).
- Next ids verified from canonical registries: SA-122 was last → **SA-123**;
  F-167 was last → **F-168**.

## The audio requirement (founder's explicit bar)

"ensure the audio is full and doesnt clip at thr end". Known related bug in
project memory: Audio Edition silently skipped ~29% of every devotional. So:
after rendering, **verify the tail** — decode the shipped `.m4a`, confirm the
final words of the last module are actually spoken, check `textHash` matches,
duration drift < 0.5s, chapters inside runtime, file < 25 MiB. Do not trust the
manifest alone.

---

## Scripture already pulled verbatim (corpus = only allowed source)

Puller script: `scratchpad/pull.py` — `python3 pull.py <TR> <BOOK> <CH> <V1> [V2]`.

Pulled and confirmed: Matt 6:25-34 (BSB/KJV/ASV/DARBY), Phil 4:4-9
(BSB/KJV/DARBY/ASV), Ps 62:1-2, Deut 32:4, Ps 18:2, Ps 22:1-2, Ps 13:1-2,
Lam 3:22-26, 1 Kgs 19:11-12, 1 Kgs 3:5-13, Exo 16:4/19-21, Matt 6:9-13,
1 Pet 5:6-7, Hab 1:2-4, Hab 2:1-4, Matt 27:45-46/50-51, Heb 4:14-16,
1 Tim 2:5, 1 Chr 29:11-14, Isa 26:3-4, Jas 1:17, Rom 8:32, Col 1:16-17.

**Corpus casing traps confirmed live:** repo KJV prints "the Lord"; BSB prints
"the LORD". DARBY carries `[bracket]` supplied-word markers; YLT carries
`<FI>…<Fi>`. Strip or avoid block-quoting those two.

**The Solomon chain (Day 1's spine, and it is strong):** 1 Kgs 3 — Solomon asks
for wisdom FIRST and God adds "that which thou hast not asked", riches and
honour → Matt 6:33 "all these things shall be added" → Matt 6:29, even Solomon
in all that glory was not arrayed like one lily. The passage supplies its own
Old Testament link.

---

## If you are resuming this build

1. `git branch --show-current` should be `series/all-these-things`.
2. Read this file top to bottom, then `content/series-briefs/all-these-things.md`
   and `content/source-packs/all-these-things.md` (the source pack is the ONLY
   citation pool — do not add sources from memory).
3. Check which day JSONs exist: `ls public/devotionals/all-these-things-*`.
4. Resume at the first unchecked phase above.
5. **Do not fan out drafting.** Trap #19: per-day writer agents produced the
   patchwork the founder rejected on The Harvest. One author, days 1-7 in order.

---

## Technical findings for the draft (established, don't re-derive)

### Exact JSON shape

Copy the shape from `public/devotionals/he-cannot-deny-himself-day-1.json` — it
is the newest reference build and uses `two-minute-open-v2`.

- **Top-level keys:** `day, chiasm_position, format, title, subtitle, teaser,
anchorVerse, theme, framework, scriptureReference, totalWords, panels, modules`
- **Teaching day module stack (29 modules in the reference):** scripture, vocab,
  teaching, reflection, prayer, cta ← _the open_ — then scripture, teaching,
  vocab, pullquote, scripture, inline-image, teaching, video, bridge, teaching,
  story, insight, teaching, scripture, reflection, interactive, teaching,
  prayer, takeaway, comprehension, profile, video, resource.
- **Recap day (6):** `format: two-minute-open-v2`, then
  recap, inline-image, pullquote, recap, reflection, takeaway, resource.
- **Sabbath day (7):** `format` ABSENT (no two-minute open — it is already short
  form). Modules: scripture, sabbath, inline-image, reflection, prayer, resource.
- Module fields use **flat** names (`content` as a plain string, `inlineImageSrc`,
  `prayerText`, `interaction_type`, `ancientTruth/modernApplication/
connectionPoint/newTestamentEcho`, `relatedScriptures[]/resources[]`).

### Validator (`scripts/validate-devotional.mjs`) — what it actually enforces

- **Word bands ±25%** counted over ONLY these module types: `teaching, scripture,
vocab, bridge, story, insight, recap, sabbath`. Everything else is free.
  Targets: A 3500 · B 3500 · C 4000 · B-prime 3500 · A-prime 3000 · recap 1500 ·
  sabbath 400.
- **`format: "two-minute-open-v2"`** forces modules[0..5] to be exactly
  `scripture, vocab, teaching, reflection, prayer, cta` and the cta's
  `ctaHref` to be exactly `#devotional-section-7`. BLOCKING otherwise.
- **Forbidden LABEL `/\bdevotionals?\b/i` is scanned in rendered prose.** Never
  write "devotional" in reader-facing text — use "reading" or "this series".
  Metadata fields are exempt via a skip list.
- Forbidden phrases incl. `in essence,` (with the comma), `it's not X, it's Y`
  (structural regex), `at the end of the day`, `let's unpack`.
- Every Hebrew/Greek string needs a Latin transliteration within ~80 chars.

### Red letter (SA-051) — MUST be baked into the JSON

The static day-JSON reader does NOT resolve at render time (only the soul-audit
paths call `resolveRedLetter`). Existing series have a literal `redLetter: [...]`
array on the scripture module. So **bake it**.

- Matthew 6:25-34 is **fully covered** in `src/data/red-letter-bsb.json`
  (keys are OSIS-ish: `Matt.6.33`), and `red-letter-kjv.json` carries the KJV
  wording too — so a KJV anchor still resolves. Verified: `Matt.6.33` KJV span
  is present.
- The resolver tries BSB wording then KJV wording, plus a translation-independent
  whole-verse set. `npx tsx` IS available (`node_modules/.bin/tsx`), so run the
  REAL `resolveRedLetter` from `src/lib/red-letter-resolve.ts` rather than
  reimplementing the matching.
- Philippians is not red-letter territory — only Matt/Mark/Luke/John/Acts/Rev.

### Corpus puller

`scratchpad/pull.py <TRANSLATION> <BOOK> <CHAPTER> <V1> [V2]`. Book codes are
3-letter (`MAT`, `PHP`, `PSA`, `1KI`, `1CH`, `HAB`, `LAM`, `EXO`, `HEB`, `1TI`,
`ISA`, `JAS`, `ROM`, `COL`, `1PE`, `DEU`).

### "Make live" is MORE than a deploy (imagery-and-video.md, mandatory on publish)

Publishing replaces the homepage main feature. This is part of shipping, not a
follow-up:

- `HOMEPAGE_TODAY` in `src/app/page.tsx` — **hardcoded**; the homepage feature
  does not derive itself. This is a known trap in project memory.
- `NEW_SERIES_ORDER` + `FEATURED_SERIES` in `src/data/series.ts`;
  `FEATURED_SERIES_SLUGS` in `src/data/series-rails.ts`.
- Bump `CACHE_NAME` in `public/sw.js` **and** `SW_VERSION` in
  `src/components/ServiceWorkerRegistration.tsx` **together** (audio + shell).
- Bump the series count in `__tests__/series-data.test.ts` and the PRD count in
  `scripts/check-feature-prd-integrity.mjs`.

### Imagery plan (Codex CLI, built-in image_gen only)

- Add an `all-these-things` entry to `scripts/imagery/series-image-subjects.json`
  (`subjects` map, 55 slugs there now), then assemble with
  `node scripts/imagery/build-prompts.mjs all-these-things` (`--portrait` for the
  tall master). **Never hand-write the prompt** — the preamble is founder-approved
  verbatim and lives in `scripts/imagery/prompt-preamble.md`.
- Every plate gets three assigned axes, varied across the set: composition
  archetype (A–J), coverage band (AIRY 20–35% / MID 40–55% / DENSE 70–90%, stated
  as a percentage in the subject line), and one named conceptual device.
- Style anchors attached on EVERY generation:
  `public/images/site/series/{prayer-of-jabez,he-cannot-deny-himself,looking-at-the-sun,the-harvest}.webp`
- Accuracy gate before placement (SA-052): count fingers on every hand, no Escher
  geometry, does it suit the passage, derive worst-case crops. Automated checks
  measure TEXTURE at native resolution, never brightness.
- Install: landscape master → `public/images/site/series/all-these-things.webp`
  at 1600×872 q60; day images → `public/images/series/all-these-things/`.

---

## Phase 3 artifacts COMPLETE

- `content/series-briefs/all-these-things.md` — full brief incl. founder
  rulings, day-by-day outline, translation rationale table, done criteria.
- `content/source-packs/all-these-things.md` — §1 scripture is COMPLETE and
  corpus-verbatim (all 11 sub-sections). §2 red-letter guidance complete.
  §§3-6 (lexicon / stories / quotes / videos) marked PENDING until the
  research agents land. **The draft may not assert anything from §§3-6 until
  they are filled.**

## Draft plan — write in THIS order, single author, one pass

Per trap #19, do NOT fan out drafting. Order: Day 3 (pivot) first, then 1, 2,
4, 5, then 6 (recap), then 7 (sabbath).

Voice reference to read before writing: `he-cannot-deny-himself-day-3.json`
teaching modules. The register is plain declaratives, named sources with dates
and locators, tension held rather than resolved, no hype. Sentences short.

## Imagery axes assigned (vary across the set — the set-level check is what fails)

| Plate         | Day | Archetype                             | Band      | Conceptual device                                                      |
| ------------- | --- | ------------------------------------- | --------- | ---------------------------------------------------------------------- |
| series master | —   | B vast field / tiny figure            | MID 45%   | one lily in the foreground out-glowing a distant crowned silhouette    |
| day1          | 1   | A scale break                         | AIRY 25%  | a wildflower rendered larger than a king's robe                        |
| day2          | 2   | E repetition + one break              | MID 50%   | rows of gathered baskets, one left open and empty on purpose           |
| day3          | 3   | H silhouette                          | DENSE 75% | a figure standing in place while the light source is absent from frame |
| day4          | 4   | F framed view (frame IS an opening)   | MID 45%   | a torn curtain whose tear is the doorway                               |
| day5          | 5   | G overhead plan                       | AIRY 30%  | a garrison ring posted around a sleeping figure                        |
| day6          | 6   | I detail crop                         | MID 40%   | five objects from the week in one printer's tray                       |
| day7          | 7   | C single object close on toned ground | AIRY 22%  | a single day's bread, nothing stored beside it                         |

No two series-page neighbours share archetype or band. Target sd > 15 on ink
coverage; report the distribution before sign-off.

---

## ✅ PHASES 2-5 COMPLETE (checkpoint)

**All 7 day JSONs written and passing.**

- `node scripts/validate-devotional.mjs public/devotionals/all-these-things-day-*.json`
  → **0 BLOCKING / 0 NEEDS-FIX, all 7 files ✓**
- `node scripts/check-readability.mjs all-these-things`
  → **FK 5.8 · ease 78 · 13.9 w/sent · 5.5% at 30w+ · 0 over 45w · PASS**
- **Red letter baked** via `npx tsx scripts/red-letter/apply-to-days.ts` — 9 modules
  red, 14 correctly left black. Matthew 27:45-46 carries 2 spans (Aramaic +
  translation). Matthew 27:50-51 (veil narration) correctly black.
  Founder asked explicitly: "ensure that isf jesus said it, that its red." Done.

**Research outcome, honestly recorded.** The first fan-out (4 agents + their own
sub-agents, ~19 concurrent) died wholesale on API 529 overload. Recovery:

- **Lexicon done in-house** by direct BibleHub fetches — all verified, written
  into source pack §3 with explicit honesty caveats (the "merimnaō = divide"
  claim was DOWNGRADED to an attributed HELPS reading; the tsur/sela contrast was
  CUT entirely because the page did not support it).
- **Stories agent (relaunched, sequential) SUCCEEDED** — 5 primary-source-verified
  stories, 4 folklore items killed with negative greps.
- **Quotes/Silence agent** was still running at checkpoint. The Endō _Silence_
  material is therefore NOT in the days. That is correct behaviour, not a gap:
  unverified material is cut, never shipped hedged. If it lands and is solid, it
  belongs on Day 3 as an additional insight module.

### The five verified stories placed

| Day | Story                                   | Primary source                                         | Caveat shipped                                                                    |
| --- | --------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | David Brainerd at Kaunaumeek            | Edwards ed., diary 1 Apr + 18 May 1743                 | declined calls are EDWARDS' narration, not Brainerd's diary — worded as such      |
| 2   | John Bunyan on his blind child          | _Grace Abounding_ ¶327-328                             | daughter NOT named, death NOT claimed (unverified); passage dated c.1672 not 1666 |
| 3   | Mother Teresa, 11 weeks before Oslo     | letters to van der Peet (Sept 1979), Périer (Mar 1953) | editorial brackets REPRODUCED; cited by recipient+date, never page                |
| 4   | George Fox's five failed intermediaries | _Journal_, ch. I                                       | flagged as retrospective, dictated 1670s, not a dated diary                       |
| 5   | Anne Bradstreet's house fire, 1666      | Andover MS via Ellis 1867                              | corroborated by son Simon's diary, 12 Jul 1666                                    |

### Folklore killed (documented, not used)

Luther's "Here I stand" (only the famous clause — the authenticated "conscience
is captive" sentence is used instead); the "People are often unreasonable"
Mother Teresa text (on the Missionaries of Charity's OWN false-attribution
register — actually Kent M. Keith); Francis of Assisi's "preach the gospel…use
words" (0 grep hits in the complete _Writings_); Brainerd/Jerusha Edwards
betrothal (0 hits for betroth/espous/courtship in Edwards' memoir).

## NEXT — resume here

- [ ] **P6** reading artifact (non-blocking)
- [ ] **P7** imagery via Codex CLI (`/Users/jamesparker/.local/node/bin/codex`)
- [ ] **P8** wiring — series.ts, series-rails.ts, HOMEPAGE_TODAY, test counts
- [ ] **P9** tracking — SA-123, F-168, CHANGELOG
- [ ] **P10** narration — **DRY RUN FIRST, report cost.** Founder's bar: audio
      must be FULL and must NOT CLIP AT THE END. Verify the tail by decoding.
- [ ] **P11** gates · **P12** preview · **P13** deploy live

---

## ✅ PHASES 8-9 COMPLETE · TEXT IS FROZEN

**Wiring done:**

- `src/data/series.ts` — SERIES_DATA entry added, appended to NEW_SERIES_ORDER,
  and `rekindled` moved INTO `FEATURED_SERIES` (it vacated the homepage main
  slot) with `hope` dropped to keep the count at six cards + one main = seven.
- `src/data/series-rails.ts` — `all-these-things` leads FEATURED_SERIES_SLUGS.
- `src/app/page.tsx` — `HOMEPAGE_TODAY` now points at this series. Teaser is
  13 words (founder's 10-14 rule). `featuredArt` points at the series master
  `/images/site/series/all-these-things.webp` so ONE plate serves both slots.
- `scripts/check-feature-prd-integrity.mjs` — EXPECTED_FEATURE_IDS 165 → 166.

**Tracking done:** SA-123 in `docs/production-decisions.yaml`, F-168 PRD +
registry + index row, CHANGELOG entry at top.
`verify:production-contracts` OK · `verify:tracking` OK · `check-feature-prd-integrity` OK.

### ⚠️ THE PROSE IS NOW FROZEN

Narration renders a fingerprint (`textHash`) of the text it speaks. The render
started at 07:00 on the current text. **Do not edit any day JSON** unless you
intend to re-render that day. If the quotes agent lands good Endō _Silence_
material, it is a POST-DEPLOY revision (SA-031 permits this; the chunk cache is
content-addressed so only the changed day costs anything).

### Narration in flight

Cost gate reported BEFORE spending, per the standing rule:
**7 days · 95,545 characters · 456,090 credits before → 360,545 after.**
Process is healthy, ~1 chunk/min. NOTE: `render_el_catalog.py` buffers stdout,
so an empty log is NOT a stall — check `.el-chunk-cache/` mtimes instead. And
macOS `find -newermt "-10 minutes"` does not work; use `ls -lt`.

### Imagery in flight

`codex exec` via `$HOME/.local/node/bin/codex`. TWO INVOCATION TRAPS FOUND:

1. `--dangerously-bypass-approvals-and-sandbox` is BLOCKED by Claude Code's
   auto-mode classifier. Plain `codex exec --cd "$PWD" "<prompt>"` works.
2. Passing the prompt on stdin with `-` printed "No prompt provided via stdin";
   pass it as a positional argument instead.
   Prompt assembled by `node scripts/imagery/build-prompts.mjs all-these-things`
   (7,590 chars) — never hand-written. Four founder-approved anchors attached.

---

## ✅ CONTENT FINAL (3rd render start — read this before touching anything)

Validator **0 BLOCKING / 0 NEEDS-FIX** · readability **FK 5.9, 5.9% at 30w+, 0 over 45w**.

### What landed after the first checkpoint

The relaunched **quotes agent SUCCEEDED** and its material is now IN the days:

- **Day 1** — Chrysostom, _Homily XXI on Matthew_ (c. 390): "He therefore that
  hath given the greater, how shall He not give the less?"
- **Day 2** — Chrysostom, _Homily XXII_: work vs worry, "He put an end not to the
  work, but to the care." Plus **Alexander Maclaren**, "Anxious Care" (1859),
  which is the REAL source on this theme — and which retires the fake aphorism.
- **Day 3** — **Calvin** on Habakkuk 2:2-3, and **Endō's _Silence_** (the
  founder's own reference), Johnston trans., Taplinger 1980, p. 171 + p. 96.

### The Silence finding — this is the best content in the series

Johnston's English is IMPERATIVE ("Trample! Trample!"). **Endō's Japanese is
PERMISSIVE** — "You may trample." Documented by Van Gessel, Mase-Hasegawa, and
Endō's widow Junko Endō, who was reportedly shocked the English used the
imperative. Both are given in the day, because the mood difference IS the
theology: an imperative makes God the author of the man's failure; a permission
makes Him the one who absorbs it.

### Apocrypha killed (now recorded in source pack §5b)

**"Worry is like a rocking chair"** is neither Corrie ten Boom's nor Erma
Bombeck's — traced to the _Milford Chronicle_, Delaware, **26 March 1948, p. 17**,
an unsigned filler bylined "Billy the Goat," via the Library of Congress
full-text API. Bombeck was 21 and unsyndicated until 1965; ten Boom did not
publish in English until 1954.

### Videos — GAP CLOSED, all 7 days

Web-search budget was exhausted (200/200) by the research agents, so IDs were
taken from the 29 already shipped in this repo and **re-verified live** (trap
#12 — never trust a remembered title). All 7 passed oEmbed AND the embed-block
check. Titles below are the exact current oEmbed titles:

| Day | ID            | Channel                                                           |
| --- | ------------- | ----------------------------------------------------------------- |
| 1   | `Zy2AQlK6C5k` | BibleProject                                                      |
| 2   | `3-YlqQfKkKk` | BibleProject                                                      |
| 3   | `HNJYvCKiny4` | Gospel in Life — **Keller on Habakkuk 2, the pivot's exact text** |
| 4   | `vqxXABgRhVo` | Gospel in Life                                                    |
| 5   | `HCLuq_5o7_o` | BibleProject                                                      |
| 6   | `3Dv4-n6OYGI` | BibleProject                                                      |
| 7   | `PFTLvkB3JLM` | BibleProject                                                      |

### ⚠ WHY THE RENDER RESTARTED THREE TIMES — do not repeat this

1. First render: text was final, but the quotes agent then landed.
2. Second render: killed to add the quote material.
3. Third render: killed to add VIDEOS — because **manifest chapters carry module
   INDICES**, and inserting a module shifts every index after it, silently
   invalidating chapter navigation. Video modules do NOT change `textHash`
   (`video` is in narration_extract's NAV_TYPES and its fields are skipped), but
   they DO shift indices.
   **LESSON: freeze the module ARRAY, not just the prose, before rendering.**
   The chunk cache is content-addressed, so the restarts cost only new chunks.

### Imagery — DONE (series master installed)

- Generated via `codex exec` with all four founder anchors attached, prompt
  assembled by `build-prompts.mjs` (never hand-written).
- Subject: **Exodus 17:12** — Moses seated on a stone, arms held up by Aaron and
  Hur at sunset. Chosen because _emunah_ is the week's central find and this is
  its plainest picture.
- Native output **1536×1024** (the built-in tool's expected 3:2 ceiling). **Not
  upscaled** — installed at **1536×837 webp q60, 259KB** to
  `public/images/site/series/all-these-things.webp`. Note `rekindled` is
  1600×872; reaching that width would have required a 1.04× upscale, which the
  spec forbids, and 1536 still exceeds the ~1267px display slot.
- Master archived to `design-sources/all-these-things/`.
- **SA-052 accuracy gate run BY EYE:** hands zoomed at 2× — gripping a forearm,
  four finger-bands plus thumb, no fused/boneless/six-finger tells; the seated
  man's own upper hands are the softest element and are noted to the founder. No
  Escher geometry. Period-accurate Levantine dress, skin in dense halftone. Suits
  the passage exactly. Square-crop check PASSED — all three figures, both
  supported arms and the sun survive.
- **REMAINING IMAGERY GAP:** no per-day inline-image plates were generated (spec
  suggests ~2/teaching day). Only the series master exists, and it serves both
  `heroImage` and the homepage `featuredArt`. This is a known, reported gap.
