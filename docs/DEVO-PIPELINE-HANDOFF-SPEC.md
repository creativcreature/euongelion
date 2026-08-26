# Devotional Media Pipeline — Build Handoff Spec

**For:** a fresh Claude Code session in `~/Documents/app-projects/external/euangelion`
**Date:** 2026-08-13
**Supersedes:** the v1 architecture plan and the v2 platform-strategy doc (both folded in here)

> **Read this first, Claude Code:** this is a build spec, not a discussion doc. It defines
> seven stages, a manifest spine, seven gates, and the exact `last30days` invocations that
> drive topic selection and packaging. Build in the order given in Part I. Do not start
> writing skill files until you have read Part E — it contains the one rule that, if broken,
> silently corrupts the founder's entire verification regime.

---

## Part A — The pipeline at a glance

One thematic in. Devotional, podcast, 3 YouTube videos, daily shorts, social stills out.
`last30days` is not a research tool bolted on the side — it is **stage zero and three
injection points**.

```
  S0  DISCOVER      last30days --discover (3-leg protocol) → topic queue → founder picks
        │                                    ▲
        ▼                                    │
  S1  TEXT          devo-go (exists)         │
        │           ← last30days <thematic> ─┘  (audience-language pre-read)
        ▼
  S2  AUDIO         verbatim narration + podcast episodes
        ▼
  S3  MOTION        3 YouTube long-form
        ▼
  S4  SOCIAL        2 vertical cuts/day + social stills
        ▼
  S5  PACKAGE       ← last30days (titles/hooks from community language)
        ▼
  S6  PUBLISH       → last30days queue cover "<topic>"
        ▼
  S7  MONITOR       last30days recurring — sentiment + policy drift watch
```

`/devo-run "<thematic>"` chains S1–S6. `/devo-discover` runs S0 standalone. Each stage is
separately invocable and resumable from the manifest.

**Where `last30days` enters, and why each one earns its place:**

| Point           | Invocation                                    | What it buys                                                                                                                                            |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S0**          | `--discover "christian faith"` 3-leg protocol | Stops the founder guessing themes. Surfaces what people are actually asking, with a persistent topic queue so nothing repeats and nothing is forgotten. |
| **S1 pre-read** | `"<thematic>"` with `--plan`                  | The words the audience uses about this subject. Feeds teaser/subtitle/CTA copy — never the devotional body (Part E).                                    |
| **S5**          | reuse cached run + `--register creator`       | Titles, thumbnail text, hooks, captions built on observed language rather than invented phrasing.                                                       |
| **S7**          | recurring `--discover` + fixed watch topics   | Early warning on the two risks that policy compliance cannot cover: audience sentiment turning on AI devotional content, and platform policy drift.     |

---

## Part B — Prerequisites

### B1. Install `last30days` (once, on the Mac)

```bash
brew install python@3.12                      # engine requires 3.12+
git clone https://github.com/mvanhorn/last30days-skill.git /tmp/l30d
npx skills add /tmp/l30d -g -y                # installs to ~/.agents/skills/last30days/
```

First `/last30days` invocation runs a setup wizard: installs `yt-dlp` (YouTube), the Digg CLI,
extracts browser cookies for X, and offers a free ScrapeCreators key (10,000 calls — enables
TikTok + Instagram + comment data). **Complete the wizard before any pipeline run.** Skipping
it silently degrades every discovery run to web-search-only.

### B2. Environment — put this in the repo, not in a shell profile

Create `.claude/last30days.env` (gitignored):

```bash
LAST30DAYS_MEMORY_DIR="$HOME/Documents/app-projects/external/euangelion/content/market-research"
LAST30DAYS_NATIVE_SEARCH=1        # Claude Code has WebSearch; skip the engine's keyless floor
```

Pinning the memory dir **inside the repo** is deliberate: discovery briefs, the topic queue,
and the SQLite research store become versioned project assets rather than scattered files in
`~/Documents`. Add `content/market-research/` to `.gitignore` if the raw dumps are too noisy,
but keep the queue.

### B3. Resolve the interpreter once per session

Every engine call in this spec assumes these two variables are already set:

```bash
SKILL_DIR="$HOME/.agents/skills/last30days"     # verify: ls "$SKILL_DIR/scripts/last30days.py"
LAST30DAYS_PYTHON="$(command -v python3.12 || uv python find '>=3.12')"
LAST30DAYS_MEMORY_DIR="$HOME/Documents/app-projects/external/euangelion/content/market-research"
```

### B4. Known constraint — where each stage can run

