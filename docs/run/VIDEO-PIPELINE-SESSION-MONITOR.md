# Video Content Pipeline — Live Session Monitor

**Maintained by:** monitoring session `euangelion-b7` (`28a7fd72`) — _not_ the session doing the work
**Subject session:** `euangelion-5c` (`7b4f4352-5581-4532-b889-2dc798009127`)
**Started:** 2026-08-29 17:09 EDT
**Last updated:** 2026-08-29 20:13 EDT — **Report #7**
**Status:** research phase complete. Layer-1 (**the eye**) offered at 17:13, **still not started**.
Four consecutive founder messages have been about local video generation instead — the layer the
session itself called _"the slowest and least controllable part of the whole thing."_ One verdict
issued and then reversed within five minutes. **No plan approved. Nothing built. Nothing
installed. Nothing measured on this machine.**

## What this document is

An independent running record of the video-pipeline session — the brief as stated, what the
session actually did, what it proved, and what it only asserted. It exists so the plan can be
held to its own claims.

Two rules:

1. **Evidence or it is a claim.** Anything in §4 has a command or a fetched source behind it.
   Anything without one lives in §5.
2. **The brief is quoted, never paraphrased.** §1 is verbatim so drift is visible.

Where this file says _verified independently_, the monitoring session re-ran the check itself
rather than taking the working session's word for it.

---

## 1. The brief (verbatim, 17:09 EDT)

> My goal is to buuild a completely free way of creating video content using claude, codex,
> after effects and remotion, and possibly generating in photoshop for in between frames etc. I
> dont see anyone doing this yet. It would completely disrupt a lotta businesss for people. Id
> like to make this a skill that I can use for my devotional website, similar to the /imagen
> skill- this shows my frustrations trying to create this workflow. I think i need to give
> claude eyes similar to image generation eyes. Im not sure how. I need claude to literally be
> able to see images in the way I see them so I can direct it as to what is right or wring. the
> ultimate goal is a video creration pipeline. the first skill is just getting claude eyesight
> to see video as it edits it, to check compositions, and that people and elements are properly
> aligned and not just a random mess because its just looking at code. Like a proper artist
> skill where claude can literally see. Then build on that creating video based on a reference
> video, or plain language that is accurate to what the user is asking/the reference. Then on
> top of that video content workflow with script writing, research leayers etc. Firstly research
> what is out there regarding this and then we will move from there strategically from small
> skill to pipeline.

### The brief decomposed

| #   | Stated outcome                                                        | Sequencing            | Status                        |
| --- | --------------------------------------------------------------------- | --------------------- | ----------------------------- |
| G0  | Research what already exists                                          | first, explicitly     | **done, delivered 17:13**     |
| G1  | **"Eyes"** — Claude sees video/composition as it edits, not just code | "the first skill"     | spec offered, **not started** |
| G2  | Generate video from a reference video **or** plain language           | "then build on that"  | not started                   |
| G3  | Full content workflow — scripting, research layers                    | "then on top of that" | not started                   |

### Constraints the founder set

- **"completely free"** — a hard cost constraint on the whole stack.
- **Tools named:** Claude, Codex, After Effects, Remotion, Photoshop (tweening).
- **Deliverable shape:** a _skill_, patterned on `/imagen`.
- **Destination:** the devotional website (Euangelion).
- **Method:** research first, then "strategically from small skill to pipeline."

---

## 2. Process record

