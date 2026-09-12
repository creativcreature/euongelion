# Inline scripture citations are never expanded for speech

**Status: diagnosed, measured, NOT shipped.** Shipping needs a founder ruling,
because the fix invalidates 535 of 571 rendered tracks. The working fix is in
this document verbatim so it is not lost again — the previous copy died with a
scratchpad wipe on 3 Sep and had to be rediscovered.

## The defect

`expand_reference()` exists and is correct. It is applied in exactly one place,
in both twins:

- `euangelion-voice-prototype/spec/narration_extract.py:420`
- `src/lib/audio/segments.ts:473`

```python
if t == "scripture" and field == "reference":
    v = expand_reference(v)
```

So a citation is spoken properly **only** when it is the `reference` field of a
`scripture` module. Every citation inside prose — teaching body, insight,
bridge, takeaway, prayer — reaches the voice as raw digits and a colon.

## Measured scope

Counted over all 596 devotional JSONs, against the text `extract()` actually
hands the renderer (so these are citations that are *spoken*, not merely
present in the file):

| | |
| --- | --- |
| devotionals with a citation in spoken prose | **535** of 596 |
| segments affected | **2,304** |
| citation occurrences | **3,903** |
| — with a book name attached (`John 1:14`) | 3,124 |
| — bare `chapter:verse` (`(18:5)`) | 779 |

By register: teaching 3,764 · takeaway 64 · prayer 38 · reflection 24 ·
scripture 12 · title 1. It is overwhelmingly a teaching-prose defect.

## What it sounds like now — UNVERIFIED

I could not measure this. `faster_whisper` went with the scratchpad venv and
Voicebox was down, so there is no round-trip transcript of a rendered track to
prove which reading the engine chose. What is on the record is one earlier
measurement, on a single segment, with the gate's own scorer:

| spoken form | clarity | tail |
| --- | --- | --- |
| raw `16:25` | 0.82 | 0.50 |
| `sixteen twenty-five` | 0.91 | 0.50 |
| `chapter sixteen, verse twenty-five` | **1.00** | **1.00** |

A clarity of 0.82 means the transcript diverged from the text, which is evidence
of *a* speech difference — it is not proof the engine said something a listener
would call wrong. Two 22-second clips cut from already-rendered tracks sit in
`~/Documents/euangelion-voice-listen/` for exactly this question:

- `CITATION-1-exodus-40-34.wav` — `abiding-in-his-presence-day-3` at ~0:29,
  "…filled the tabernacle in Exodus 40:34-35…"
- `CITATION-2-john-15-1.wav` — `abiding-in-his-presence-day-1` at ~1:03,
  "…repeats this word eleven times in John 15:1-11…"

If the voice already says "Exodus forty thirty-four", there is no defect worth
98 hours of re-rendering and this document closes as a no-op.

## The fix, proved on text

Dry-run over the whole corpus: **3,904 citations expanded across 2,301 segments
in 535 devotionals, with zero false positives** (no match had a verse ≥ 60, the
tell for a time of day). `_NOTBOOK` is what stops `In 1:14` and `The 3:16`
being read as book names; Psalms are excluded because `expand_reference`
already speaks "Psalm twenty-three", not "Psalm, chapter twenty-three".

```python
_BOOK = r"(?:[123]\s+|I{1,3}\s+)?(?:[A-Z][a-z]+)(?:\s+(?:of\s+)?[A-Z][a-z]+)?"
_BOOKED = re.compile(rf"\b({_BOOK})\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?(?!\d)")
_BARE = re.compile(r"(?<![\w:])(\d+):(\d+)(?:\s*[-–]\s*(\d+))?(?!\s*[ap]\.?m\.?)(?![\d:])")

_NOTBOOK = {"The","A","An","In","At","On","And","But","For","This","That","His",
            "Her","Their","It","He","She","They","We","You","When","While",
            "Verse","Verses","Chapter","See","Compare","Read","Also","From",
            "Psalm","Psalms"}


def expand_in_prose(text):
    """Expand scripture citations that appear inside prose, not just in
    scripture.reference. Conservative by construction: a citation must carry a
    capitalised book name that is not an ordinary sentence-opening word, or be
    a bare chapter:verse that cannot be read as a clock time."""
    if not text or ":" not in text:
        return text

    def booked(m):
        book, ch, v1, v2 = m.group(1), m.group(2), m.group(3), m.group(4)
        if book.split()[0] in _NOTBOOK:
            return m.group(0)
        return expand_reference(f"{book} {ch}:{v1}" + (f"-{v2}" if v2 else ""))

    def bare(m):
        ch, v1, v2 = m.group(1), m.group(2), m.group(3)
        vs = (f"verses {num_to_words(v1)} to {num_to_words(v2)}"
              if v2 else f"verse {num_to_words(v1)}")
        return f"chapter {num_to_words(ch)}, {vs}"

    return _BARE.sub(bare, _BOOKED.sub(booked, text))
```

Call it from `push()` in `extract()`, after `to_speech()`. **It must land in
`src/lib/audio/segments.ts` in the same pass** — the two are strict twins and
`__tests__/narration-manifest-current.test.ts` recomputes the hash from the TS
side.

## Why it is not shipped

`text_hash()` is a fingerprint of everything a devotional says aloud, stored
beside each rendered track so a later run can tell the audio is stale. Changing
what is spoken changes the hash for all 535 affected devotionals, and three
things then fire at once:

1. `__tests__/narration-manifest-current.test.ts` fails for 535 slugs.
2. `scripts/check-devotional-consistency.mjs` fails — it is a `verify:*` gate,
   so **every commit in the repo is blocked** until the audio is re-rendered.
3. `render_catalog.py` re-renders those 535 tracks: **~98 of the 104.5 hours**
   of published audio. Chatterbox runs ~2× realtime with the verification gate,
   so that is on the order of **200 hours single-threaded**.

## The two decisions

**1. Is there a defect at all?** Listen to the two clips. If the current
reading is acceptable, close this.

**2. If there is — which spoken form?** The cost is identical either way.

| | `John 1:14` becomes | per citation | reads like |
| --- | --- | --- | --- |
| **A — full** | "John, chapter one, verse fourteen" | +4 words | a formal reading; right for an announced reference, heavy 3,764 times in body prose |
| **B — compact** | "John one fourteen" | +1 word | how a preacher says it in passing |

A is what `expand_reference` already does, so A is free to implement and B needs
a second, shorter formatter. Full form adds roughly 15,600 words corpus-wide —
about 11 seconds per affected track, which is not the expensive part. The
expensive part is the re-render, and that is the same bill for both.

## Sibling defect, same cause, not measured here

`expand_roman()` runs inside `to_speech()` and so *does* reach prose. Only
`expand_reference` was wired narrowly. Worth remembering if another
speech-normalising helper is added: the default should be "runs on all spoken
text", with a narrow application being the exception that needs a reason.
