# Devotional Authoring Spec

**Version:** 1.0
**Status:** ACTIVE — supersedes scattered guidance for new 7-day prefab devotionals
**Purpose:** Single source of truth that the `devotional-writer` and `devotional-editor` agents load before drafting or reviewing any new devotional.

This document consolidates rules from:

- [.claude/skills/euangelion-platform/references/content-structure.md](.claude/skills/euangelion-platform/references/content-structure.md) — schema
- [content/DEVOTIONAL-STRATEGY.md](content/DEVOTIONAL-STRATEGY.md) — chiasm, PaRDeS, word counts, meta-story
- [docs/AI-CONTENT-CONSTRAINTS.md](docs/AI-CONTENT-CONSTRAINTS.md) — voice, theology, forbidden phrases
- [docs/PUBLIC-FACING-LANGUAGE.md](docs/PUBLIC-FACING-LANGUAGE.md) — forbidden labels, tone
- [docs/AUDIENCE.md](docs/AUDIENCE.md) — pathway profiles
- [.claude/agents/DEVOTIONAL-WRITER.md](.claude/agents/DEVOTIONAL-WRITER.md), [.claude/agents/DEVOTIONAL-EDITOR.md](.claude/agents/DEVOTIONAL-EDITOR.md)

Where those documents conflict, **this spec governs**.

---

## 1. The 7-Day Series Shape

```
Day 1 (A):       HOOK       ~3,500 words
Day 2 (B):       BUILD      ~3,500 words
Day 3 (C):       PIVOT      ~4,000 words   ← write this FIRST
Day 4 (B-prime): APPLY      ~3,500 words
Day 5 (A-prime): RESOLVE    ~3,000 words
Day 6:           RECAP      ~1,500 words   (no new teaching)
Day 7:           SABBATH    ~400 words     (silence, presence — most of the day IS the silence)
```

**Why long-form (not 600-900 words per [docs/AI-CONTENT-CONSTRAINTS.md](docs/AI-CONTENT-CONSTRAINTS.md) §6.1):** the strategy doc commits to deep-dive narrative essays; the constraints doc reflects an earlier shorter format. Long-form wins for the prefab catalog. The Soul Audit's runtime-generated devotionals may use shorter targets if Cloudflare Workers' CPU budget forces it (resolved in Phase 3).

### The Two-Minute Open (SA-030 — founder ruling 2026-07-22, FORWARD-ONLY; amended by SA-034)

Every NEW prefab day (not retroactive to existing series) opens with a **self-contained ~2-minute devotional** before the deep dive.

**Current shape — `two-minute-open-v2` (SA-034, founder ruling 2026-08-10). Use this for all new work:**

```
[scripture]   — the day's anchor, as is
[vocab]       — the day's one word
[teaching]    — a short write-up ABOUT that scripture (~150-250 words)
[reflection]  — one prompt (compact)
[prayer]      — short closing prayer
[cta]         — DEEP DIVE → jumps to the full devotional below on the same page
```

`ctaHref: "#devotional-section-7"` — the section id is 1-indexed over the module array, so a six-module open targets the seventh.

The added write-up is the whole point of the amendment: the open previously jumped from a word study straight to a question, which asked a reader to reflect on a passage nobody had yet explained. The write-up does the explaining — plainly, in the day's own voice, teaching the anchor text itself rather than previewing the deep dive.

**Legacy shape — `two-minute-open` (five modules, no write-up, `ctaHref: "#devotional-section-6"`).** Shipped in `the-harvest`; still valid, not to be used for new days.

Rules (both shapes): the block must be complete on its own — a reader who stops at the CTA has had a whole devotional. After the CTA the deep dive proceeds per the structure below. The deep dive's own reflection/prayer stay full-length — the opening set is compact, not a replacement, and must not duplicate the deep dive's wording. Declare the `format` string at the day's top level; the validator then enforces the opening sequence **and** the cta target.

**Each day uses the modules JSON shape**, not a single essay blob. The essay structure is realized by interleaving these modules:

