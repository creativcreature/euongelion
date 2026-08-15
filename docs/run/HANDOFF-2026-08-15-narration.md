# Handoff — narration (2026-08-15). Written to survive compaction.

Read this first if context was lost. Decision id **SA-043**, feature **F-086**.

## 1. Shipped and live — do not redo

`he-cannot-deny-himself`, all seven days, in the founder's cloned voice with the
atmospheric score. Live on `euangelion.app`, verified byte-identical.

| Day | Length   | Pace    | Chapters | Size    |
| --- | -------- | ------- | -------- | ------- |
| 1   | 21.9 min | 162 wpm | 23       | 19.8 MB |
| 2   | 23.1 min | 160 wpm | 23       | 21.0 MB |
| 3   | 24.2 min | 160 wpm | 23       | 22.0 MB |
| 4   | 25.7 min | 154 wpm | 23       | 23.3 MB |
| 5   | 23.9 min | 163 wpm | 24       | 21.6 MB |
| 6   | 8.6 min  | 158 wpm | 10       | 7.8 MB  |
| 7   | 2.5 min  | 160 wpm | 5        | 2.3 MB  |

Commits: `03802576` (voice), `2ce35ab1` (score), `7e051654` (devo-go skill).

**ElevenLabs credits: ~570,000 of 691,072 remaining.** Nothing has been spent
since the score pass, which rebuilt from cache for free.

## 2. Running right now

Three supervised shards re-rendering the back catalog in `am_michael`, carrying
the reading-contract fixes. **431 of 527 remaining** at time of writing.

```bash
# each shard owns one port and one dedicated server
euangelion-voice-prototype/spec/supervise_shard.sh <shard> <total> <port>
#   shard 0 -> 17494,  shard 1 -> 17495,  shard 2 -> 17496
# logs: euangelion-voice-prototype/shard<N>-<port>.log
```

To check progress:

```bash
python3 -c "import sys;sys.path.insert(0,'euangelion-voice-prototype/spec');import render_catalog as rc;print(len(rc.work_list()))"
```

When it reaches 0: run `build_chapters.py`, then
`npx vitest run __tests__/narration-manifest-current.test.ts`, then commit and
deploy with a service-worker bump.

## 3. Voicebox — root cause, fully diagnosed

**It is not a quota.** There is no quota or licence table in its schema.

Its MLX/Metal backend throws when it cannot obtain a command encoder, nothing
catches it, and the process calls `abort()` — SIGABRT, `abort() called`, faulting
in `mlx::core::metal::get_command_encoder`. The whole server dies, taking the API
socket with it, and any in-flight job is stranded in `generating` forever with
the CPU idle. Crash reports land in `~/Library/Logs/DiagnosticReports/`.

Trigger is **concurrency inside one process**. The qwen 1.7B clone test recorded
`"Generation orphaned by worker"` at 02:06 and every job after it hung.

Two things that wasted hours and should not be repeated:

- **Quitting the app does not stop the server.** `pgrep` showed 2 processes
  alive afterwards, and `open -a Voicebox` re-focused the broken instance instead
  of starting a new one. Kill with `pkill -9 -f voicebox-server` and confirm
  `lsof -ti tcp:<port>` is empty before concluding anything about a "restart".
- **Never point the qwen engine at this server.** It is what took it down, the
  founder had already rejected that voice path, and it cannot reach the quality
  bar anyway.

**The parallelism finding, measured properly.** Compare wall-seconds per
AUDIO-second, never per item — devotionals run 2.5 to 25 minutes, so per-item
timings compare nothing. (I got this wrong once and reverted a correct decision.)

```
single server:  4.40x realtime
under 3 shards: 2.80x realtime each = 64% of solo speed
3 x 0.64      = 1.91x total throughput   -> parallelism nearly doubles output
```

Separate PROCESSES each hold their own Metal context and coexist; threads inside
one process do not. `voicebox-server` accepts `--port` and `--data-dir`, and
`VOICEBOX_API` selects which server a renderer talks to.

## 4. What the audio pipeline now does

Full detail: `.claude/skills/devo-go/references/narration.md` (Phase 10 of
`/devo-go`).

- **Founder's voice** (ElevenLabs `eleven_v3`, id in
  `euangelion-voice-prototype/el-voice-id.txt`) for NEW series only. Back catalog
  stays on `am_michael`. A new devotional averages 9,487 characters against 691k
  credits/month, so new content is already paid for; the whole catalog would be
  5.01M characters.
- **Never spend without a dry-run.** `render_el_catalog.py <slugs> --dry-run`
  prints the cost and refuses to start if the budget will not cover the job.
- **Chunks are cached** by (voice, model, settings, text) in
  `.el-chunk-cache`, so a failed run resumes free and the score pass costs
  nothing.
- **The narration is never processed.** Founder ruling: the voice is right as
  rendered; the score goes underneath it.
- **The score** (`produce.py`): sits back under speech, lifts +10 dB in the gaps
  where the atmosphere actually lives; spotted per module type so it steps back
  for Scripture and comes up for prayer; two layers at different loop periods;
  6 s bloom in, 9 s taper out; stereo 128 kbps with the Haas spread on the BED
  only — delaying the voice smears words and collapses to mono badly.

## 5. Reading-contract fixes (why the back catalog is re-rendering)

| Fixed                                  | Scale                                   |
| -------------------------------------- | --------------------------------------- |
| Section headings unspoken              | 2,242 across 526 devotionals            |
| Subtitle dropped from the opening      | 77 days                                 |
| Pull quotes read twice                 | 66 modules, all verbatim duplicates     |
| Greek Extended glyphs spoken as glyphs | 49 across 11 devotionals                |
| One-word title dropped                 | `standing-strong-day-7` ("Contentment") |

Renderer (`narration_extract.py`) and reader (`src/lib/audio/segments.ts`) had
drifted on **103 of 533 devotionals**; they now agree on all 533 (921,909 words
each), and the reader reproduces the renderer's SHA-1 of the spoken text. Guarded
by `__tests__/narration-reading-contract.test.ts` and
`__tests__/narration-manifest-current.test.ts`.

## 6. Open items

1. **Back catalog re-render** — running, ~8.6 h from start.
2. **Score Michael's tracks** — needs NO re-render; his files are already dry
   narration, which is what `produce.py` takes as input. Do it AFTER the
   re-render, or it gets scored twice.
3. **`public/audio` is 2.0 GB inside git.** Cloudflare caps assets at 25 MiB per
   file and no plan raises it — it is a platform limit. R2 is the fix: no
   meaningful size cap, no egress fees, roughly $0.015/GB-month (~3 cents for
   the current 2 GB). Founder has been told; decision outstanding.
4. **Narration options (voice choice per reader)** — manifest already carries a
   `voice` field; would become a small set of tracks per devotional.

## 7. Traps that cost time today

- `build_chapters.py` used to DELETE chapters on any track it could not rebuild,
  and wiped 497 devotionals' navigation in one unattended run. It now reports
  and never deletes. An unattended job must not destroy work it does not
  understand.
- An ElevenLabs API key carries its own quota independent of the account.
  Exhausting it returns `HTTP 401`, which reads as a bad key — only the response
  BODY says `quota_exceeded`. Always log the body.
- `CACHE_NAME` in `public/sw.js` and `SW_VERSION` in
  `ServiceWorkerRegistration.tsx` must move together; they shipped out of sync
  (v69/v67) and that breaks update detection.
- Parallel sessions share this working tree and the git index. Stage by explicit
  file list; `git commit -- <paths>` commits only those paths. New files need
  `git add -N` first.
