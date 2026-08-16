# The 13-Phase Pipeline (reference build: prayer-of-jabez, 2026-07-12;

# narration added from he-cannot-deny-himself, 2026-08-15)

Every phase lists what to do, the exact artifacts, and what gates it. Phases 1–5 are content; 6 is the founder gate; 7–13 are production. Phase 10 is the only one that spends money, and it never spends without printing the cost first.

## Phase 1 — Read + Clarify + Lock the Shape

- Read in full: `content/AUTHORING-SPEC.md` (governs), `docs/AI-CONTENT-CONSTRAINTS.md`, `docs/PUBLIC-FACING-LANGUAGE.md`, `.claude/skills/euangelion-platform/references/content-structure.md`, `content/series-briefs/john-3.md` (v1.2 conventions), SA-029 in `docs/production-decisions.yaml`.
- AskUserQuestion (one call, up to 4 questions): format/depth, editorial stance on any cultural baggage around the passage, how central the founder's personal moment is (it usually becomes the emotional spine, anonymized), and definition of done.
- **Week shape (SA-029, Sunday start):** Day 1 = SABBATH (anchor text + small context paragraph + one reflection + silence invitation, ~400 counted words) → Days 2..N-1 = deep dives on the week chiasm A-B-C-B′-A′ → final day = RECAP (~1,500 words, no new teaching, MUST carry a Further-Your-Learning section: verified videos, free primary texts, a passage trail, a guided read).
- Validator word bands (±25%, counted modules only — teaching/scripture/vocab/bridge/story/insight/recap/sabbath): A 3500, B 3500, C 4000, B′ 3500, A′ 3000, recap 1500, sabbath 400.
- Create a feature branch; confirm which branch main-relative state you're building on (parallel sessions may be committing to the same tree).

## Phase 2 — Research Fan-Out (parallel background agents)

Launch four general-purpose agents simultaneously (full briefs in `verification-standards.md`):

1. **Stories** — one real, documented story per teaching day; primary sources only; explicit VERIFIED/DISPUTED verdicts; folklore hunted down and rejected.
2. **Quotes** — verbatim extraction from original texts (spurgeongems, ccel, Gutenberg, archive.org) with full citations; apocrypha flagged (e.g., the "prayer changes me" Lewis line is a Shadowlands film script).
3. **Videos** — official-channel YouTube only; verify by oEmbed fetch; each video brief names what it must TEACH, not its topic.
4. **Hebrew/Greek + context** — BibleHub interlinear + Strong's verification of every lexical claim; historical dating/audience with sources.

Meanwhile, pull ALL scripture yourself from `public/bibles/<TRANSLATION>/<BOOK>.json` — the corpus is the only allowed source for quoted verse text. YLT contains `<FI>...<Fi>` italics markers — strip or avoid.

## Phase 3 — Brief + Source Pack

- `content/series-briefs/<slug>.md` per AUTHORING-SPEC §7: day outline with anchors + translations + rationale table, soul-audit keywords, meta-story placement, external voices, done criteria. Record the founder rulings from Phase 1 in the brief header.
- `content/source-packs/<slug>.md` per §8: verified verse texts, lexicon (with drafting rules like the metathesis phrasing rule), verified quotes, verified stories WITH their caveats, verified videos with IDs, prosperity/controversy dossier if applicable. Mark sections PENDING until the agents land, then fill with their verified results. **The writer draws ONLY from this pack.**

## Phase 4 — Draft (pivot first)

