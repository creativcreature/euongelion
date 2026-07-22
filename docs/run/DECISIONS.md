# DECISIONS — judgment calls made during the run

Format: id · date · decision · options considered · reasoning · real-world anchor (where applicable).

## D-001 (2026-07-10) — Commit prior session's uncommitted Bible-365 rewrite as run baseline

- **Options:** (a) commit as-is after validation; (b) stash; (c) leave dirty.
- **Choice:** (a). Validated first: 365/365 JSON-parse, 365 modules-format, 0 stubs. A 358-file dirty tree is a hazard across a multi-day autonomous run (accidental loss, ambiguous diffs). Committed as `27c88829` citing SA-020/F-051 to match the pilot commit convention (a39c5cae).
- **Anchor:** n/a (process decision).

## D-002 (2026-07-10) — Branch/deploy strategy: stay on `elevation/soul-audit-rebuild`, fast-forward `main` at deploy points

- **Options:** (a) merge to main per sprint + deploy from main; (b) deploy from branch, merge at Task 9; (c) work directly on main.
- **Choice:** (a), via fast-forward (main is a strict ancestor, so no merge commits and no hook complications). Keeps the repo rule "main = production" true, and production deploys have historically come from this branch lineage anyway (last deploy 2026-06-21 predates only the July commits).
- **Anchor:** n/a (process decision).

## D-003 (2026-07-10) — GitHub push deferred to founder; deploys proceed via wrangler

- **Options:** (a) block the run on push credentials; (b) proceed local-only + deploy via verified wrangler token; log push as HUMAN_REQUIRED.
- **Choice:** (b). The DEPLOY-BEFORE-GATE rule is about the live site; wrangler deploys from the working tree and its token is verified. No gh binary or GitHub credential exists on this machine — exhausted: gh in PATH/homebrew/mdfind, ~/.config/gh/hosts.yml, git credential store, osxkeychain.
- **Anchor:** n/a (process decision).

## D-004 (2026-07-10) — PRDs F-063..F-074 indexed but not added to FEATURE-PRD-REGISTRY.yaml

- **Options:** (a) add to registry + bump the hardcoded `54` count in check-feature-prd-integrity.mjs; (b) PRD file + INDEX row only, matching the existing F-056..F-062 precedent.
- **Choice:** (b). The integrity script hardcodes the registry count; editing a verify script to admit new entries is riskier than following the established pattern for the last seven PRDs. Flag for founder at Task 9 if registry should be reconciled.
- **Anchor:** repo precedent (F-056..F-062).

## D-005 (2026-07-10) — CTA verb unified to GET MATCHED (not Continue)

- **Options:** (a) "Continue" both; (b) "GET MATCHED" both; (c) a new verb.
- **Choice:** (b). "Matched" is the product's honest vocabulary sitewide ("three matched recommendations" on /about, "three matched paths" in Soul Audit subcopy); what was false was "from our library," which is now corrected. Homepage widget already used GET MATCHED; the standalone page's bare "Continue" was the outlier.
- **Anchor:** Calm Sleep quiz CTA consistency (one verb per action across entry points).

## D-006 (2026-07-10) — Orphan disposition split

- **Choice:** Delete 5 with zero product intent attached (WalkthroughModal, SeriesSearchPanel, MixedHeadline, NetworkStatusBanner, SeriesHero — all 0-import, grep-verified). Retain GuestSignupGate (audit Part 3 schedules it for onboarding wiring, Sprint C) and DevotionalMilestoneReveal (SA-025 explicitly says revive-or-delete at the completion beat, Sprint D). Deleting-then-rebuilding would be waste; git history preserves the deleted five if ever needed.
- **Anchor:** audit Part 3 #2 and Part 5A.

## D-007 (2026-07-10) — Animated imagery test = CSS grain shimmer, not generated video