| Stage       | Blocker                              | Runs where                      |
| ----------- | ------------------------------------ | ------------------------------- |
| S0 discover | needs network + browser cookies      | **Claude Code on the Mac only** |
| S1 text     | repo, npm, validators, git           | Claude Code                     |
| S2 audio    | Voicebox/Kokoro on `127.0.0.1:17493` | **Claude Code on the Mac only** |
| S3–S5       | Higgsfield MCP + ffmpeg              | Claude Code, or Cowork desktop  |
| S6 publish  | OAuth creds                          | Claude Code                     |

Cowork's cloud sandbox cannot reach Reddit/YouTube/X (allowlisted egress) or your Mac's
localhost. **The canonical host for this pipeline is Claude Code.**

---

## Part C — The manifest spine

`content/pipeline/<slug>.pipeline.json` — every stage reads it, writes into it, stamps its
gate. Nothing downstream reads a raw file it did not find through the manifest. This is what
makes resume, partial rerun, `--auto` mode, and the evidence report all one mechanism.

```jsonc
{
  "schema": 1,
  "slug": "prayer-of-jabez",
  "thematic": "the Prayer of Jabez",
  "mode": "gated", // "gated" | "auto"
  "rulings": { "sa": "SA-035", "prd": "F-092" },

  "discovery": {
    // S0 — written by last30days, read by S1
    "source": "last30days",
    "run_dir": "content/market-research/2026-08-13-christian-faith",
    "bundle_id": "…",
    "queue_topic": "Prayer of Jabez prosperity backlash",
    "worthiness": 82,
    "podcast_angle": "…", // host-authored during leg 3
    "x_article_angle": "…",
    "audience_language": [
      // verbatim phrases — packaging only, see Part E
      { "phrase": "…", "source": "r/Christianity", "url": "…", "votes": 412 },
    ],
    "covered": false, // flipped by S6 via `queue cover`
  },

  "stages": {
    "text": { "state": "pending", "days": [], "plates": [], "gate": {} },
    "audio": { "state": "blocked", "verbatim": [], "podcast": [], "qa": {} },
    "motion": { "state": "blocked", "clips": [], "cuts": [] },
    "social": {
      "state": "blocked",
      "cuts_ig": [],
      "cuts_tt": [],
      "stills": [],
    },
    "package": {
      "state": "blocked",
      "youtube": {},
      "podcast": {},
      "social": {},
    },
    "publish": { "state": "blocked", "targets": [] },
  },

  "policy": {
    // G3.5 — see Part G
    "c2pa_posture": "unset", // "attached" | "stripped" | "unset"
    "apple_disclosure_text": "…",
    "variation_check": null,
    "originality_check": null,
    "cadence_check": null,
  },
}
```

Build `scripts/validate-pipeline.mjs` to enforce this schema, mirroring
`scripts/validate-devotional.mjs`. **`--auto` mode is not a second code path** — it is
"advance the state machine while every machine check is green." A red check halts in auto mode
too.

---

## Part D — Stage specifications

### S0 — DISCOVER (`/devo-discover`)

**Purpose:** replace founder guesswork with observed demand, and maintain a persistent topic
queue across runs.

**This is a three-command host-judged protocol. You are the judge — do not shortcut it.** A
bare one-shot `--discover` falls back to deterministic heuristics and produces no content
angles. Thread the **same `--save-dir` through all three legs**; handoff files **expire after
one hour**, so judge and finalize in the same session.

**Leg 1 — nominate** (Bash timeout `180000`):

```bash
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  --discover "christian faith and scripture" \
  --nominate-only \
  --corpus content/series-briefs \
  --corpus content/devotionals \
  --save-dir="$LAST30DAYS_MEMORY_DIR"
```

`--corpus` is the highest-value flag here and is easy to miss: it registers the repo's own
briefs and series ideas as a **private ranked source**, so discovery is aware of what
euangelion has already covered and what it has already considered. Corpus runs bypass any
hosted backend, so nothing leaves the machine.

Read the `discover-nominations.json` bundle it names — the digest alone is not the judgment
surface. Then judge **every** nomination id:

```json
{
  "bundle_id": "<echo from bundle>",
  "judgments": [
    {
      "id": "n1",
      "name": "Prayer of Jabez prosperity backlash",
      "junk": false,
      "worthiness": 82
    },
    {
      "id": "n2",
      "name": "Someone asks for prayer",
      "junk": true,
      "worthiness": 5
    }
  ]
}
```

Judging criteria for **this** publisher — encode these in the skill:

- `junk: true` for prayer requests, personal crisis posts, and promo. These are people in
  need, not topics. **Never turn a stranger's crisis into content.**