```
[scripture]                    — anchor verse, ≤2 verses, public-domain translation
[teaching]   chiasm_position A — opening contemplation (~400 words, 8th grade)
[scripture]                    — secondary verse if needed
[vocab]                        — Hebrew/Greek deep-dive (Day 1, 2, 3 typical)
[teaching]   chiasm_position B — exposition (~600 words, 12th grade)
[bridge]                       — ancient ↔ modern connection
[teaching]   chiasm_position C — pivot/insight (~800 words, college level)
[story]                        — modern narrative illustration
[teaching]   chiasm_position B-prime — application (~700 words, 12th grade)
[reflection]                   — single primary question + 2-3 follow-ups
[interactive]                  — daily rotating element (see §5)
[teaching]   chiasm_position A-prime — closing contemplation (~500 words, 8th grade)
[prayer]                       — closing prayer
[takeaway]                     — one-line commitment + leaving-at-cross / receiving-from-cross
[resource]                     — 1-2 external pointers
```

Day-level word target = sum of all teaching modules + scripture + vocab + bridge + story. Modules can be added or omitted per day; the chiastic A-B-C-B'-A' teaching modules are required on Days 1-5.

### `chiasm_position` field — required on every day-level JSON

```json
{
  "day": 3,
  "chiasm_position": "C",   // "A" | "B" | "C" | "B-prime" | "A-prime" | "recap" | "sabbath"
  "title": "...",
  "modules": [...]
}
```

The same field also appears on each `teaching` module (so the renderer can vary typography per chiastic position):

```json
{ "type": "teaching", "data": { "chiasm_position": "C", "content": "..." } }
```

---

## 2. Voice & Tone

### Approved tone (from [docs/PUBLIC-FACING-LANGUAGE.md](docs/PUBLIC-FACING-LANGUAGE.md))

- **Warm but not saccharine** — "You're welcome here, mess and all."
- **Honest but not harsh** — "This might challenge what you've assumed."
- **Inviting but not desperate** — "Start when you're ready."
- **Intelligent but not academic** — "The Hebrew word here is _hevel_ — it means vapor, breath, something you can't hold."
- **Confident but not arrogant** — "We've thought carefully about this content."

### Forbidden phrases (banned outright)

```
"in today's world"            "let's unpack"
"in today's fast-paced world" "it's important to note"
"in our modern context"       "this begs the question"
"at the end of the day"       "embark on a journey"
"in essence"                  "take a moment to consider"
"it's not X, it's Y"          (rhetorical question → immediate answer pattern)
```

### Forbidden user-facing labels (for in-text references to the experience)

The reader inside a devotional should not see:

```
"devotional"          (use "reading" or "this series")
"spiritual journey"   (use specific language about what's happening)
"faith course"        (use "series" or "the walk")
"Bible study"         (use "we sit with this passage" / "we read together")
"on this incredible journey"
"God wants you to"    (use "Scripture says" or "we see in this passage")
"unlock your purpose"
"join thousands of believers"
"you'll be transformed"
```

**Pathway labels (Sleep/Awake/Shepherd) NEVER appear in any devotional.** They are internal only.

### Reading-level scaling (matches the chiasm)

| Module position            | Target reading level | Flesch-Kincaid |
| -------------------------- | -------------------- | -------------- |
| `teaching` A               | 8th grade            | ~8.0           |
| `teaching` B               | 12th grade           | ~11.5          |
| `teaching` C               | college              | ~14.0          |
| `teaching` B-prime         | 12th grade           | ~11.5          |
| `teaching` A-prime         | 8th grade            | ~8.0           |
| `vocab`, `bridge`, `story` | 10th-12th grade      | ~10–12         |
| `reflection`, `prayer`     | 8th grade            | ~8.0           |
| `recap` (Day 6)            | 8th grade            | ~8.0           |
| `sabbath` (Day 7)          | 6th-8th grade        | ~7.0           |

### Voice perspective (varies by module)

