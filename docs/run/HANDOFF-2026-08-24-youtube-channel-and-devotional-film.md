# HANDOFF — YouTube channel + devotional film

**Session:** youtube-launch · started 2026-08-20, continued 2026-08-24
**Two deliverables:** the `@ChrisXJames` channel plan, and _REKINDLED_, a long-form film
companion to the seven-day Rekindled series.
**Nothing is committed.** All work is in the working tree. `devotional-rekindled-video/`
is **untracked** — git has never seen it.

---

## 0. Read these first

| Doc                                                | What                                     |
| -------------------------------------------------- | ---------------------------------------- |
| `docs/CHRIS-X-JAMES-CHANNEL-SPEC.md`               | Channel build spec, YPP math, gates      |
| `docs/DEVOTIONAL-FILM-PROCESS.md`                  | Film pipeline, asset recipes, traps      |
| `docs/DEVOTIONAL-FILM-STORYBOARD.md`               | 64-shot storyboard, the directorial idea |
| `devotional-rekindled-video/src/series/SPEC.md`    | Build spec Codex works from              |
| `devotional-rekindled-video/src/series/metrics.ts` | Success gate — run it                    |

**Pitch site (founder rules here):**

- `/admin/pitches/chris-x-james-channel-plan` — 7 verdicts outstanding
- `/admin/pitches/chris-x-james-longform-system` — Episode 1 outline
- `/admin/pitches/rekindled-storyboard`
- `/admin/pitches/devotional-film-process`

---

## 1. State: the channel

**Nothing built. Awaiting seven founder verdicts** listed in the channel pitch.

Settled in conversation:

- ONE channel, `@ChrisXJames`, framed as a **personal studio** — Euangelion is one show on
  it and the destination it points to. Founder may spin Euangelion out later, using the
  personal channel as a feeder audience.
- No avatars. Three modes only: founder to camera, founder VO, founder's cloned voice
  (disclosed).
- Batch-one audience: the intellectually-exited seeker, then the one in the pit.
- Machine cuts first pass, founder approves.
- 2019 legacy videos stay up.

**The clock:** YPP needs 1,000 subs + 4,000 watch hours before **2027-02-01**, after which
it doubles to 8,000. Existing partners are grandfathered. Shorts watch time does NOT count.
Long-form is the only instrument.

**Founder's own channel data is the strongest evidence in the plan:** 10 journey/philosophy
videos averaged **21 views**; 2 unboxings hit **1,500 and 721**. Same face, same year.
Searchable door, personal payload.

---

## 2. State: the film

`devotional-rekindled-video/` — Remotion 4.0.513. Composition id **`Series`**.

**Renders at 1920×1080, matted 2.39:1, 7:39, 53 shots.** Two cuts exist; cut 2 is current.

```bash
cd devotional-rekindled-video
npx tsx src/series/metrics.ts        # scores the cut — currently 11/11
npx remotion still Series out/x.png --frame=90
npx remotion render Series out/REKINDLED-cut3.mp4 --log=error
```

### Content

Covers **all seven days**, not just day 2. Spine: _you are not the one keeping the fire lit._
The protagonist is the fire — each chapter is the same flame in a different state. Every
chapter transition is a flame-to-flame match cut. The film bookends on one frame.

### Assets on disk

```
public/day2/
  vo-series/      10 ElevenLabs segments, natural pace   ← current
  vo-series-raw/  same, pre-pacing
  vo-kokoro/      10 Voicebox Kokoro segments            ← REJECTED on quality
  score/          3 original baroque cues (ElevenLabs Music)
  plates/         13 Codex plates + 6 close-ups (check completion)
  devo/           3 day-2 riso plates from the devotional
  cycles/         3 contact sheets (superseded by motion/)
  motion/         4 Seedance clips + 1 Wan test
```

### Founder verdicts on the film so far

- Pacing: **"you kinda nailed the general pacing"** — keep it
- Cut 1: _"literally nothing happens"_ — fixed (see §4)
- Audio: **"terrible"** — unresolved, see §5
- Voicebox: **"sounds terrible"** — all 7 engines rejected
- Score: **overpowering the vocals** — ducking implemented, unverified
- Generated video: **"a waste of credits… could have been done with downloaded assets and
  After Effects"** — STOP generating; see §6

---

## 3. The success metric — this is the bar

`src/series/metrics.ts` scores the timeline against published retention research. Every
threshold cites its source; judgement calls are labelled as such so they can be argued with.

Founder ruling: **"Success measure is that it aligns to the research."**

Currently 11/11. It has already caught two real defects a human review missed (payoff
promise landing at 0:17 against a 15s bar; a bad silence proxy counting chapter cards as
dead air). **Run it after any timeline edit.**

---

## 4. Why cut 1 failed, and what fixed it

| Failure          | Cause                                              | Fix                                                                    |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Nothing happens  | One shot per narration segment — 27 shots / 10 min | Punch-ins (`focus` + scale into the SAME plate) → 53 shots, no new art |
| Flat             | Every plate a WIDE, zero close-ups                 | ≥30% closes; now 50%                                                   |
| Invisible motion | 1.00→1.05 over 90s                                 | Moves are committed or locked, nothing between                         |
| Blinking         | Every shot faded in/out through black              | Hard cuts; only explicit `black` shots touch black                     |
| Dead audio       | 0.85× time-stretch artifacting                     | Stretch removed; pace via edit                                         |