- `worthiness` scores the question behind the post, not the post. A recurring confusion about
  a passage scores high; a hot-take scores low.
- Reject anything whose only hook is outrage at another Christian or another tradition.

**Leg 2 — research** (Bash timeout `600000`). Write the judgments to a tmpfile and run in the
**same Bash call**. Use exactly this pattern — trailing `XXXXXX` with no suffix for BSD
mktemp, `>|` because mktemp already created the file, quoted heredoc, and **never wrapped in
`bash -lc '...'`** (an apostrophe in a topic string closes the quote and the command dies):

```bash
JUDGMENTS_FILE=$(mktemp "${TMPDIR:-/tmp}/last30days-judgments.XXXXXX")
trap 'rm -f "$JUDGMENTS_FILE"' EXIT
cat >| "$JUDGMENTS_FILE" <<'JUDGE_EOF'
{ …judgments json… }
JUDGE_EOF
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  --discover --judgments "$JUDGMENTS_FILE" --save-dir="$LAST30DAYS_MEMORY_DIR"
```

Expect several minutes of wall clock — that is the deep per-topic research pass, not a hang.

**Leg 3 — finalize** (Bash timeout `60000`). Write two hooks per surviving topic (≤200 chars,
grounded in leg-2 evidence — real tension, real numbers, real names):

```json
{
  "bundle_id": "<same>",
  "angles": [{ "id": "n1", "podcast": "…", "x_article": "…" }]
}
```

```bash
ANGLES_FILE=$(mktemp "${TMPDIR:-/tmp}/last30days-angles.XXXXXX")
trap 'rm -f "$ANGLES_FILE"' EXIT
cat >| "$ANGLES_FILE" <<'ANGLE_EOF'
{ …angles json… }
ANGLE_EOF
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  --discover --finalize --angles "$ANGLES_FILE" \
  --emit=compact --save-dir="$LAST30DAYS_MEMORY_DIR"
```

**Relay leg 3's stdout verbatim** — ranked headings, momentum labels, community quotes,
evidence counters, the `Pipeline:` line, and the engine's pass-through footer. `"Nothing solid
this window"` is a valid, honest result: relay it, suggest a narrower domain, do **not** retry
or invent topics.

**Then, before the founder picks:**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  queue list --save-dir="$LAST30DAYS_MEMORY_DIR"
```

**Outputs:** `manifest.discovery` populated; the topic queue updated.
**Gate G0:** AskUserQuestion — founder picks the thematic from the ranked queue, plus the
existing devo-go questions (format, editorial stance, how personal the spine is, done).

**Degradation:** if a leg fails twice, fall back to one-shot
`--discover [domain] --emit=compact --save-dir=…` (timeout `600000`) and relay its brief.
Never leave the run with no output. On hosts with short shell caps, add `--discover-shallow`
to leg 1 only.

---

### S1 — TEXT (`devo-go`, existing, plus one pre-read)

`devo-go` is unchanged and remains the standard. Add **one** step before Phase 1's
AskUserQuestion:

```bash
QUERY_PLAN_FILE=$(mktemp "${TMPDIR:-/tmp}/last30days-plan.XXXXXX")
trap 'rm -f "$QUERY_PLAN_FILE"' EXIT
cat >| "$QUERY_PLAN_FILE" <<'PLAN_EOF'
{ …your query plan… }
PLAN_EOF
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" "<thematic>" \
  --plan "$QUERY_PLAN_FILE" \
  --subreddits Christianity,TrueChristian,Bible,Reformed \
  --register creator --store --emit=compact \
  --save-dir="$LAST30DAYS_MEMORY_DIR"
