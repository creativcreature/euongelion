# Narration — rendering a finished series in the founder's voice

Everything here was learned building `he-cannot-deny-himself` (SA-043, F-086).
Read it before running any of it: most of the traps cost real money the first
time they were hit.

## Which voice

| Content                                            | Voice                         | Engine                 |
| -------------------------------------------------- | ----------------------------- | ---------------------- |
| Every NEW series, and anything the founder authors | **Chris James (THCA master)** | ElevenLabs `eleven_v3` |
| The back catalog (~500 existing devotionals)       | **am_michael**                | Kokoro, local          |

The split is economic and it holds: the whole catalog is 5.01M characters
against 691k credits a month, but a new devotional averages **9,487 characters**,
so the plan covers roughly **72 new devotionals a month** against a publishing
rate of about seven. New content in his voice is already paid for. Converting the
back catalog is not, and would buy little.

The founder's voice id lives in `euangelion-voice-prototype/el-voice-id.txt`.
The key lives in `.env.local` as `ELEVENLABS_API_KEY` and is never printed.

## When this runs

**After the text is final and approved, before the gates.** Not earlier: the
audio stores a fingerprint of the text it speaks, so any prose edit after
rendering invalidates the track and its chapter marks. Not later: the manifest
is a build input, so it must be in place before `npm run build`.

Under SA-031 the founder reviews live output and requests revisions after
deploy. That is fine — a revised day simply re-renders, and the resume is
content-addressed, so only the changed days cost anything.

## Rendered once, never again (SA-141, 2026-09-13)

Founder: _"I never want to re-render audio — the transcripts and planning to
create the final piece needs to be fully conceived and verified before running
so regeneration never has to occur."_ And: _"Do not change older devotionals.
This is just moving forward."_

So the order is: prove the script on text → show the cost → render once →
prove the audio from a transcript → score. `render_el_catalog.py` refuses a
slug that already has a manifest entry.

### Reading contract 2 (new tracks only)

`narration_extract.py` and `src/lib/audio/segments.ts` both take a `contract`.
Contract 1 is byte-for-byte what every track before 2026-09-13 speaks, so none
of them goes stale. Contract 2 adds:

- **Every list the page renders**, with the page's own labels read as sentences:
  "Step one. …", "See also: Tahor means clean.", "What I leave at the cross: …",
  extra reflection questions, comprehension lists. Contract 1 skipped all of
  them because the catch-all only reads strings — every exercise went unread.