| Time (EDT)  | Action                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 17:09       | Brief received. Session states it will research before proposing.                                                                                                                                                                                                                                                              |
| 17:09–17:11 | Reads `/imagen` SKILL.md in full as the pattern. ~15 web searches, 5 targeted fetches.                                                                                                                                                                                                                                         |
| 17:11       | **Probes the local toolchain and hardware** — the most load-bearing action of the session.                                                                                                                                                                                                                                     |
| 17:13       | **Delivers the research synthesis** (§3). Corrects the founder's premise. Offers to spec layer 1. Flags a schedule conflict (§6.2). Declines to make an artifact, citing the project pitch rule. Declines to push a commit that isn't its.                                                                                     |
| 17:14       | Founder replies — **not** to the schedule flag, and **not** to the layer-1 offer. Asks: _"How do I get local comfy?"_                                                                                                                                                                                                          |
| 17:14–17:16 | Re-probes python toolchain. Finds `uv` + Python 3.12. Researches Comfy Desktop, Wan 2.2 / LTX model sizes, and Apple Silicon generation benchmarks.                                                                                                                                                                            |
| 17:16       | **Delivers the local-ComfyUI verdict** — and it is a recommendation _against_ the thing the founder asked for. See §6.1, which this closes. Offers to run the install.                                                                                                                                                         |
| 17:20       | Founder pastes the **ComfyUI + MLX on Apple Silicon** article: _"whats this look like?"_ Third consecutive layer-2 message; Q1 and Q2 still unanswered.                                                                                                                                                                        |
| 17:20–17:21 | Medium **403s**; the freedium mirror is dead (`ENOTFOUND`). Rather than paraphrase from the search snippet, the session **checks the article's repos for a pulse via `gh`** — `thoddnn/ComfyUI-MLX` is **404, gone**; `PrinceJonaa/ComfyUI-MLX-Universal` has **1 star**. Verdict: "the article's stack is mostly dead repos." |
| 17:21       | Search surfaces **`baisampayans/ltx-mlx`** — pure MLX LTX-Video, no PyTorch at runtime. Session announces it "**may reverse what I told you last turn**" _before_ knowing the outcome.                                                                                                                                         |
| 17:31       | **Disk answer delivered. §6.10 watch item PASSED** — premise corrected plainly, own earlier estimate corrected _upward_, and the session **steered back to the eye**. See §6.10.                                                                                                                                               |
| 17:30       | Founder: _"what is the resource cost again? I dont have a ton of space on here."_ Session declines to repeat itself and goes to re-measure.                                                                                                                                                                                    |
| 17:27       | **Cost answer delivered**. Arithmetic independently re-checked by this monitor — **all of it correct**. Tells the founder that two of the five tools he named cannot be in the free core.                                                                                                                                      |
| 17:26       | Founder: **"what are costs?"** — the first message since 17:13 that goes at the _constraint_ rather than a tool. Session: _"'completely free' has three leaks in it. Let me get current pricing rather than quote from memory."_ Invokes the `claude-api` skill for live pricing. **In flight.**                               |
| 17:21       | **Reversal delivered.** Kills the article's stack with repo data, then explicitly retracts its own 17:16 verdict. Grades its own evidence as _weaker_ than the claim it overturns. Asks to **measure on the actual M4 Pro**. See §6.7.                                                                                         |

**Process assessment.** Strong so far, on the marks that usually slip:

- It researched first, as asked, and did not start building.
- It **contradicted the founder's premise** ("partly wrong") rather than agreeing with it.
- It **probed the actual machine** instead of assuming a toolchain, and found a blocker.
- It sourced the synthesis with 11 links.
- It asked permission before the next step rather than proceeding into it.

One drift risk is now live: the founder's ComfyUI question is a **layer-2 question asked during
layer-0**, and the session has followed it without noting that it moves off the agreed
"small skill to pipeline" sequence. See §6.3.

---

## 3. The premise test — "I don't see anyone doing this yet"

The session's finding, which this monitor agrees is the honest reading: **the plumbing is
commodity and mostly free; the judgment layer is empty.**

| Piece                | Prior art found                                                                                                                     | Free?  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Programmatic video   | Remotion — 12 official agent skills + official Claude Code plugin                                                                   | see V1 |
| Remotion (3rd party) | `claude-remotion-skill` (MIT), `video-shotcraft` (152 shot recipes, 209 motion previews), `Claude-Code-Video-Toolkit`               | MIT    |
| After Effects        | `a-y-ibrahim/after-effects-mcp` — 57 tools incl. **`see-frame`**, **`contact-sheet`**, **`match-reference`**, background `aerender` | free   |
| Photoshop            | Adobe's own `adb-mcp` (UXP, PS 26+); `photoshop-mcp` (102 tools)                                                                    | free   |
| FFmpeg               | `kinocut` — 87 tools, guardrailed, local                                                                                            | free   |
| Claude "video eyes"  | `claude-video-vision` — ffmpeg frames + audio, "perception layer, not interpretation layer"                                         | free   |

**The gap, stated precisely.** Per the most rigorous source found (digitalapplied, "Agent
Feedback Gap"): there is _"no widely-documented, purpose-built tool for testing motion or
animation intent."_ Agents can render and can look at a still. None of them **judge** — pacing,
easing, a figure cropped at the ankles, two elements colliding, whether the frame reads.

So the defensible claim is **not** "nobody has given Claude eyes" — `see-frame` already exists.
It is _"nobody has built the judgment layer, or joined eyes + generation + editorial workflow
into one pipeline."_ That is a narrower claim and a much stronger one.

**The session's central design insight, recorded because the whole plan rests on it:**

> the agent is _judging_ things it should be _measuring_. Alignment, safe margins, overlap,
> crop-at-joints, contrast — that's arithmetic, not taste. A VLM guessing pixel coordinates is
> unreliable; a script measuring them is exact. Split the eye into **measure** (deterministic)
> and **judge** (rubric, VLM).

This monitor's view: that is the right idea and it is the one thing in the synthesis that is
genuinely novel rather than assembled from prior art. It should be the thing the skill is
tested on.

---

## 4. Facts established, with evidence

### 4.1 Toolchain — the blocker moved, it did not clear

Probed 17:11, re-probed 17:14. **Verified independently by this monitor at 17:16:**

```
ffmpeg / ffprobe            NOT FOUND          ← still true, still step zero
magick / convert / montage  NOT FOUND
brew                        NOT FOUND
python3 (system)            3.9.6, no cv2
uv                          0.12.5   /Users/jamesparker/.local/bin/uv        ✓
python3.12                  3.12.14  (uv-managed)                            ✓
python3.11                  3.11.16  (uv-managed, available)                 ✓
```

**V6 resolved.** The "no Homebrew" blocker from Report #1 is real but no longer fatal: `uv` is
installed and manages its own Pythons, so Python tooling needs no Homebrew. The session's claim
that "you have `uv` and Python 3.12 installed" is **correct**.

**Not resolved:** ffmpeg is still absent. The session called it "a 5-minute fix (static binary,
no admin needed)". That is plausible and unproven — no binary has been installed, and nothing
downstream works until it is.