- **Options:** (a) generate an animated asset (video/GIF — requires Higgsfield, paid); (b) CSS grain-drift overlay on a static riso print.
- **Choice:** (b). Quieter and more reverent (brand: "quiet and reverent" was the run's own spec), zero credits, reduced-motion safe, trivially reversible. Shown on /design/imagery-samples.
- **Anchor:** print-era texture treatments (risograph paper grain), Calm's restraint in motion.

## D-008 (2026-07-10) — Sample wiring respects the no-arbitrary-use rule

- Only samples with a justified live slot were wired (inkwell→step-1 subject-mismatch fix; ribbon→bookmarks empty; scissors→clippings empty). The Genesis header and oil lamp have no justified slot today (bible-365 hero already assigned) — they render on the noindex review page only, never as decoration. First Genesis attempt DISCARDED for violating the sparing-crimson rule; regenerated compliant.
- **Anchor:** project CLAUDE.md image rules 1–3.

## D-009 (2026-07-10, FOUNDER) — Imagery direction pinned at the review gate

- Founder reviewed /design/imagery-samples: object plates "look fine" → approved for EMPTY STATES ONLY.
- New requirement: narrative imagery must be MORE DYNAMIC and match the empty-tomb homepage hero's register (radiant light source, beam-burst, crimson halation, deep cobalt masses, luminous sky) — not static centered objects.
- Samples must be presented IN DEVOTIONAL CONTEXT (full reading arc) before any full generation run.
- Site-wide usage remains founder-unsatisfied — placement/context redesign required before Phase 2 executes (see IMAGERY_PLAN addendum: the 3-beat arc proposal).
- Phase 2 generation run remains GATED until the founder approves the devotional-context samples + the usage system.

## D-010 (2026-07-10, FOUNDER) — Imagery art-direction refinements (2nd review)

On the Bethany devotional-arc samples (Threshold/Turn/Benediction):

- Figures must be HISTORICALLY + REGIONALLY ACCURATE (1st-c. Judea/Levant; no generic-European defaults). Hard requirement.
- Images too abstract → want concrete, grounded scenes.
- Add a SMALL yellow highlight on each image's focal light (palette: cobalt-majority + cream + crimson halation + yellow accent).
- Kill the "clip-art" flatness — want hand-made printmaking character, real physical weight, dynamic linework, artistry. Current forms lack character.
- Founder has reference examples (study shape/composition/dynamism/artistry, IGNORE color) — NOT yet transmitted at time of this note. BLOCK next generation pass until references are obtained + studied. Do not regenerate blind.

## D-011 (2026-07-10, FOUNDER) — Imagery style DIRECTION LANDED (v3)

Iterated against the founder's reference set. Two registers now proven and locked as the narrative-image style:

- SURREAL SYMBOL (e.g. v3-symbol-hands: cupped hands, one still light, "many things" blowing off as chaff).
- SURREAL CHARGED SCENE (e.g. v3-surreal-scene: Mary still in a column of light while the domestic "many things" orbit her as a dissolving whirlwind; African-American Jesus at the light's edge).
  Both: heavy risograph grain, chiaroscuro silhouettes with particle-dissolve edges, real dimensional anatomy/weight, ONE luminous focal light, cobalt-majority + cream + crimson halation + a SMALL warm-yellow focal core, historically/regionally accurate (African/African-American) figures.
  Clarifications this round: (a) scenes + people doing things + events ARE allowed IF they carry surrealist intentionality (dreamlike, charged, symbolic) — the ban is on LITERAL flat illustration, not on scenes; (b) images are ART not decoration.
  Samples in scratchpad/imagery-samples: v3-symbol-hands.png, v3-surreal-scene.png (winners); v2-turn.png (texture right, too literal — the "before").
  STILL GATED: founder green-light on the direction + the proposed site-wide placement system before any full generation run.

## D-012 (2026-07-10, FOUNDER — HARD TECHNIQUE LOCK) — Imagery MUST be flat risograph screenprint, NOT soft render

Founder rejected v3 (soft/cinematic/photographic renders): "images look NOTHING like the reference and you lost the original risograph/lithograph."
ROOT MISTAKE: kept the surreal subjects but abandoned the PRINT TECHNIQUE — over-rendered into soft atmospheric gradients + photographic depth. WRONG.
LOCKED TECHNIQUE (non-negotiable, applies to EVERY narrative image): a two-ink RISOGRAPH / LITHOGRAPH SCREENPRINT — FLAT graphic color fields, heavy visible Ben-Day HALFTONE DOT screen, very high contrast, bold poster-like graphic silhouettes, hand-pulled screenprint texture + slight ink misregistration + paper grain. It is a FLAT PRINTED POSTER. The site's own empty-tomb hero (public/images/site/homepage/hero/header-v2.webp) IS the technique anchor and MUST be passed as a reference on every generation. The founder's reference set is the SAME print family (flat screenprint halftone) — NOT soft renders.
ANTI-LIST (never produce): photograph, cinematic 3D render, soft atmospheric gradients, painterly/continuous-tone shading, depth-of-field blur, glossy smoothness.
v4-litho-scene.png = first correct-technique sample (flat riso screenprint of the Too Busy for God whirlwind). Still to refine: the small warm-yellow focal core didn't land; push the reference's gritty stipple / particle-dissolve further.

## D-013 (2026-07-11, FOUNDER — TOOLING LOCK) — Imagery = Higgsfield GPT Image 2 + founder's reference images

Founder explicitly required Higgsfield (I had wrongly defaulted to Nano Banana/Gemini per global CLAUDE.md; this is the documented "free tool can't do the job" exception — Gemini structurally cannot match the founder's Midjourney-sref aesthetic).
WORKING PIPELINE (locked): Higgsfield model `gpt_image_2`, with the founder's own wokegodx reference PNGs uploaded (media_upload -> PUT -> media_confirm) and passed as `medias` role=image, 2k/high. First success = hf1.png: flat cobalt riso screenprint, halftone grain, ONE bold African silhouette in vast negative space, single cream light shaft, ONE small warm-yellow core, crimson halation — dead simple + iconic like the refs, in the site palette. Confirmed media_ids this session: rays 92289530-eccd-4a08-b465-b539f209c82e, face ae9af919-4a13-479e-a2e8-f9e3e3807287, hand 950ce856-7b64-49b9-951a-0dbfb2477659.
PROMPT RECIPE: "bold two-ink RISOGRAPH SCREENPRINT gospel poster, flat high-contrast fields, heavy halftone dots, DEAD SIMPLE + ICONIC one subject in vast negative space, NOT cluttered/photo/soft-render"; cobalt-ultramarine flat field + cream light + ONE small warm-yellow focal core + thin crimson halation; African/African-American figures. Balance was 979 credits (Plus plan).

## D-014 (2026-07-11, FOUNDER) — Devotional imagery ARC template APPROVED (Too Busy for God Day 1)

Full 3-image arc approved as the per-devotional template, all Higgsfield gpt_image_2 + founder reference images, one coherent flat-riso-screenprint style (cobalt field + cream light + ONE small warm-yellow focal core + crimson halation, halftone, African silhouettes):

- HEADER 3.647:1 / 2400x658 (the site tomb-hero banner ratio — founder-corrected 2026-07-11; 21:9 was still too tall). gpt_image_2 maxes at 16:9, so COMPOSE as an ultra-wide frieze (figures SMALL and LOW, vast croppable cobalt sky above) at 16:9, then crop to 3.647:1 keeping the lower figure band. The devotional's TENSION as a wide scene, multiple figures OK. Here: Martha rushing far-left vs. Mary+Jesus small in the light right. NO text overlay.
- INLINE 1:1 (at the passage pivot): tighter iconic symbol. Here: Mary receiving the light, one open hand.
- CLOSE 3:2 (with the completion beat): the benediction object/symbol. Here: a single period-correct Levantine clay oil lamp burning.
  Scenes with multiple people/events are allowed when they carry the meaning (founder: "can contain more than one person"), as long as CLEAN + READABLE (not the earlier cluttered whirlwind). Placement always shown in the reading mockup before scaling. Files: hf-header-219.webp, w-inline.webp, w-close.webp. Approved mockup artifact d31ebd6b-06ba-45cb-950a-15f11fdbe3d0.
  NEXT (gated on founder go): integrate these 3 into the real reader for this devotional; then scale the arc across the library per-devotional. Still a founder decision whether to wire into the site now vs. keep iterating concepts.

## D-015 (2026-07-11, FOUNDER) — Image density must match its display size

Founder principle: "No image should fill the entire screen/full-bleed unless it is ELABORATE like an old-world painting — otherwise it's too much visual space taken up by emptiness."
RULE:

- FULL-BLEED / large surfaces (the header banner, any full-width slot) require an ELABORATE, DENSE, detailed composition that fills the frame edge-to-edge with intentional, readable detail (old-world-painting / detailed-engraving density — the way the empty-tomb hero is a richly textured landscape, NOT two small figures in a void). Dense but COMPOSED + READABLE (not the earlier "cluttered/unreadable" whirlwind — clear focal hierarchy via the light).
- SPARSE / minimal iconic images (single figure/object + lots of negative space) must be CONTAINED / smaller in the layout, never full-bleed, or the emptiness dominates.
  Applies to the header (make it elaborate) and to sizing the inline/close (keep sparse ones contained). Supersedes the earlier "dead simple iconic for everything" where it conflicts with full-bleed sizing.

## D-016 (2026-07-11, FOUNDER — CORRECTS D-011/D-012/D-015) — Characters = accurate 1st-c. Judeans; style = flat bold screenprint (NOT etching)

TWO corrections:

1. CHARACTERS: historically + regionally accurate FIRST-CENTURY JUDEANS of the Levant — Middle Eastern / Semitic features, olive-to-brown skin, period-accurate simple robes + head coverings. NOT African, NOT African-American (supersedes the earlier "African/African-American" note, which came from over-reading the founder's crowned-Passion reference faces), NOT European, NOT fantastical. NO crown of thorns / halos / anachronisms in ordinary-scene devotionals (e.g. Luke 10 household). Do NOT pass the founder's crown-of-thorns face references as CHARACTER refs (they push African features + crowns); use them for TECHNIQUE only, or better, use the empty-tomb hero (header-v2, no figures) as the style anchor.
2. STYLE: the APPROVED style is the FLAT, BOLD, GRAPHIC SCREENPRINT (the approved Martha-Mary scene hf2 — bold silhouettes, flat cobalt fields, dramatic light, halftone). The elaborate fine-ETCHING/engraving header (hf-elab) was a STYLE DEVIATION and is REJECTED. Do NOT switch to detailed Victorian etching. Achieve "fills the frame / not empty" (D-015) via LARGE BOLD figures + strong graphic composition, NOT via fine engraved detail.
   Net: flat bold screenprint + large accurate-Judean figures filling the banner + no anachronisms.

## D-017 (2026-07-11, FOUNDER — HARD RULE) — Every image obviously depicts its adjacent text

Founder: "The objects/images/people need to relate directly to the text it's near, and be a somewhat obvious depiction. Right now I'm having to internally interpret why you use an image in a place — when it should be exceptionally obvious. You are creating confusion where I am asking for clarity."
RULE (non-negotiable): every image is placed BY specific adjacent text and is an OBVIOUS, direct depiction of THAT text. Zero interpretation required. NO arbitrary/thematic/decorative images (the lamp for "it is enough" and "Mary receiving light" for "only one thing is necessary" were BOTH arbitrary — rejected). Before generating any devotional's images, write the explicit text→image map (which line, what it literally shows) and confirm with founder. Style stays: flat bold screenprint, DARK ghosted characters, cobalt/cream + one yellow core (the approved hf2 look, NOT cream-figure inversion, NOT fine etching). Also: header text CENTERED; reading layout centered; header needs DESKTOP (wide 3.647) + MOBILE (portrait ~4:5) crops.