```

`--plan` is **mandatory** on named-entity topics (a passage name, a person, a book). You are
the planner — you do not need an API key, and any engine message about a "provider" means you
skipped your own planning step, not that you lack credentials.

**What you take from this run:** the _questions people are actually asking_ about this
passage, and the _words they use_. Both go into `manifest.discovery.audience_language` and
into the brief header as founder context. **Neither goes into the devotional body.** Part E.

Everything else in `devo-go` — the 12 phases, the chiasm, the corpus-verbatim scripture rule,
the source pack as sole citation pool, single-author drafting, the editor pass, the reading
artifact — stands exactly as written.

**Gate G1:** validator 0/0 + editor `READY FOR FOUNDER` + reading artifact published.

---

### S2 — AUDIO

Two tracks from one authoring source.

**Track A — verbatim narration.** Existing and measured: `spec/narration_extract.py` →
`spec/render_kokoro.py`. Feeds the app's Audio Edition and is the timing bed for S3.

**Track B — podcast episodes.** `content/podcast-scripts/<slug>-ep-N.md`. New prose, written
by the **same single author in the same pass** as the days (the Harvest v5 single-author rule
applies — per-day writer agents produced the patchwork the founder rejected). Draws **only**
from `content/source-packs/<slug>.md`. Runs through the same banned-phrase validator and the
same `devotional-editor` review as the days.

**Hard requirement — Apple Podcasts §1.11.** Synthetic voice must be disclosed _"in the
content and metadata for each episode and show."_ No realism test; it triggers on TTS as such.
Build it into the template, not the checklist:

- a spoken line in the audio (end of the bumper),
- `manifest.policy.apple_disclosure_text` mirrored into every episode description and the show
  description.

**Specs:** mono AAC 64–96 kbps @ 44.1 kHz, **−16 LKFS ±1 dB, true peak −1 dBFS** (ITU-R
BS.1770-5 — Apple's is the only published figure; the "−19 LUFS for mono" convention
contradicts it). Episode length 8–12 min. Supply your own VTT via `podcast:transcript` — ASR
mangles biblical proper nouns, which is most of the corpus. Apple does **not** auto-generate
chapters under 10 minutes; use a 3-entry timestamp list in the show notes, which works on
Apple, Spotify and YouTube from one source.

⬥ **Open:** founder/human voice for podcast + YouTube flagship, Kokoro for the 521-devotional
app catalog. Human voice removes the Apple disclosure duty and the 33% disclosure penalty
entirely. Pray.com — best-funded operator in this exact niche — uses human narrators while
using AI elsewhere.

**Gate G2:** verbatim ≥99%, pace 150–170 wpm, clarity ≥0.99, disclosure present in both audio
and metadata.

---

### S3 — MOTION (3 YouTube long-form)

| #   | Source                        | Length    | Treatment — **must differ**         |
| --- | ----------------------------- | --------- | ----------------------------------- |
| 1   | Day 1 sabbath + framing       | 10–14 min | quiet, minimal, long holds          |
| 2   | The C pivot day               | 25–35 min | flagship; full exposition, chapters |
| 3   | Recap + Further-Your-Learning | 15–20 min | retrospective, resource-forward     |

Different lengths, pacing, **music beds**, and visual density. This is not taste — YouTube's
Spam policy names _"the exact same background music and repetitive AI generated imagery across
many videos, with each video reading out an AI-generated script"_ as prohibited behaviour, at
the Community Guidelines tier that ends in channel termination.

**Visual construction.** ffmpeg Ken-Burns on the riso plates as the bed (zero cost, zero brand
drift — no pixels invented); Higgsfield image-to-video for **1–3 hero moments per video**
(`seedance1_5` or `kling2_6`, `start_image` = the plate, `generate_audio: false`, prompted for
near-imperceptible motion: _"the halftone dot structure and paper grain remain fixed; no new
elements appear; only the light and one element move"_). Budget ~14–20 clips per series total.
A 20-minute video at 8s clips would be ~150 generations — not viable, and not necessary.

**Style-integrity check:** extract frames from every generated clip and verify duotone
survival before it enters a cut. This is SA-032's accuracy gate extended to motion.

**Build for two platform features:** **YouTube Shows** (launched 9 Jul 2026 — converts
playlists into season/episode series with dedicated search placement and Continue Watching;
native fit for a 7-day series; needs three artwork assets ≥1080p) and **multi-language audio**
(creators report >25% of watch time from non-primary languages; Spanish and Portuguese first).

**Specs:** MP4/H.264 High, Fast Start, closed GOP, BT.709, 1080p24–30 @ 8 Mbps, AAC-LC 48 kHz
stereo 384 kbps, **−14 to −16 LUFS / −1 dBTP** (YouTube only attenuates, never boosts).
Thumbnails 3840×2160. Title ≤100 chars; description ≤5000 **bytes** — em-dashes and smart
quotes cost 2–4 bytes each. Chapters ≥3, first at 00:00, ≥10s each. **Upload your own SRT.**

**Gate G3:** contact sheet of every clip + duotone integrity + SA-032 fact check.

---

### S4 — SOCIAL

**Two vertical cuts per day, not one.** This is the change that matters most in this stage:

| Platform            | Length       | Why                                                                                                                                           |
| ------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instagram Reels** | **45–60s**   | 6M-Reel study, Jan–Jun 2026: 45–60s peaks at 0.35% ER / 10,374 median views. **0–30s is the second-worst bracket.** 180s+ collapses to 0.15%. |
| **TikTok**          | **120–180s** | 6M-video study: 120–180s wins absolute reach ~10× over 1–15s (11,136 vs 1,274 median views). Creator Rewards also requires >60s.              |

Cross-posting one master leaves most of TikTok on the table and wastes Instagram's optimum.

**Source material:** the day's **Two-Minute Open**. SA-030/034 already built it so a reader who
stops at the DEEP DIVE CTA has had a complete devotional — that is the same contract
short-form needs. No new writing, no new verification surface.

- Hook: the day's `pullquote`, first 3 seconds. Say the topic **aloud** early (TikTok weights
  spoken keywords for search).
- Captions: **burn them in** (Instagram's are toggleable and off by default; TikTok reads
  on-screen text as ranking input; ~85% of viewing is muted).
- CTA: mirrors the DEEP DIVE CTA — "Full reading at euangelion.app".

**Build shorts deterministically (ffmpeg + caption burn). Do not use Higgsfield
`shorts_studio`** — it restyles toward a preset look, which is the one thing a locked riso
brand must not do.

**Safe areas — design once to the union of both, or reposition per platform.** TikTok's bottom
UI is far more intrusive: top 192px, bottom **484px**, right 140px, left 60px leaves
**~1080×1244 clear, biased left**. Instagram's Reel cover crops to 1080×1350 on the profile
grid (~285px lost top and bottom) — design titles to the 4:5 crop.

**Social stills:** render as **HTML→PNG in the repo** using the existing design-system tokens
and the font data URIs from the founder reading artifact. Deterministic, exactly on-brand,
zero credits, versioned with the code. 1:1, 4:5, 9:16, plus quote cards from `pullquote`.

**⚠ Deprecate standalone scripture-verse graphics.** From 30 April 2026 Instagram removes
recommendation eligibility from accounts that primarily repost or share others' work — now
covering photos and carousels, judged **at the account level, holistically**. Watermarks,
speed changes and screenshots-with-credit explicitly do not count as transformation; original
voiceover, design and commentary do. Keep verse graphics only as slides inside an
original-commentary carousel.

**Gate G5:** contact sheet, safe-area assertion per platform, caption accuracy, aspect specs.

---

### S5 — PACKAGE (`last30days` injection #3)

Titles, thumbnail text, hooks, descriptions and captions — built from observed community
language rather than invented phrasing.

Reuse the cached S1 run rather than paying for a fresh one:

```bash
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  --drill "<cluster name from the S1 run>" --emit=compact \
  --save-dir="$LAST30DAYS_MEMORY_DIR"