### 4.2 Present and usable

```
Adobe CC 2026 — After Effects, Photoshop, Premiere, Illustrator, Media Encoder
aerender      /Applications/Adobe After Effects 2026/aerender
node          v24.18.0,  npm 11.16.0
codex         /Applications/ChatGPT.app/Contents/Resources/codex
hardware      Apple M4 Pro — 14 CPU cores (10P/4E), 20 GPU cores, 48 GB, 427 Gi free
Remotion      not installed anywhere
```

### 4.3 The vision constants the skill is to be built on

Sourced by the session to Claude's vision docs:

- Claude takes **no native video input — frames only.**
- **Long edge > 1568px is silently downscaled** — 4K frames cost latency, buy nothing.
- **100 images/request (API), 20 on claude.ai, 32 MB cap.** Under ~200px/edge degrades.
- Therefore a 30s @ 30fps clip is **900 frames of which ~100 are viewable.** _Sampling strategy
  is eyesight._
- **Contact-sheet math:** 4×4 grid at 1568px = 392px cells, above the 200px floor → 16 frames
  per image. Two-tier eye: **grid to triage, full-res still to convict.** _(Arithmetic checked
  by this monitor: 1568/4 = 392 ✓; 30×30 = 900 ✓.)_
- Sample at composition boundaries (`from` / `durationInFrames`), not uniformly.

### 4.4 Local generation — the number that decides §6.1

Found by the session at 17:15, from a published benchmark:

|          |                                             |
| -------- | ------------------------------------------- |
| Hardware | M1 Max MacBook Pro, 64 GB                   |
| Model    | Wan 2.2 14B T2V, GGUF Q4_K_S                |
| Output   | 832×480, 33 frames ≈ **2 seconds** at 16fps |
| Time     | **82 minutes**                              |
| Also     | LTX-2 FP8 **failed on Metal**               |

### 4.5 The `/imagen` bar

`/imagen` works because it rests on a **measured** constraint: a 1,572,864 px area budget
"measured across 81 real outputs; the spread is 0.065%." That is the standard this skill has
to meet — find the real measured constraint and build on it, not on a hope. §6.4 is where it
currently falls short of that bar.

---

## 5. Verification ledger

| #   | Item                                   | State                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | **Remotion licence**                   | **Partly resolved.** Session cites the Remotion License FAQ: free for companies ≤3 people, and asserts _"you qualify."_ The rule is real; **the qualification was never checked.** wokeGod LLC's headcount, and whether contractors count, remain unverified. Narrow question, cheap to close, and it gates the whole Remotion branch. |
| V2  | Gemini free tier                       | Cited at ~1,500 req/day, native video input. Rate figure not re-verified. See §6.5 for the non-cash cost.                                                                                                                                                                                                                              |
| V3  | Local video gen on Apple Silicon       | **Data in hand (§4.4), conclusion not yet drawn.** See §6.1.                                                                                                                                                                                                                                                                           |
| V4  | Claude vision limits                   | Numbers obtained (§4.3). **But they are API limits, and the skill runs in Claude Code.** See §6.4.                                                                                                                                                                                                                                     |
| V5  | `after-effects-mcp` on AE 2026 / macOS | Still untested. AE 2026 clears its stated "AE 2022+" bar; nothing installed or run.                                                                                                                                                                                                                                                    |
| V6  | Install without Homebrew               | **RESOLVED** — `uv` + Python 3.12 present, verified independently (§4.1). ffmpeg itself still not installed.                                                                                                                                                                                                                           |
| V7  | Photoshop for in-between frames        | Two MCPs found (`adb-mcp`, `photoshop-mcp`). Whether either can actually tween is **still unresearched.** This part of the brief has not been answered.                                                                                                                                                                                |
| V8  | Comfy Desktop requirements             | In progress — macOS 13+, Apple Silicon, ~4.85 GB per install. Model weights not yet totalled.                                                                                                                                                                                                                                          |

---

## 6. Honesty ledger