| Module                | Voice                                                   |
| --------------------- | ------------------------------------------------------- |
| `teaching` (B, C, B') | "We" or third person                                    |
| `teaching` (A, A')    | "We" or "you"                                           |
| `bridge`, `story`     | Third person → "you"                                    |
| `reflection`          | "you"                                                   |
| `prayer`              | Direct address — "Father..." or "Jesus..."              |
| `takeaway`            | "I will..." (first person commitment from reader's POV) |

Avoid jarring switches inside a single module.

---

## 3. Theological Frame

### Baseline orthodoxy — Nicene Creed

All content must align with Trinitarian theology, full divinity and humanity of Christ, physical resurrection, authority of Scripture, the Church universal. Beyond the Creed, traditions are represented fairly without forcing consensus.

### When traditions disagree on non-Creedal matters

State the range of views. Steel-man each position. Note majority/minority. Don't force resolution. Be honest when taking a position.

> "Christians have long debated the relationship between divine sovereignty and human freedom. Reformed traditions emphasize God's sovereign election; Arminian traditions stress human response to grace. Both affirm that salvation comes through Christ alone — they differ on _how_ that salvation reaches us."

### PaRDeS interpretation (woven throughout, never labeled in user-facing text)

| Level | Hebrew | Meaning | Use when…                                      |
| ----- | ------ | ------- | ---------------------------------------------- |
| **P** | Peshat | Plain   | Day 1-2 establishing "what does the text say?" |
| **R** | Remez  | Hint    | Day 2-3 surfacing typology / foreshadowing     |
| **D** | Derash | Search  | Day 3-4 doctrinal/theological teaching         |
| **S** | Sod    | Secret  | Day 5 deeper mystery, often Christological     |

Internal-only metadata: `pardes_layer` field on `teaching` modules ("peshat" | "remez" | "derash" | "sod"). Never rendered to the reader.

### Meta-story integration (required on Day 1, recap-able on Day 6)

Every series locates itself in God's big story:

> "Today we're in [CREATION / FALL / PROMISE / EXODUS / WILDERNESS / KINGDOM / EXILE / INCARNATION / MINISTRY / PASSION / RESURRECTION / CHURCH / CONSUMMATION]"

Day 1 must include a meta-story placement line. Days 2-5 reference it implicitly. Day 6 (recap) returns to it.

---

## 4. Sources & Citations

### Source hierarchy (use top-down)

1. **Scripture** — primary, foundational
2. **Church Fathers (100–500 AD)** — Augustine, Athanasius, Chrysostom, Gregory of Nazianzus, Irenaeus
3. **Reformation (1500–1700)** — Luther, Calvin, Owen, Edwards
4. **Modern classics (1900–2000)** — Lewis, Bonhoeffer, Tozer, Chesterton, Tolkien
5. **Contemporary (vetted)** — N.T. Wright, Tim Keller, Fleming Rutledge, Esau McCaulley
6. **Non-Christian** — only when illuminating a biblical concept; framed clearly as non-Christian

### External quote rules

- **Target: 1-2 external quotes per teaching day** (Days 1-5). Day 6 recap: 0. Day 7 sabbath: 0.
- Every quote must be **verified word-for-word** against the original source.
- Every quote must include **author, work, year, and location** (book/chapter/page).
- Every quote must include **one sentence of context** explaining why this voice is relevant here.

**Good:**

> Augustine, writing in the aftermath of Rome's fall, understood something about finding God in chaos: "You have made us for yourself, O Lord, and our hearts are restless until they rest in you." His words, penned in 397 AD amid political collapse, remind us that stability was never promised — only presence.
>
> — Augustine, _Confessions_, Book 1, Chapter 1 (397 AD)

**Bad:**

> As Augustine said, "Our hearts are restless until they rest in you."

(no context, incomplete citation)

### Endnote format (collected at end of each day)

```
---
**Sources**
1. Augustine of Hippo. *Confessions*. Trans. Henry Chadwick. Oxford University Press, 1991. Book 1, Chapter 1.
2. Bonhoeffer, Dietrich. *Letters and Papers from Prison*. Ed. Eberhard Bethge. SCM Press, 1971. p. 382.
```

Stored as a `resource` module with type `endnotes` (or as a final `teaching` module — pilot establishes which renders better).

### Handling uncertainty

| Certainty              | Language                                     |
| ---------------------- | -------------------------------------------- |
| Verified fact          | State directly                               |
| Scholarly consensus    | "Most scholars agree…"                       |
| Debated                | "Scholars debate…" / "Christians differ on…" |
| Speculation            | "It's possible that…" / "Some suggest…"      |
| Unknown                | "We don't know…"                             |
| Popular but unverified | "A common tradition holds…" (flag it)        |

Never state speculation as fact. Never present popular tradition as biblical fact.

---

## 5. Daily Interactive-Element Rotation

To prevent monotony, each day uses one rotating interactive element (the `interactive` module):

| Day | Element                              |
| --- | ------------------------------------ |
| 1   | Breath prayer                        |
| 2   | Journaling prompt                    |
| 3   | Physical practice (posture, gesture) |
| 4   | Scripture memory with technique      |
| 5   | Art response (find/create image)     |
| 6   | (none — recap)                       |
| 7   | Silence (the entire day IS this)     |

The `interactive` module's `interaction_type` field carries the rotation: `breath`, `journal`, `physical`, `memory`, `art`, `silence`.

---

## 6. Translation Policy

This section **supersedes** [docs/AI-CONTENT-CONSTRAINTS.md](docs/AI-CONTENT-CONSTRAINTS.md) §5.4 (which sets NIV as default).

### Allowed translations for new prefab content

| Translation     | Status | Use for                                               |
| --------------- | ------ | ----------------------------------------------------- |
| **BSB**         | CC0    | Default modern English; clarity, readability          |
| **WEB / WEBBE** | PD     | Modern English alternative; accessible voice          |
| **KJV**         | PD     | Poetic register, traditional weight, literary cadence |
| **ASV**         | PD     | Word-for-word literal, useful next to vocab modules   |
| **YLT**         | PD     | Hyper-literal — surfaces verb tenses                  |
| **DARBY**       | PD     | Precise translation choices, especially in Paul       |
| **BBE**         | PD     | Lowest-literacy entry point; accessibility            |

Blocked: NIV, ESV, NASB, NRSV, CSB, NLT, MSG (until Phase 4 paid-translation strategy resolved).

### Per-passage selection

Each `scripture` module declares `translation`. The choice is intentional — pick the rendering that best serves the passage in its context:

- Lyrical Hebrew poetry → **KJV** (preserves cadence)
- Pauline argument → **BSB** or **DARBY** (surfaces precision)
- Vocab module pairing → **ASV** or **YLT** (literal mirrors original)
- Accessibility / ESL reader → **BBE**
- Default modern reading → **BSB**

### Disclosure

The reader sees only `Reference — TRANSLATION` (e.g., `John 15:4 — BSB`). No inline rationale.

The **rationale lives in the series brief** at `content/series-briefs/<slug>.md`, where each scripture passage's translation choice is documented one sentence each (for editor review).

The **public** explanation lives at `/about/translations`, linked from the global footer.

---

## 7. Brief Format (`content/series-briefs/<slug>.md`)

Required before any drafting begins. The writer agent loads this file alongside the source pack.

```markdown
# Series Brief: <Title>

**Slug:** <kebab-case-slug>
**Track:** Branches | Disciplines | Doctrine | Apologetics | Through-the-Bible | Story-of-God
**Pathway target:** sleep | awake | shepherd
**Anchor passage:** <Book Chapter:Verse-Verse>
**Anchor translation:** BSB | WEB | KJV | ...
**Meta-story placement:** <CREATION | FALL | PROMISE | ...>

## One-line theme

<single sentence — what is this series about?>

## Soul Audit keywords

<comma-separated keywords the audit will match against — 8-15 keywords>

## 7-day chiastic outline

### Day 1 (A) — Hook: <day title>

- Anchor: <reference + translation>
- Theme: <1-2 sentence summary>
- Meta-story line: <where in God's story>

### Day 2 (B) — Build: <day title>

- Anchor: <reference + translation>
- Theme: <1-2 sentences>

### Day 3 (C) — Pivot: <day title>

- Anchor: <reference + translation>
- Theme: <1-2 sentences>
- The "aha": <what the reader is meant to see>

### Day 4 (B-prime) — Apply: <day title>

- Anchor: <reference + translation>
- Theme: <1-2 sentences>

### Day 5 (A-prime) — Resolve: <day title>

- Anchor: <reference + translation>
- Theme: <1-2 sentences>

### Day 6 — Recap

- The five takeaways being integrated

### Day 7 — Sabbath

- Single anchor verse + translation
- One-line invitation

## Translation rationale (per anchor)

| Day | Reference | Translation | Why this rendering for this passage |
| --- | --------- | ----------- | ----------------------------------- |
| 1   | ...       | ...         | ...                                 |
| 2   | ...       | ...         | ...                                 |
| ... | ...       | ...         | ...                                 |

## External voices to draw from

- <Author, Work> — why relevant
- <Author, Work> — why relevant

## Done criteria

- [ ] All 7 days drafted
- [ ] All scripture quotations from allowed translation list
- [ ] All external quotes cited with full bibliography
- [ ] Validator passes
- [ ] Editor review complete
- [ ] Founder review complete
```

---

## 8. Source-Pack Format (`content/source-packs/<slug>.md`)

A markdown bundle the writer agent reads alongside the brief. Contains:

1. **Anchor passages** in 2-3 translations (always BSB, plus 1-2 others for contrast)
2. **Lexicon entries** for any Hebrew/Greek words featured in `vocab` modules (Strong's, BDB, Thayer's)
3. **Commentary excerpts** from public-domain commentators (Henry, Calvin, Wesley, Spurgeon, Gill) on the anchor passages
4. **Historical/cultural context** — dates, places, audience
5. **Christological connections** — how this passage echoes forward to Christ or back from Him
6. **Pre-vetted external quotes** from approved authors that might be used (writer picks 1-2 per day)

The writer agent must not pull commentary from anywhere else. The source pack IS the citation pool.

---

## 9. Quality Bar (the editor checks)

Every devotional must:

1. **Feel cohesive** — one voice, one narrative; not stitched modules
2. **Teach something concrete** — Hebrew/Greek etymology, historical context, or theological insight the reader didn't have at the start
3. **Tell a compelling story** — at least one modern narrative illustrates the truth
4. **Connect to Christ** — explicit Christological link by Day 5 at latest
5. **Invite response** — reflection + interactive element
6. **Place itself in the meta-story** — explicit on Day 1
7. **Respect the reader** — intelligent, not dumbed down; honest, not manipulative
8. **Cite everything** — every external claim, quote, or scholarly insight has an endnote
9. **Hold tension where it's real** — don't resolve doubt or grief in three paragraphs
10. **End in commitment, not certainty** — readers should leave with a posture, not just an answer

---

## 10. Writer & Editor Agent Workflow

### Writer agent ([.claude/agents/DEVOTIONAL-WRITER.md](.claude/agents/DEVOTIONAL-WRITER.md))

1. Load: this spec + brief + source pack
2. Draft Day 3 (pivot) first
3. Then Days 1, 2, 4, 5 in chiasm order (A → B → B-prime → A-prime)
4. Then Day 6 (recap), then Day 7 (sabbath)
5. Output 7 JSON files conforming to the modules schema

### Editor agent ([.claude/agents/DEVOTIONAL-EDITOR.md](.claude/agents/DEVOTIONAL-EDITOR.md))

1. Load: this spec + the 7 drafted files
2. Review each day for:
   - Doctrinal coherence (Nicene baseline; non-Creedal traditions fairly represented)
   - Voice fidelity (no forbidden phrases; tone matches §2)
   - Citation integrity (every claim cited; quotes word-for-word verified)
   - Narrative arc (Day-N advances Day-(N-1); chiasm holds)
   - Module specificity (no generic phrasing; titles are specific not abstract)
3. Return revision notes with severity (BLOCKING / NEEDS-FIX / NIT) and exact replacement text
4. Re-review after writer's revisions

### Validator (`scripts/validate-devotional.ts`)

Programmatic checks before founder review:

- Schema (required fields, valid `chiasm_position`)
- Translation (only allowed list)
- Forbidden phrases (regex match)
- Forbidden labels
- Word count per day within ±20% of target
- Endnote presence when external quotes detected
- Brief listed translations match JSON declared translations

Founder review only after validator + editor agent both pass.

---

## 11. What This Spec Does NOT Cover

- Visual design / typography / hero images (see [.claude/skills/wokegod-brand/SKILL.md](.claude/skills/wokegod-brand/SKILL.md))
- Audio/voice generation (out of scope for pilot)
- iOS or PWA UX (out of scope)
- Soul Audit selection algorithm (Phase 3 alignment)
- Batch authoring orchestration (Phase 4)
- Copyright audit of legacy 175 devotionals (Phase 5)

---

_"The Word was already one story. Now we're helping people see it."_