```

Check the library first so the same ground isn't re-broken:

```bash
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  library search "<thematic>" --save-dir="$LAST30DAYS_MEMORY_DIR"
```

**Packaging rules derived from the platform research:**

- **Instagram/TikTok captions are search assets, not tag dumps.** Hashtag following was removed
  Dec 2024; Mosseri said Feb 2025 that hashtags **"don't work"** for reach; a **5-hashtag cap**
  rolled out from late Dec 2025. Meanwhile, since 10 July 2025 public professional-account
  content is **indexed by Google and Bing** — captions, alt text, Reels. Write captions as
  searchable devotional prose.
- **Optimise for sends, not likes.** Mosseri: watch time, likes and sends are the top three,
  and **sends weigh more heavily for non-follower reach** while likes weigh slightly more for
  follower reach. Devotional content is natively send-able. Make the payoff legible in a DM
  preview and ask for the forward.
- **YouTube tags are "not important"** per YouTube's own performance FAQ. Spend the effort on
  title, thumbnail and chapters.

**Gate G6:** metadata schema, no banned phrases, Apple disclosure present, byte-length check on
YouTube descriptions.

---

### S6 — PUBLISH

No YouTube, Instagram, or podcast-host MCP connector exists — I checked the registry;
Higgsfield can publish to TikTok only. Phase 1 is a packaged folder + metadata sheet for manual
upload. Phase 4 is a **YouTube Data API v3 script** in the repo with a locally-stored OAuth
token.

**Podcast:** self-host `feed.xml` from R2. Traps to encode: `r2.dev` is dev-only (attach a
custom domain); if you front R2 with a Worker **do not implement your own byte-ranging**
(Cloudflare strips `Range`, expects a 200, and treats a Worker-returned 206 as uncacheable);
cached hits never touch R2 so bucket metrics undercount; and you will have **no IAB-certified
numbers**. Apple requires `HEAD` and byte-range support, artwork 3000×3000 PNG/JPG **with no
alpha channel**, and a globally unique never-changing GUID per episode.

⬥ **Know what self-hosting costs:** the Spotify Partner Program requires hosting on Spotify for
Creators, and Apple's video path is HLS via private API — self-hosters are excluded from both.
Given Spotify's 2,000-consumption-hours-in-30-days bar is out of reach for a new daily show
anyway, self-hosting is defensible for year one. Decide it, don't default into it.

**On successful publish, close the loop:**

```bash
"$LAST30DAYS_PYTHON" "$SKILL_DIR/scripts/last30days.py" \
  queue cover "<exact queued topic name>" --save-dir="$LAST30DAYS_MEMORY_DIR"