### 6.1 The 82-minute benchmark contradicts "completely free" — and the session has not said so yet

§4.4 is the most consequential number found all session, and its consequence has not been
stated. **82 minutes for 2 seconds is ~41 minutes per second of video.** A 30-second piece is
roughly **20 hours** of continuous generation. A 5-minute piece is out of reach entirely.

The benchmark machine had a 32-core GPU against this machine's 20 — M4 is a newer architecture
with higher per-core throughput, so the honest read is _the same order of magnitude_, not
"faster" and not "twice as slow." Either way the unit is tens of minutes per two seconds.

**Caveat, raised 17:21, now LIVE.** The 82-minute figure is GGUF Wan 2.2 under ComfyUI on
Metal/MPS. This monitor flagged that **MLX is a different backend** and asked the deciding
question: does MLX cover video models at all, or only images? **Answer: it covers video.** The
session has found `baisampayans/ltx-mlx` — LTX-Video in pure MLX, no PyTorch at runtime — and
has said out loud that this **"may reverse what I told you last turn."**

**Resolved at 17:21 — the verdict was reversed. See §6.7.** Nothing in §6.1's timings should be
quoted for any purpose. The Wan/GGUF/MPS numbers describe the slowest available stack and are no
longer the operative estimate.

So: **local generation is free in cash and extremely expensive in wall-clock.** "Completely
free" survives only if the founder accepts that trade. It should be put to him as a trade,
with the number, and not folded into a plan as though it were solved. **Watch item: does the
session state this consequence, or quietly proceed to install ComfyUI?**

### 6.2 A hard deadline two days out was raised and has not been answered

At 17:13 the session surfaced absorbed context from another session:

> Today is Saturday, August 29. Monday is the 31st. That's two days. … The thing that goes live
> Monday is seven days of written devotionals: scripture modules, vocab, teaching, reflections,
> prayers, the Two-Minute Open on each day, narration, and wiring. **None of it is written.**

_(Weekday verified independently: 2026-08-29 is a Saturday.)_ It asked whether to switch to it.
**The founder did not answer.** The next message was _"How do I get local comfy?"_

This is not the video session's failure — it raised the flag correctly and plainly. It is
recorded here because it is exactly the thing this document exists to keep visible: **an
unanswered high-cost question is not a decision.** The Monday go-live and this research are
competing for the same two days.

### 6.3 The founder's question moved to layer 2 while layer 0 was still open

The agreed sequence is "small skill to pipeline," and the session's own proposal put **the eye**
first, explicitly "not video creation at all." Local ComfyUI is generation — layer 2. The
session followed the question without noting the jump. Following a direct question is right;
not naming the sequence change is the drift to watch.

### 6.4 The vision constants are API numbers being used to design a Claude Code skill

"100 images/request, 20 on claude.ai, 32 MB" are **API** limits. The skill will run in Claude
Code, where images arrive through the harness and the binding constraint is more likely the
context window and per-turn image handling. The contact-sheet design in §4.3 is built directly
on these numbers.

By the `/imagen` standard (§4.5) these are not yet measured facts — they are documented figures
from a different surface. **The skill should establish its real frame budget by measurement in
the harness it will actually run in**, the way `/imagen` measured 81 outputs. Until then the
4×4-grid design is a reasonable hypothesis, not a constant.

### 6.5 "Free" has acquired a non-cash price

The proposed second pair of eyes is **Gemini's free tier** watching whole clips for motion. Free
tiers are generally the ones whose data is usable for model improvement. Routing devotional
footage, scripts and unreleased artwork through a free consumer tier is an IP and governance
decision for this product, not merely a cost one. It has not been raised as such.

### 6.7 The verdict reversed in five minutes — the handling was right, the ground is thin

At 17:16: _"Do not architect the video pipeline around local diffusion on this laptop."_
At 17:21: _"On the MLX path the verdict flips: local video generation is viable on your machine."_

**How it was handled — well, and this should be said plainly.** The session:

- Retracted in its own words — _"I need to correct what I told you last turn"_ — and named the
  reason: it had benchmarked **the wrong stack**, Wan 2.2 GGUF on PyTorch MPS, "the slowest one
  available."
- **Graded its own new evidence as weaker than the evidence it overturned:** `ltx-mlx` has
  **1 star, one author, self-reported benchmarks**, versus a detailed third-party writeup for
  the 82-minute figure. It said to treat the new numbers as _"a strong hypothesis, not fact."_
- Killed the founder's article with data rather than opinion: `thoddnn/ComfyUI-MLX` **404**,
  `raysers/ComfyUI-MLX` last pushed **Oct 2024**, `CamilleHbp/Flux-MLX-ComfyUI` **1★ / Aug 2025**
  — and traced the article's "35–70% faster" claim back to a repo that no longer exists.