**The root cause was process, not craft:** cut 1 was an asset schedule (one plate per
narration row), never a storyboard. A director asks what the viewer sees shot by shot and
why this cuts to that. Do not skip that step again.

---

## 5. OPEN — the audio

**Unresolved and blocking.** The founder has rejected every synthetic option.

| Option                         | State                                             |
| ------------------------------ | ------------------------------------------------- |
| ElevenLabs clone, stretched    | Rejected — artifacting, my error                  |
| ElevenLabs clone, natural pace | In the current cut; founder still says "terrible" |
| Voicebox — all 7 engines       | Rejected                                          |
| **Founder records it**         | **Not yet tried. 1,266 words, one sitting.**      |

A/B file for comparison: `out/VOICE-AB-elevenlabs-then-kokoro.mp3`.

Also relevant: BibleProject uses **calm two-voice conversational narration**, not a lone
solemn narrator. Some of what reads as bad synthesis may be _register_ — a reverent
monologue is the hardest thing for a clone to carry. Worth testing a two-voice script.

---

## 6. Cost reality — measured, not assumed

Comfy Cloud: **credits and GPU time are one pool**, ~0.266 credits/GPU-second.
Founder's balance was **7,225 credits on a $35 plan** ≈ $0.00476/credit.

| Item                      | Cost                                                      |
| ------------------------- | --------------------------------------------------------- |
| Codex `image_gen`         | **£0** — ChatGPT subscription. 13+ plates made.           |
| Flux 2 Pro image          | 12.66 cr ≈ $0.06                                          |
| Seedance 2.0 Mini r2v, 5s | 115.73 cr ≈ **$0.55**                                     |
| Wan 2.2 14B, 5s           | ~47 cr ≈ $0.22 — but **cannot be prompt-steered via MCP** |
| ElevenLabs                | Pro, 456k chars left                                      |
| Gemini Omni / Veo 3.1     | On the key, **credits depleted**                          |

**FOUNDER RULING: stop generating video.** Smoke and flame are commodity elements —
Adobe CC (After Effects, Premiere, Media Encoder all installed) plus owned Artlist packs on
`/Volumes/SD X/Claude/Misc/Artlist Assets/` do the same job free. Generation is reserved
for the one case nothing else covers: **making the founder's own plate move.**

Current route being tested: **Gemini Omni in the browser**, driven by Claude in the Chrome
sidebar — included in the app subscription, unlike the API.

---

## 7. Traps — every one of these cost real time

1. **The billing feed is not a cost source.** It reports `gpu_seconds` and `credits_used` as
   separate event types. I called Wan free off a missing field. Only the workspace balance
   is authoritative.
2. **Describe the plate you feed r2v, and it animates the plate. Describe a generic scene
   and it invents one.** Same model, opposite fidelity. This is the single most useful
   generation finding of the session.
3. **Never render twice to the same filename.** A killed render + re-render + a background
   probe mid-mux produced a 1.3 GB file with 157 decode errors that played blank.
4. **`nohup` in a shell tool dies with its parent.** A render reported "complete" at 2,900
   of 17,493 frames.
5. **Verify by decoding, not file size.** A stale vertical file from another session sat at
   the expected path at the expected size.
6. **Mount narration outside the shot `Sequence`** or it clips to that shot.
7. **Screen-blend overlays need pure black backgrounds.** A cream ground renders as a
   visible box.
8. **ElevenLabs Music rejects composer names** — "Bach", "Zimmer" → 400 ToS. Describe the
   style instead.
9. **`codex exec -i file` swallows a positional prompt.** Pipe the prompt via stdin.
10. **`video_wan2_2_14B_i2v` cannot be prompt-controlled** through either documented
    override path. Image override on the top-level `LoadImage` (node 97) works.
11. **No `Math.random()` / `Date.now()`** in Remotion components — non-deterministic frames.

---

## 8. Delegation — what worked

Founder ruling: **use OpenAI/Codex as subagents to save Claude usage.**

The split that held: **Claude writes the spec and judges output; Codex produces.**

```bash
CX=/Applications/ChatGPT.app/Contents/Resources/codex
cat <<EOF | "$CX" exec -s danger-full-access --skip-git-repo-check -i ref1.png -i ref2.png -
<prompt>
EOF
```

**Always attach a style reference with `-i`.** Cold prompts drift off-brand immediately —
the first flame sheets came back as cartoon fire and were thrown away. Codex self-corrects
quality unprompted when given an anchor.

---

## 9. Next actions

1. **Founder:** rule the seven channel verdicts; rule the audio option.
2. **Audio:** try a founder-recorded read and/or a two-voice script.
3. **Motion:** swap the generated loops for owned/stock elements on black, screen-blended.
   One-line source change in `Series.tsx`.
4. **Film:** crop the flame loop's paper border (~6%); wire `motion/` clips in place of the
   contact-sheet cycles; re-render; re-run metrics.
5. **Encode:** current master is ~1.2 GB. Needs a compression pass before upload.
6. **Git:** decide ownership of `devotional-rekindled-video/` — untracked, and a parallel
   session has been editing `Short.tsx`.