```

Set `manifest.discovery.covered = true`. Requires the **exact** queued name; on an unknown
name the engine exits 2 — run `queue list` and use the real name rather than guessing.

---

### S7 — MONITOR (`last30days` injection #4)

Weekly scheduled run. This covers the two risks that no amount of policy compliance touches.

```bash
# 1. New topics in the domain, straight into the queue
… --discover "christian faith and scripture" --nominate-only …   # then the 3-leg protocol

# 2. Fixed watch topics — sentiment and policy drift
… "AI generated christian content backlash" --plan … --days 30 --store …
… "youtube inauthentic content policy enforcement" --plan … --days 30 --store …
```

**Watch for specifically:**

- Sentiment turning on AI devotional content. The Edison/SSRS blind test found AI narration
  _beat_ human on favorability (61% vs 53%) — but **33% became less favorable on disclosure**,
  and 62% of podcast consumers consider AI a credibility threat. For trust-dependent content
  this is the live risk, and it moves faster than policy.
- YouTube's **viewer AI-perception survey** (testing since March 2026) — if that becomes a
  ranking signal, audience perception outranks compliance.
- Policy drift on the July 2026 "AI personas on sensitive topics" bucket (currently finance,
  legal, medical — religion is _not_ listed, but the category's rationale is adjacent).

Use **`create_trigger`** (the Claude Code Remote MCP scheduled-task tools), **never** the local
`CronCreate` tools — those run in-process and die with the session.

---

## Part E — THE FIREWALL (read before writing any skill file)

**`last30days` output must never enter the devotional text, the source pack, or any
citation.**

`devo-go` enforces a verification regime that is the founder's central asset: scripture pulled
corpus-verbatim from `public/bibles/` only; every quote verbatim and fully cited from primary
texts; every story primary-source verified with folklore explicitly rejected and the rejection
documented; Hebrew/Greek never unpaired with transliteration and never overstating what the
interlinear supports. The source pack is the **only** citation pool for drafting.

`last30days` returns Reddit posts, X threads, YouTube comments and web results. That is
excellent evidence about **what people are asking and how they say it**. It is not a source
about **God, Scripture, or history**, and it has no verification standing whatsoever.

**Permitted uses — packaging and selection only:**

- topic selection and prioritisation (S0)
- founder context in the brief header — "here is the confusion people have about this passage"
- teaser, subtitle, CTA, title, thumbnail text, hook, caption copy (S5)
- audience-language vocabulary in `manifest.discovery.audience_language`

**Forbidden — no exceptions:**

- any claim, story, statistic, quotation or historical assertion in a devotional day
- anything appended to `content/source-packs/<slug>.md`
- any scripture text or lexical claim
- any podcast-script content beyond framing

**Enforce it mechanically, not by convention.** Add to `validate-pipeline.mjs`: assert that
no string in `manifest.discovery.audience_language` appears verbatim in any
`public/devotionals/<slug>-day-*.json` module body or in the source pack. Fail BLOCKING.

Rationale worth stating in the skill file so it survives future edits: the entire competitive
advantage here is that this content is verified when the category is drowning in unverified AI
output. A single Reddit anecdote laundered into a devotional through the topic-discovery
channel would destroy more than it gains.

---

## Part F — Per-platform output matrix (what the pipeline must emit)

| Asset             | Count/series | Spec                                                                                     | Hard constraint                                                                 |
| ----------------- | ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| YouTube long-form | 3            | 10–14 / 25–35 / 15–20 min · 1080p H.264 8 Mbps · −14 to −16 LUFS · own SRT · ≥3 chapters | **Must differ in length, music, pacing.** Never a scripture-reading-only cut.   |
| YouTube Shorts    | 7            | ≤3 min (not 60s), vertical, 1080p max                                                    | Awareness only — RPM is 3–14% of long-form; measure conversion, don't assume it |
| Instagram Reels   | 7            | **45–60s** · 1080×1920 · burned captions · ≤5 hashtags                                   | Safe: top 192 / bottom 420 / right 130px. Cover crops to 4:5 on grid            |
| TikTok            | 7            | **120–180s** · 1080×1920 · ≥2500 kbps · burned captions                                  | Safe: top 130 / **bottom 484** / right 140px                                    |
| Podcast episodes  | 3            | 8–12 min · mono AAC 64–96k · **−16 LKFS / −1 dBTP** · own VTT                            | **Apple §1.11 disclosure in audio AND metadata, every episode**                 |
| Social stills     | ~20          | 1:1, 4:5, 9:16 + quote cards · HTML→PNG from repo tokens                                 | No standalone verse graphics (IG aggregator penalty)                            |
| Series artwork    | 3 assets     | ≥1080p for YouTube Shows; 3000×3000 no-alpha for podcast                                 | —                                                                               |

---

## Part G — Gates

Default `mode: "gated"` — every gate pauses. `--auto` advances while machine checks are green.

| Gate            | Founder sees                         | Machine must be green on                                            |
| --------------- | ------------------------------------ | ------------------------------------------------------------------- |
| **G0** shape    | Ranked topic queue + AskUserQuestion | leg-3 brief rendered; queue updated                                 |
| **G1** text     | Reading artifact (exists)            | validator 0/0; editor READY FOR FOUNDER; **firewall check**         |
| **G2** audio    | 2-min sample + one full episode      | verbatim ≥99%; 150–170 wpm; clarity ≥0.99; Apple disclosure present |
| **G3** motion   | Contact sheet of every clip          | duotone integrity; SA-032 fact check                                |
| **G3.5** policy | _(report only)_                      | **see below — this is the new one**                                 |
| **G4** cuts     | The 3 videos                         | A/V sync; caption accuracy; runtime bands                           |
| **G5** social   | Contact sheet: 14 verticals + stills | per-platform safe areas; caption accuracy                           |
| **G6** publish  | Titles, descriptions, thumbnails     | metadata schema; byte lengths; no banned phrases                    |

### G3.5 — Policy & Originality (new, all four checks are manifest reads)

1. **Variation** — assert the 3 videos differ in length band, music bed and visual treatment;
   assert no two shorts in a series share the same opening 3 seconds.
2. **Originality** — assert every published piece contains original exposition, not scripture
   reading alone. (YouTube: _"Content that exclusively features readings of other materials you
   did not originally create"_ is not monetizable. The load-bearing word is **exclusively**.)
3. **Metadata** — assert C2PA presence/absence matches `manifest.policy.c2pa_posture`; assert
   Apple disclosure text present in both audio and episode metadata.
4. **Cadence** — assert the run does not exceed declared per-platform caps or queue a burst
   upload.

Each gate takes pass / revise / abort, and the ruling appends to
`docs/production-decisions.yaml` — same as every other founder ruling.

---

## Part H — Files to create

```
.claude/skills/
  devo-discover/SKILL.md            # S0 — the 3-leg protocol, judging criteria, queue
  devo-audio/SKILL.md               # S2 — both tracks + Apple disclosure
  devo-motion/SKILL.md              # S3 — 3 videos, variation rules, Higgsfield budget
  devo-social/SKILL.md              # S4 — two cuts, safe areas, stills
  devo-package/SKILL.md             # S5 — last30days-informed packaging
  devo-publish/SKILL.md             # S6 — manual package, queue cover
  devo-run/SKILL.md                 # orchestrator, --gated / --auto
  devo-run/references/
    pipeline-manifest.md            # Part C schema
    last30days-integration.md       # Parts D-S0/S5/S7 + Part E firewall
    platform-specs.md               # Part F matrix
    policy-gates.md                 # Part G G3.5