- Ruled out MiniMax-H3 on a hard number: staged loading peaks at **52 GB** against 48 GB of RAM.
- Proposed **measuring on the actual M4 Pro** rather than shipping a scaled estimate.

That last point is the `/imagen` standard (§4.5) applied correctly, and it is the right next move.

**What this monitor holds open anyway:**

1. **Two confident, opposite verdicts in five minutes.** Both were delivered with force. The
   honest read is that the evidence surface here is thin and fast-moving, and _no_ verdict on
   local generation — in either direction — should enter a plan until measured here. The
   session agrees; the risk is the founder acting on the 17:21 optimism before the measurement.
2. **The scaling method changed between the two turns.** At 17:16 it scaled by GPU cores _and_
   memory bandwidth (32/400 vs 20/273). At 17:21 it scaled by **cores only** — "76 GPU cores;
   you have 20. So roughly 3.5–4×." By bandwidth the ratio is ~2.9× (M3 Ultra ~800 GB/s vs
   273), by cores ~3.8×. So 3.5–4× is the conservative end and the estimate is defensible — but
   the method silently changed, and consistency is what makes such estimates trustworthy.
3. **"M3 Ultra, 76 GPU cores" is session-reported**, taken from the repo's README. Not
   independently checked by this monitor.
4. **Still nothing installed and nothing measured.** Every number on both sides of the reversal
   is someone else's, from someone else's machine.

### 6.8 The eye has not been touched, and that is now the biggest drift

_(Still true at 17:31, five founder messages in. The cost answer at 17:27 analysed the eye's
rate-limit economics in detail — the strongest thinking in the session — while the eye itself
remains unspecified and unbuilt.)_

The founder called layer 1 _"the first skill."_ The session's own synthesis called the judgment
layer _"your disruption. Not the pipeline — the eye,"_ and said local generative footage is
_"the slowest and least controllable part of the whole thing"_ which _"isn't needed for the eye
skill or for Remotion/AE motion graphics."_

Since 17:14, **100% of the session has been spent on local generative footage.** Q2 — spec the
eye — was offered at 17:13 and has not been answered across four founder messages. Q1, the
Monday go-live, is at roughly **two days** and also unanswered.

This is not a criticism of the session, which has answered what it was asked, accurately and
with unusual rigour. It is the drift this log exists to make visible: **the agreed sequence has
inverted, and nobody has said so.**

### 6.9 The cost answer — verified, and one item quietly got _less_ honest

Delivered 17:27. This monitor re-ran every number. **The arithmetic is correct throughout:**

| Claim                          | Check                                      |
| ------------------------------ | ------------------------------------------ |
| Image tokens = `(w×h)/750`     | matches Anthropic's documented formula ✓   |
| ~1,600 tok/image cap           | 1.15 MP ÷ 750 = 1,533 ✓                    |
| 100 frames @512px ≈ 35,000 tok | 512²/750 = 349.5 × 100 = **34,953** ✓      |
| 7 contact sheets ≈ 11,200 tok  | 112 ÷ 16 = 7 sheets × 1,600 = **11,200** ✓ |
| "~3× less budget"              | 34,953 ÷ 11,200 = **3.12** ✓               |
| 10-iteration loop ≈ $1.75      | 350,000 tok × $5/M = **$1.75** ✓           |

**The best analytical work of the session** is in this answer: on a subscription, vision costs
**$0 in dollars and real money in rate-limit budget**, and the eye is the pipeline's largest
consumer of it. That reframing turns the two-tier grid/still design from a nicety into the thing
that decides whether a video can be reviewed three times or ten. It is `/imagen`-style reasoning
— a measured constraint driving the design — applied to the right constraint.

**Credit where it is due on the brief.** The founder named After Effects and Photoshop as core
tools. The session told him they cannot be in the free core: _"if 'completely free' means the
pipeline is free for anyone to run, After Effects and Photoshop are the one paid dependency…
otherwise the thing you're building can't actually be given away."_ That is two of the five
named tools demoted to optional, said plainly, unprompted.

**Three things to press:**

1. **§6.5 has regressed, not resolved.** The Gemini free tier is now listed in a **"$0 stack"**
   table as flatly free, with no caveat. This monitor raised at 17:18 that free tiers are
   generally the ones whose data feeds model improvement, and that routing devotional footage,
   scripts and unreleased artwork through one is an **IP and governance** decision. That has
   still never been raised in the session — and it is now harder to catch, because it sits in a
   table of things marked $0. **This is the one item on which the cost answer is incomplete.**
2. **"Same information, ~3× less budget" is slightly generous.** A 4×4 sheet at a 1568px long
   edge gives **392px cells** against **512px** individual frames — a **0.77× linear** drop.
   Above the stated 200px degradation floor, so the design holds; but it is _comparable_
   information, not the same. The 3× saving is real; the "same" is not.