- Order: C day first, then A, B, B′, A′, then recap, then sabbath.
- **Two-Minute Open first (SA-030 as amended by SA-034, forward-only):** every day (teaching days AND recap; sabbath is already its own short form) begins with a self-contained ~2-minute devotional — scripture (anchor, as is) → vocab (the day's word) → **teaching (a ~150-250 word write-up ABOUT that anchor scripture)** → reflection (one compact prompt) → prayer (short) → `cta` (`ctaLabel: "DEEP DIVE"`, `ctaHref: "#devotional-section-7"`, subtext inviting the full reading). It must stand alone: stopping at the CTA = a complete devotional. Declare `"format": "two-minute-open-v2"` at the day's top level; the validator BLOCKS if the first six modules aren't exactly this sequence or if the cta target is wrong. The write-up teaches the anchor text plainly — it is not a trailer for the deep dive. The deep dive below keeps its own full-length reflection set and prayer — the opening set is compact, not a substitute; don't duplicate the exact wording between the two. (The five-module `two-minute-open` shipped in `the-harvest` remains valid but is not used for new work.)
- The deep dive then follows. Each teaching day's deep-dive module stack (matches the shipped reference): scripture (anchor + hebrewOriginal + transliteration + emphasis + scriptureContext) → vocab (word/transliteration/pronunciation/strongsNumber/definition/usage/usageNote/wordByWord/relatedWords) → teaching A → pullquote → teaching B → video → bridge (ancientTruth/modernApplication/connectionPoint/newTestamentEcho) → teaching C → story (content + connectionToTheme) → insight (+historicalContext) → teaching B′ → secondary scripture → reflection (prompt + additionalQuestions) → interactive (interaction_type per the §5 rotation: breath/journal/physical/memory/art) → teaching A′ → prayer (prayerText + breathPrayer) → takeaway (commitment + leavingAtCross + receivingFromCross) → comprehension → profile → optional second video → resource (relatedScriptures + full Sources citations + forDeeperStudy).
- Top-level day fields: day, chiasm_position, title, subtitle, teaser, anchorVerse, theme, framework, scriptureReference, totalWords, panels: [], modules.
- Teaching modules carry `chiasm_position` + `pardes_layer` (internal only).
- **Reading level arc (lowered by SA-053, 2026-08-16): 8th → 10th → 11th → 10th → 8th.** The arc stays — the pivot day is still allowed to be the most demanding — but its ceiling comes down from "12th → college". Founder: _"it needs to be 8th grade level reading maybe slightly more elevated… I can follow, but other folks may find it a bit too dense."_ Series-wide weighted Flesch-Kincaid must land **≤ 8.5**.
- Use CANONICAL flat field names (`content` as string — the renderer preserves it since the 2026-07-12 fix; regression-guarded by `__tests__/module-renderer-flat-content.test.tsx`).
- Compute `totalWords` with the validator's counting rules; iterate until `node scripts/validate-devotional.mjs` reports 0 BLOCKING / 0 NEEDS-FIX.
- Self-check greps: banned phrases, "it's not X, it's Y" formula, rhetorical-question-then-answer, forbidden labels ("devotional" in reader-facing prose, etc.).

## Phase 5 — Editorial Review

- Spawn the `devotional-editor` agent with: AUTHORING-SPEC, brief, source pack, all day files. It returns severity-ranked notes with exact replacement text.
- Apply everything BLOCKING/NEEDS-FIX; where the editor flags something the research actually verified, add it to the source pack instead of stripping (that's what the pack is for).
- Send the editor a re-review message (SendMessage to the same agent keeps its context); require an explicit READY FOR FOUNDER verdict.
- **Readability gate (SA-053, 2026-08-16):** `node scripts/check-readability.mjs <slug>` — series-wide FK ≤ 8.5, under 8% of sentences at 30+ words, and **nothing over 45 words**. `--list` prints every offending sentence with its day and module.
  - **The average is not the problem; the tail is.** Measured across the four most recent series the average already sat at FK 7.7 / Reading Ease 71 — plain English — while each series carried 11–25 sentences of 45–95 words scoring grade 33–36. An average hides those. A reader does not.
  - **Never embed a quotation inside a longer sentence.** 36% of the over-30-word sentences were one structure: setup clause + archaic quote + continuation. Setup sentence. Quote its own sentence. Response sentence. This is the single largest source of density in the catalog.
  - **`story` and `insight` are the offenders** (20.9 and 24.3 words/sentence against `teaching` at 16.6). Bring `teaching`'s discipline to them.
  - **Fix by re-punctuating, never by deleting.** Splitting at clause boundaries that already exist moves FK 7.7 → 7.2 and 30w+ from 15% → 11% without cutting a word. Founder constraint: _"I want the breadth of content to stay the same."_
  - **No retroactive edits.** Founder ruling 2026-08-16: existing devotional text is not to be rewritten for this. Forward-only.

## Phase 6 — Founder Reading Gate (HARD)

- Render the full series as a private artifact styled in the founder's mockup design language (paper/cobalt tokens, Instrument Serif + Industry — font data URIs can be lifted from the founder's reference artifact). Show video cards in place; NO images yet.
- A generator script pattern lives in the reference build; regenerate + republish the same file path to keep one URL across revisions.
- STOP. No imagery until the founder has read and approved the text.

## Phase 7 — Imagery + Video Finalization

- See `imagery-and-video.md`. Generate with Higgsfield `gpt_image_2` at **`aspect_ratio: "3:2"`** (→ 2048×1360); process with the repo's `sharp` to webp; series plate installed as a **1600×872 band at q60** to `public/images/site/series/<slug>.webp`; day images at `public/images/series/<slug>/`.
- **Not 1024×1024.** That square was the previous standard and produced two separate defects: the browser upscaled it ~1.24× in the 1408:768 headline slot (`images.unoptimized` means no srcset), which read as grain; and deriving every site ratio from a square left only 16% of the frame crop-safe, forcing the centred compositions the founder rejected.
- Assign each plate an archetype + coverage band + conceptual device, and vary them across the set — see `imagery-and-video.md` §"The three axes that make a SET work".
- Insert `inline-image` modules contextually (src/alt/caption/width narrow|wide|bleed); the caption IS the contextual justification.
- Re-run the validator; republish the review artifact with images embedded so the founder sees them in context.

## Phase 8 — Wiring

- `src/data/series.ts`: SERIES_DATA entry (title/question/introduction/context/framework/pathway/keywords/days/heroImage) + append slug to the appropriate ORDER array. Homepage featured = `FEATURED_SERIES` (Bible-365 stays first); `/series` spotlight = `FEATURED_SERIES_SLUGS` in `src/data/series-rails.ts`.
- Expect `npm run build` to regenerate `src/data/devotional-teasers.ts` (verify zero entries lost, N gained).
- Bump the series count in `__tests__/series-data.test.ts`.

## Phase 9 — Tracking (docs-tracking-governance skill)

- Next SA id = last entry in `docs/production-decisions.yaml` + 1 (the yaml is canonical; CHANGELOG contains phantom SA-029/030 fix labels from May 2026 — ignore them).
- Next F-### = check `FEATURE-PRD-REGISTRY.yaml` AND recent CHANGELOG heads (parallel sessions race for numbers). New PRD from the template; add registry + index rows; bump the hard-coded count in `scripts/check-feature-prd-integrity.mjs`.
- CHANGELOG entry at top. Commit-msg hook requires citing an SA-### and an F-### whose .md is staged.

## Phase 10 — Narration + Score (SA-043)

Full detail in `references/narration.md`. Runs HERE and nowhere else: the audio
stores a fingerprint of the text it speaks, so rendering before the prose is
final invalidates the track and every chapter mark in it, and the manifest is a
build input, so it must exist before `npm run build`.

- **Cost gate first, always.** `render_el_catalog.py <slugs> --dry-run` prints the
  exact character count and refuses to start if the budget will not cover the
  whole job. Report the number to the founder before spending it.
- Render, then `produce.py` for the score. The score pass rebuilds the narration
  from the chunk cache — no credits, no API, and repeatable as many times as the
  mix takes to get right.
- Founder's voice for NEW series only; the back catalog stays on `am_michael`.
  A new devotional averages 9,487 characters against 691k credits a month.
- **The narration is never processed** — founder ruling: the voice is right as
  rendered, everything goes underneath it.
- Verify per day: duration drift < 0.5 s (chapter marks are absolute times —
  drift moves every one after it), `textHash` matching the page, chapters
  starting at 0 and inside runtime, file under the **hard 25 MiB Workers asset
  limit** (no plan raises it; ~23 MB is a 25-minute day at 128 kbps stereo).
- Bump `CACHE_NAME` in `public/sw.js` AND `SW_VERSION` in
  `src/components/ServiceWorkerRegistration.tsx` **together**, or returning
  listeners keep the old audio cached forever. They have shipped out of sync.

## Phase 11 — Gates

`npm run type-check` → `verify:production-contracts` → `verify:tracking` → `verify:feature-prds` → `npm run lint` (0 errors; pre-existing warnings in untouched files are acceptable) → `npm test` (full suite) → `npm run build`.

## Phase 12 — Preview Verification (Workers runtime)

- `npm run preview` (background; wait for "Ready on http://localhost:8787").
- Curl: `/series/<slug>`, several day routes, the day JSONs (assert videos/images/Hebrew present in payload), image URLs (content-type image/webp), homepage + `/series` featured presence.
- **Rendered-DOM assertion required** for any new module shape: a vitest RTL test rendering ModuleRenderer with the real day data shape (curl proves delivery, not rendering — the 2026-07-12 blank-boxes regression is the precedent).

## Phase 13 — Ship

- Identity gate: `gh auth switch --user creativcreature` → `gh auth status` → `git config user.email` (chrisparker21@gmail.com) → `npx wrangler whoami`.
- Stage by explicit file list; commit (hooks re-run the gate); present evidence; founder chooses the merge/deploy path; `npm run deploy` is the reliable path (auto-deploy on push is not).
- Post-deploy: pages cache at the edge (`s-maxage=3600, stale-while-revalidate`) — warm every affected URL (hit once to trigger background revalidation, wait ~10s, verify a fixed marker in headers/body). In zsh, iterate URL lists with an array (`for u in "${urls[@]}"`), not an unquoted string.
- Live-verify the same matrix as Phase 12 against `https://euangelion.app`.