- **Scripture citations in prose expanded** ("Romans, chapter fourteen, verse
  seventeen,"), with the comma a reader supplies when the sentence runs on. A
  verse with a leading zero ("8:07") is a duration, never a verse. "2 Maccabees"
  style numbered names become "Second …".
- **One segment per paragraph and per markdown list line**, each ending as a
  sentence, so a heading, reference or list item never runs into the next words.
- **Spoken lead-ins as sentences**: "The Hebrew word qadosh means holy…", "The
  voice behind today is John Bunyan, Bedfordshire, England, 1628 to 1688.",
  "Here is the answer."
- **Speech-only fixes** that never touch the page: `LORD` → Lord, initials
  ("C. H. Spurgeon") without sentence-ending stops, `schizo` → "skeezo".

The two twins must agree on every devotional in the catalogue for both
contracts. Check with a hash sweep (TS vs Python) after ANY change to either.

### Requests (contract 2)

At most ~900 characters, cut at paragraph breaks, and a long paragraph only at
sentence ends — never mid-sentence. A short lead (heading, reference) rides with
what follows. The note after a Bible reading starts its own request so the
listener hears where Scripture stops. A seam inside a paragraph gets a 0.25 s
breath; a paragraph seam gets the register pause.

### Before rendering

1. `preflight_narration.py <slugs> --out <dir>` — ALL PASS. Coverage, speakability,
   request plan, and the full script written out request by request.
2. A read-only proofreading agent reads every script file end to end for run-ons,
   fragments, labels that sound wrong aloud, unmatched quotes and pronunciation
   risks. Fix the content of the new days; re-run step 1.
3. Dry-run the cost and report it.

### After rendering

`verify_transcript.py <slugs>` (needs torch + transformers; run from a venv)
transcribes each request from the chunk cache with Whisper large-v3-turbo and
aligns it against the text sent. It fails a request that dropped 3+ consecutive
words, lost its ending, or ran at an implausible rate. Proved on a planted cut
ending and a planted dropped phrase before first use. **Use float32 on MPS**:
float16 returns "!" and generates to the token limit (17 minutes for a 2-minute
track). Whisper cannot judge transliterations, so those are listed, not failed.

**Read a FAIL before believing it (By the Heel, 2026-09-13).** Every flag on the
first real week was the transcriber, not the voice: whole-request Whisper skipped
parenthetical citations and list lines, and slices still misspell names
(Elazar ben Azariah, Bartholomäus Pur) and archaic spellings ("to-day"). Each
prose flag was then heard word for word by re-transcribing that one request in
7-second slices at three offsets. Do that for every flag before calling a phrase
missing; timing is a second witness (a real 50-word drop pulls a request far
below the day's median wpm).

## The two passes

### 1. Narration

```bash
# ALWAYS dry-run first. It prints the exact character cost and refuses to start
# if the budget will not cover the whole job.
python3 euangelion-voice-prototype/spec/render_el_catalog.py <slug-day-1> ... --dry-run
python3 euangelion-voice-prototype/spec/render_el_catalog.py <slug-day-1> ...
```

Per day this writes `public/audio/<slug>.m4a` and its manifest entry: duration,
words, voice, engine, bytes, `textHash`, and **chapters measured during the
render**. Roughly 8 minutes of wall clock per 25-minute devotional.

### 2. Score

```bash
python3 euangelion-voice-prototype/spec/produce.py <slug> euangelion-voice-prototype/PRODUCED-<slug>.m4a
```

Rebuilds the narration from the chunk cache — **no credits, no API** — and lays
the atmospheric score under it. The founder's standing direction: _"the on site
sound with my voice is great, but needs the music and ambiance upgrade."_ So the
narration passes through untouched; nothing in this pass processes the voice.

Copy the result over `public/audio/<slug>.m4a` and update `bytes` and `duration`
in the manifest.

## Why the score sounds the way it does

Reference: _Inspired by The Bible Experience_, founder-set.

- **The atmosphere lives in the gaps.** Pushing a bed up under a voice buys
  masking, not presence. The score sits back while he speaks and lifts +10 dB in
  the pauses. Duck attack 60 ms — faster than a consonant; release 1.9 s, so it
  swells rather than pumps.
- **Spotted, not looped.** `BED_BY_TYPE` in `produce.py` is the spotting sheet:
  the bed steps back for Scripture and comes up for the prayer, glided over 4 s.
  This is only possible because chapters give exact module start times.
- **Two layers at different loop periods.** One bed repeating is heard as a loop
  within two minutes; two offset (37 s apart, second 5 dB under) are heard as a
  score.
- **It arrives and leaves.** 6 s bloom in, 9 s taper out, raised-cosine — a
  linear fade is audible as a ramp.
- **Stereo, but only the bed is spread.** 11 ms Haas offset on the BED. Delaying
  the voice smears the words and collapses badly to mono on a phone speaker.

## Verify before shipping — all four, every day

1. **Duration drift under 0.5 s** against the manifest. Chapter marks are
   absolute times; drift moves every mark after it.
2. **`textHash` matches** `narration_extract.text_hash(dev)` — this is the
   machine check that the audio says what the page says.
3. **Chapters** start at 0, land inside runtime, strictly increasing.
4. **Under 25 MiB.** A hard Cloudflare Workers per-asset limit, not a plan
   limit — no tier raises it. At 128 kbps stereo a 25-minute day is ~23 MB, so
   that is the practical ceiling. Drop to 112 kbps if a day runs over.

`__tests__/narration-manifest-current.test.ts` asserts 1–4 across the catalog.

## Traps

**An ElevenLabs API key carries its own quota, independent of the account.**
Days 4–7 failed with repeated `HTTP 401` while the account held 641,765 credits
and `/v1/user` authenticated normally — the key was capped at 50,000. A bare
status code reads as a bad key; only the response BODY says `quota_exceeded`.
Always log the body.

**Never pay twice.** Chunks are cached by `(voice, model, settings, text)` in
`euangelion-voice-prototype/.el-chunk-cache`. A failed run resumes free. Before
that existed, one 401 discarded 13 already-paid chunks.

**`build_chapters.py` is for Kokoro tracks only.** It used to delete chapters on
any track it could not rebuild from a side manifest, and wiped 497 devotionals'
navigation in one unattended run. It now reports instead of deleting — keep it
that way. An unattended job must not be able to destroy work it does not
understand.

**Bump the service worker.** `CACHE_NAME` in `public/sw.js` and `SW_VERSION` in
`src/components/ServiceWorkerRegistration.tsx` must move together, or returning
listeners keep the old audio cached forever. They have shipped out of sync
before.

**Chunk at module boundaries.** `chunks()` never merges across modules, so each
module's start time is the exact sum of the durations before it. Billing is per
character, so the extra requests are free — and this is what makes chapters
measured rather than estimated.

**Do not spend without showing the cost first.** Dry-run, report the character
count and what remains, then render.

**Roman numerals get SPOKEN as numerals.** `he-cannot-deny-himself-day-1` shipped
saying _"chapter VIII"_ where the page says _"chapter eight"_. Anything the
engine can read as a symbol rather than a word — Roman numerals, `&`, `%`, `1st`,
verse ranges like `3–5` — must be normalised to spoken words before it reaches
the API. The page copy is not the script; the extraction is.

**A stale track survives a text edit unless something checks.** Day 1 above was
rendered before the numeral fix and simply stayed wrong through several deploys.
It was caught only because `build_chapters.py` refuses to emit timestamps when
re-extraction does not match the render — a guard against wrong marks that found
a stale audio file as a side effect. **When re-rendering after any prose change,
re-audit every day of the series, not just the one you edited**, and verify by
decoding the shipped `.m4a` and transcribing it — not by trusting the manifest.

**The manifest is client code.** It is bundled at build time, so chapters ship in
the JS. A chapter change therefore needs the service-worker bump like any shell
change, not just an asset re-upload.