3. **"Remotion — free ≤3 people, you're 1"** — the headcount is still **assumed**, now stated as
   fact twice. wokeGod LLC's actual size, and whether contractors count under Remotion's terms,
   has never been asked. Cheapest open item in the document.

_Not independently verified by this monitor:_ Adobe CC at $54.99/$69.99, Remotion at $25/seat or
$0.01/render with a $100/mo minimum, Gemini's 1,500 req/day, and Opus 5 at $5/M in / $25/M out
(sourced from the bundled `claude-api` skill, which is authoritative for pricing).

### 6.10 ✅ WATCH ITEM PASSED — and the session corrected its own number _upward_

At 17:30 the founder said _"I dont have a ton of space on here."_ This monitor measured
independently: **426 GiB available / 457.4 GB container free, 53% full.**

**The session's answer at 17:31 did the right thing on every count.** It opened _"You have more
room than you think — I measured it: 426 GB free"_ and closed _"Space is not your constraint
here."_ It did not trim the recommendation, propose a smaller model, or hedge the plan around a
limit that does not exist. Watch item closed, passed.

**It also went further than this monitor did, and caught a real error — its own.** Asked for
exact figures, it pulled them from HuggingFace rather than reusing its estimate, and found a
**19.05 GB T5-XXL text encoder** that every earlier number had omitted:

| File                          | Exact size                          |
| ----------------------------- | ----------------------------------- |
| T5-XXL text encoder, 4 shards | **19.05 GB** ← previously uncounted |
| LTX 2B distilled 0.9.8        | 6.34 GB                             |
| `ltx-mlx` package             | ~200 MB                             |
| **Rung 3 total**              | **~25.6 GB** (was estimated 5.9 GB) |

**Correction to this monitor's own §6.10 table (Report #5a).** It priced the first video install
at "5.9 GB / 1.3% of free space," taking the session's then-current estimate. The correct figure
is **25.6 GB, or 5.6% of free space.** The conclusion is unchanged — space is not the constraint
— but the number was wrong and came from not checking a figure this document was passing along.

**Two traps it surfaced that cut against the obvious choice:**

- **Do not take the fp8 weights.** LTX 2B fp8 is 4.46 GB vs 6.34, and 13B fp8 is 15.69 vs 28.58.
  They **crash on Metal** (`Undefined type Float8_e4m3fn`). _The smaller download is the one that
  does not run._
- **Use `ltx-mlx`, not ComfyUI**, for the same models: ComfyUI drags in ~5 GB of app plus ~8 GB
  of torch/diffusers/transformers and runs slower. Saves ~13 GB and runs 3.4× faster.

### 6.11 ✅ The §6.8 drift is being corrected — by the session, not the founder

The strongest thing in the 17:31 answer is that it did not answer only the question asked. It
reframed the whole stack as a **ladder you can stop climbing**:

| Rung                  | What you get                                          | Disk                     |
| --------------------- | ----------------------------------------------------- | ------------------------ |
| **1. The eye skill**  | frame extraction, contact sheets, visual verification | **~80 MB** (ffmpeg only) |
| 2. + Remotion         | programmatic video you can render and check           | ~1 GB                    |
| 3. + local video gen  | LTX text-to-video on-device                           | ~25.6 GB                 |
| 4. + 13B quality tier | sharper, ~3.5 min/clip                                | +28.6 GB                 |

— and then said: **"The thing you actually asked me to build first costs 80 MB. Everything
expensive is optional and comes later."** Recommendation: _"Install rung 1 only — 80 MB. Build
the eye."_

That is the §6.8 drift, named and reversed **by the session itself**, without this monitor's
report reaching it and without the founder asking. Five founder messages went to layer-2
generation; the session has now walked it back to layer 1 and made the case in disk terms the
founder can act on.

It also tied the recommendation to the actual product: _"Given your brand style is riso/halftone
motion graphics rather than photoreal footage, I suspect rung 2 gets you most of the way and
rung 3 stays optional."_ That is consistent with the project's documented style spec, and it is
the first time in the session that the video plan has been reasoned about from Euangelion's
brand rather than from tooling.

**§6.8 remains open only on the founder's side.** The eye is still unbuilt, and Q2/Q7 are still
unanswered — but the session is no longer the one drifting.

### 6.12 ⚠️ ACTIVE RISK — the 28 GB is not mystery cruft, it is the voice prototype

At 20:10 the session found 28 GB in `~/.cache/huggingface` and described it as _"from something
you probably don't remember installing."_ **The 28 GB is real — this monitor confirmed it
independently.** The characterisation is not. This monitor listed the cache:

