# R2 audio migration — live runbook

**Status: in progress.** Written so this can be resumed from a cold start after
a reboot or a lost context. Decision **SA-043**, feature **F-086**.

**The live site is not affected until the final step.** Everything before the
manifest flip is additive; audio keeps serving from `public/audio` throughout.

## Why

Two forcing reasons, neither of them cost:

1. **Cloudflare Workers caps static assets at 25 MiB per file.** It is a
   platform limit — no plan raises it — and `he-cannot-deny-himself-day-4` is
   already 23.3 MB.
2. **`public/audio` is ~2 GB inside git**, with only a third of it tracked. Git
   is not built for this; GitHub caps single files at 100 MB.

R2 removes both: no meaningful per-file limit, and audio leaves the repo and the
deploy bundle. Cost is ~$0 — the scored catalog lands near 3 GB against a 10 GB
free tier, and R2 charges **nothing for egress**, which is the right shape for
streaming. Even at 10,000 users the bill stays $0; reads only become billable
past roughly 30,000 active listeners.

## Progress

| Step                                 | State                            |
| ------------------------------------ | -------------------------------- |
| R2 enabled on the account            | done (founder, dashboard)        |
| Bucket `euangelion-audio` created    | done                             |
| Upload path verified                 | done — byte-identical round-trip |
| Score back catalog into staging      | **running**                      |
| Custom domain `audio.euangelion.app` | **blocked — needs zone ID**      |
| Bulk upload                          | not started                      |
| Manifest flip + deploy               | not started                      |

### Blocked on

The **zone ID** for `euangelion.app`. `wrangler.jsonc` refers to the zone by
_name_, so the ID is not in the repo. Founder can read it from the Cloudflare
dashboard: open `euangelion.app` → Overview → right sidebar → API → Zone ID.

Then:

```bash
npx wrangler r2 bucket domain add euangelion-audio \
  --domain audio.euangelion.app --zone-id <ZONE_ID> --min-tls 1.2
```

The `r2.dev` dev URL is the fallback but is rate-limited and explicitly not for
production — use the custom domain.

## Scoring (running now)

521 tracks scored into `euangelion-voice-prototype/scored/`, which is
**gitignored and outside the deploy**, so the live site is untouched while they
are produced.

```bash
# three workers, resumable — an existing output is skipped
for w in 0 1 2; do euangelion-voice-prototype/spec/score_all.sh $w 3 & done

# progress
ls euangelion-voice-prototype/scored/*.m4a | wc -l          # of 521
cat euangelion-voice-prototype/score-w*.log | grep -c FAIL
```

Roughly 6x realtime per worker; ~3–4 h across three. Output averages ~5 MB per
track, so the full scored catalog is ~3 GB.

**Trap already hit:** `produce.py --from-audio` writes a `.tmp.src.wav` decode.
It was missing from the cleanup list and 156 tracks left **4.3 GB** of stranded
decodes against 777 MB of real output. Fixed. If staging looks far larger than
`count x 5 MB`, check for `*.wav` leftovers and purge only those whose `.m4a`
already exists — the rest are in-flight.

## Remaining steps

### 1. Finish scoring, then verify each file

Per track: duration drift < 0.5 s against the manifest (chapter marks are
absolute — drift moves every one after it), file non-empty, decodes cleanly.

### 2. Upload

```bash
npx wrangler r2 object put euangelion-audio/<slug>.m4a \
  --file <path> --content-type audio/mp4 --remote
```

Upload **all 528**: the 7 founder-voice tracks from `public/audio/`, the 521
scored ones from `euangelion-voice-prototype/scored/`. Verify each round-trips
byte-identical before proceeding.

### 3. Flip the manifest — the only step that touches the live site

`src/data/audio-manifest.json` stores `src` per track (currently
`/audio/<slug>.m4a`). Point it at the custom domain, update `bytes` and
`duration` from the scored files, and set `mix: "scored-stereo-v1"`.

Do this **only after** every file is confirmed fetchable from R2. Then bump BOTH
service-worker constants together (`CACHE_NAME` in `public/sw.js`, `SW_VERSION`
in `src/components/ServiceWorkerRegistration.tsx`) or returning listeners keep
the old audio cached.

### 4. Deploy and verify

`npm run build && npm run deploy`, then hash-compare a sample of live tracks
against local. Keep `public/audio` in place until verified — it is the rollback:
reverting the manifest restores the current behaviour with no data movement.

### 5. Only afterwards

Consider removing audio from git and the deploy bundle. Not before the R2 path
has served real traffic.

## Related

- `docs/run/HANDOFF-2026-08-15-narration.md` — narration state, Voicebox traps
- `docs/decisions/VOICE-ROADMAP.md` — where the voice itself is going
- `.claude/skills/devo-go/references/narration.md` — the shipping pipeline