scripts/
  validate-pipeline.mjs             # manifest schema + firewall assertion
  render-social-still.mjs           # HTML→PNG from design tokens
  build-verticals.mjs               # ffmpeg: IG 45-60s + TT 120-180s cuts
  youtube-upload.mjs                # Phase 4

content/
  pipeline/<slug>.pipeline.json
  podcast-scripts/<slug>-ep-N.md
  market-research/                  # LAST30DAYS_MEMORY_DIR
```

Each `SKILL.md` needs YAML frontmatter with `name`, `description`, and `argument-hint`,
following the `devo-go` pattern.

---

## Part I — Build order and acceptance criteria

Not the order the pipeline runs in. The order that de-risks fastest.

| Phase | Build                                                                                                                                                | Done when                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **0** | Manifest schema, `validate-pipeline.mjs` incl. the Part E firewall assertion, `devo-run` skeleton with all 8 gates wired to stubs                    | A fake manifest passes validation; a firewall violation fails BLOCKING; `--auto` and `--gated` both traverse the stub graph        |
| **1** | `devo-discover` — full 3-leg protocol, `--corpus` wired to `content/series-briefs` + `content/devotionals`, judging criteria, `queue list` before G0 | One real discovery run produces a ranked brief with host-written podcast + x_article angles, and `manifest.discovery` is populated |
| **2** | `devo-audio` — Track A wired to existing scripts, Track B authoring, Apple disclosure baked into the template                                        | One series renders both tracks; G2 passes; disclosure present in audio _and_ metadata                                              |
| **3** | `devo-social` — two-cut builder, safe-area assertion, HTML→PNG stills                                                                                | 7 IG cuts at 45–60s and 7 TikTok cuts at 120–180s from one series; all inside safe areas                                           |
| **4** | `devo-motion` — 3 videos, variation enforcement, Higgsfield hero budget, duotone frame check                                                         | G3 + G3.5 both pass on one series                                                                                                  |
| **5** | `devo-package` + `devo-publish` — metadata, manual package, `queue cover`                                                                            | Full `--gated` run end to end; queue topic flips to covered                                                                        |
| **6** | `devo-run --auto` + `create_trigger` for S7 monitoring + YouTube Data API upload                                                                     | Two series ship fully gated first, then one runs `--auto` clean                                                                    |

**Rationale for 3 before 4:** shorts prove the visual grammar on 20-second pieces before
committing to 20-minute renders, and shorts are the stated audience-growth lever.

---

## Part J — Governance

Same tracking the repo already enforces: one **SA ruling** establishing this pipeline as the
standard path (the way SA-029 established `/devo-go`), an **F-### PRD per stage skill**,
CHANGELOG entries, and the manifest schema versioned so a v1 series can be re-run under v2.
Next SA id = last entry in `docs/production-decisions.yaml` + 1 (the yaml is canonical — do not
grep CHANGELOG). Stage commits by explicit file list; never `git add -A`.

---

## Part K — Open decisions for the founder

| ⬥   | Decision                                | Recommendation                                                                                                                                               |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Narrator: human vs Kokoro               | Human for podcast + YouTube flagship; Kokoro `am_michael` for the 521-devotional app catalog                                                                 |
| 2   | Podcast hosting: self-host R2 vs a host | Self-host year one; revisit at Spotify's 2,000-hour bar                                                                                                      |
| 3   | C2PA posture                            | **Audit whether GPT Image 2 / Higgsfield embed C2PA before S3 is built** — it's a one-way door, and on TikTok the label feeds a user-controlled reach slider |
| 4   | One Instagram account or two            | Two — Instagram scores accounts holistically, so high-volume shorts shouldn't sit beside considered work                                                     |
| 5   | Discovery domain string for S0          | Start `"christian faith and scripture"`; narrow if nominations are noisy                                                                                     |
| 6   | Cadence caps                            | YouTube ≤3/wk · IG 4–5 Reels + 2 carousels/wk · TikTok daily · podcast daily                                                                                 |
| 7   | Multi-language rollout                  | Spanish + Portuguese after the first series ships clean                                                                                                      |

---

## Part L — Time-sensitive

1. **YPP watch-hour bar doubles 1 Feb 2027** — 4,000 → 8,000 hours. ~5.5 months to clear the
   current bar. If monetization matters, this dominates sequencing.
2. **Trial Reels validation needs no pipeline** — publishes to non-followers only, returns
   metrics in ~24h. Start testing tone and length now; it de-risks every S4 decision.
3. **The C2PA audit is a one-way door** — do it before S3 code exists.

---

## Appendix — evidence quality

Everything above rests on live web research against primary platform documentation on
2026-08-13, not on model priors. Known weak spots, stated so they are not over-trusted:
faith-vertical performance benchmarks essentially do not exist in public data (the best length
study excludes religion entirely); there is **no verified case of a faith channel demonetized
specifically for AI content**; there is no primary data on Shorts→long-form conversion; Meta
policy detail rests on secondary reporting because Meta's own domains were unreachable during
research; and loudness targets for YouTube/Instagram/TikTok are community-measured — only
Apple's −16 LKFS is documented. Safe-zone pixel values are third-party reconstructions; verify
with a test post.

**And the gap only S0 closes:** none of this says what euangelion's actual audience is saying
right now. That is what the discovery stage is for, and it cannot run anywhere but the Mac.