| Model                               | Size   | What it is    |
| ----------------------------------- | ------ | ------------- |
| `HumeAI/tada-codec`                 | 10 GB  | speech codec  |
| `mlx-community/Qwen3-TTS-12Hz-1.7B` | 4.2 GB | TTS           |
| `ResembleAI/chatterbox-turbo`       | 3.8 GB | voice cloning |
| `HumeAI/tada-1b`                    | 3.7 GB | TTS           |
| `ResembleAI/chatterbox`             | 3.0 GB | voice cloning |
| `openai/whisper-large-v3-turbo`     | 1.5 GB | transcription |
| `YatharthS/LuxTTS`                  | 1.1 GB | TTS           |
| `hexgrad/Kokoro-82M`                | 317 MB | TTS           |
| `openai/whisper-base`               | 281 MB | transcription |

**Every significant item is text-to-speech, voice cloning, or transcription.** That is the
Euangelion narration stack, and its project is still on disk:
`external/euangelion/euangelion-voice-prototype`. It ties directly to the devotional Audio
Edition work and to the Whisper transcription used to check shipped narration.

**Why this matters right now.** The founder's question was _how easy is it to get rid of this
stuff._ He has just been told, in the same breath, that 28 GB he doesn't remember installing is
sitting in a cache. **If he acts on that framing, he deletes the voice prototype's models** —
including `whisper-large-v3-turbo`, which is what the narration QA depends on.

The session's _instinct_ was right and worth crediting: asked about uninstalling, it went and
audited what was already on disk rather than answering in the abstract, and it found a real
28 GB. It was still inspecting the contents when this was written, so it may well identify them
correctly. **Recorded here because the guess was published before the check, and the guess
points at a destructive action.**

**Standing recommendation from this monitor: do not clear `~/.cache/huggingface` wholesale.**
The LTX models, if ever installed, can be contained separately — which is exactly the containment
question the founder actually asked.

### 6.13 The clock, restated

It is now **Saturday 20:13 EDT**. The Monday go-live flagged at 17:13 — seven days of devotionals
of which _"None of it is written"_ — is roughly **28 hours away** if it lands Monday morning.

**Q1 has been open for three hours and eleven minutes and remains unanswered.** Every founder
message in that window has been about video tooling. This monitor takes no view on the right
call; it records that the call has not been made.

### 6.6 Small overreach

"Claude has no native video input. **Ever.**" — true today, stated as a permanent law. Minor,
but this is a document about keeping claims the right size.

---

## 7. Open, awaiting the founder

| #   | Question                                                                              | Raised | Answered |
| --- | ------------------------------------------------------------------------------------- | ------ | -------- |
| Q1  | Switch to the **Monday Aug 31 go-live** instead of this research?                     | 17:13  | **No**   |
| Q2  | Run brainstorming and **spec layer 1 (the eye)** now?                                 | 17:13  | **No**   |
| Q3  | Publish the research to the **pitch site** as a proper page?                          | 17:13  | **No**   |
| Q4  | Push `7c62e38b` (another session's commit on `feat/seeking-help-georgia`)?            | 17:13  | **No**   |
| Q5  | Run ComfyUI install path B now and verify it serves on `:8188`?                       | 17:16  | **No**   |
| Q6  | Install `ltx-mlx` + the 2B model and **benchmark on the real M4 Pro**? (now ~25.6 GB) | 17:21  | **No**   |
| Q7  | **Install ffmpeg only (~80 MB) and stop there — i.e. start the eye?**                 | 17:31  | **No**   |

**Q1 is the expensive one — roughly a two-day fuse.** Five founder messages have now arrived
since it was raised. None answered Q1 or Q2.

**Q7 is now the one that matters.** It is 80 MB, it is the layer the founder called "the first
skill," and it is the only open question that starts the thing actually asked for.

**Q6 unblocks the generation numbers.** Every generation number in this document, on
both sides of the reversal, comes from someone else's machine. One ~6 GB download and one
benchmark run replaces all of them with a measured fact — the `/imagen` standard. Until that
exists, local video generation has **no verified position** in this plan.

---

## 8. This document's own log

- **Report #7 — 20:13 EDT.** Session found **28 GB in `~/.cache/huggingface`** (confirmed
  independently) but framed it as _"something you probably don't remember installing."_ This
  monitor inventoried it: it is **the voice/TTS/Whisper narration stack**, belonging to
  `euangelion-voice-prototype`, still on disk. Added §6.12 as an **active risk** — the founder
  asked how to delete things and was handed a wrong provenance for 28 GB. Added §6.13: Monday
  go-live now ~28 hours out, Q1 unanswered for 3h11m.
- **Report #6 — 17:36 EDT.** **§6.10 PASSED** — session told the founder plainly that the disk
  premise was wrong ("Space is not your constraint here"), and corrected its **own** estimate
  upward on exact HuggingFace figures, finding a 19.05 GB T5-XXL encoder every prior number had
  omitted (rung 3 = 25.6 GB, not 5.9). **This monitor corrected its own §6.10 table accordingly**
  — it had passed along the stale 5.9 GB figure without checking it. Added §6.11: **the §6.8
  drift has been reversed by the session itself** via a stop-anywhere rung ladder — "the thing
  you actually asked me to build first costs 80 MB" — and reasoned from the riso/halftone brand
  for the first time. fp8 trap noted: the smaller download is the one that crashes on Metal.
  Q7 added and is now the question that matters.
- **Report #5a (superseded) — 17:33 EDT.** Founder asserted low disk space. **Independently measured: 426 GiB
  available / 457.4 GB container free, 53% full.** The premise is wrong by two orders of
  magnitude against a 5.9 GB first install. Added §6.10 as an open watch item — does the session
  correct the founder plainly, or accommodate a constraint that does not exist?
- **Report #5 — 17:31 EDT.** Cost answer delivered and **independently re-verified — every
  number correct** (token formula, 35k vs 11.2k, 3.12×, $1.75). Added §6.9. Best analytical work
  of the session: vision costs rate-limit budget, not dollars, and the eye is the biggest
  consumer — which is what justifies the two-tier design. Session told the founder AE and PS
  cannot be in the free core. Three presses: **§6.5 regressed** (Gemini now listed as flatly $0
  with the data-usage question still never raised), "same information" overstates a 392px-vs-512px
  drop, and Remotion "you're 1" is still assumed. Q1 unanswered across five messages.
- **Report #4a (superseded) — 17:28 EDT.** Founder asked _"what are costs?"_ — the first direct test of the
  "completely free" constraint since it was set at 17:09. Session declined to quote pricing from
  memory and went for live figures, pre-announcing that the constraint "has three leaks in it."
  Substance not yet delivered. This is the question §6.1/§6.5/V1 have all been waiting on.
- **Report #4 (superseded) — 17:26 EDT.** §6.1's verdict **reversed by the session at 17:21** after finding
  `ltx-mlx` (pure MLX LTX-Video). Added §6.7 — the reversal was handled well (explicit retraction,
  self-graded weaker evidence, article's stack killed with repo data, measurement proposed) with
  four things held open: two opposite confident verdicts in five minutes, a scaling method that
  silently changed from cores+bandwidth to cores-only, unverified M3 Ultra baseline, and nothing
  yet measured here. Added §6.8 — **the eye has had zero work while 100% of the session since
  17:14 went to generative footage**, the layer the session itself ranked last. Q6 added.
- **Report #3 (superseded) — 17:23 EDT.** §6.1 watch item **CLOSED — passed.** The session delivered a verdict
  against local video diffusion, with its own hardware check (M4 Pro 20 cores / 273 GB/s vs the
  benchmark's 32 / 400) and a "do not architect around this" recommendation, while salvaging
  local Comfy for images. Also: it refused to paraphrase a 403'd article and instead checked the
  repos' pulse via `gh` (one is 404, one has 1 star). Now mid-self-correction — `ltx-mlx` found,
  reversal announced before the outcome is known. Q5 added. **Note: this monitor's own file is
  now surfacing as a loose end in both sessions' stop hooks — see §9.**
- **Report #2a (superseded) — 17:21 EDT.** Founder raised ComfyUI + MLX. Added a caveat to §6.1 qualifying
  this monitor's own 82-minute claim: that benchmark is Metal/MPS, MLX is a different backend,
  and the deciding question is whether MLX covers video models at all or only image models.
  Process record extended; Q1/Q2 still unanswered across three founder messages.
- **Report #2 — 17:18 EDT.** Research phase delivered. V6 resolved and independently
  re-verified (`uv` 0.12.5 + Python 3.12.14 present; ffmpeg still absent). V1 downgraded to
  _partly_ resolved — the ≤3-people rule is real, "you qualify" is unchecked. Added §6.1 (the
  82-min benchmark vs "completely free"), §6.2 (unanswered Monday go-live), §6.3 (layer-2
  question during layer 0), §6.4 (API constants vs harness constants), §6.5 (Gemini free-tier
  data cost). Contact-sheet and frame arithmetic checked and correct. Four open founder
  questions logged, none answered.
- **Report #1 — 17:14 EDT.** Baseline. Subject at turn 49, mid-research. Brief captured
  verbatim; toolchain state measured; 7 open verifications, 5-item honesty ledger.

---

## 9. Friction this monitor is causing

At 17:16 the subject session found `docs/run/VIDEO-PIPELINE-SESSION-MONITOR.md` in its working
tree, correctly identified it as another session's file, and described it as _"a monitoring
session writing into the shared tree — the parallel-session hazard exactly."_ That is a fair
call and it is worth recording against this monitor rather than quietly ignoring.

Concrete cost: this file now trips the `loose-ends` stop hook in **both** sessions, and the
subject session spent a turn investigating it.

Options, founder's call: leave it (visible, mildly noisy), move it outside the repo (no tree
noise, less discoverable), or track it properly. No action taken unilaterally.
