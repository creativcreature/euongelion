#!/usr/bin/env python3
"""Euangelion narration renderer — Chatterbox Turbo, the founder's own voice.

WHY THIS ENGINE
---------------
Chatterbox Turbo runs locally through Voicebox and costs nothing. The same
catalog through ElevenLabs is 5,100,180 characters — about $842 to render once,
$600-800 of that for `bible-365` alone (3,662,125 chars) — and every re-render
after an edit costs it again. Chatterbox is MIT licensed, so commercial use is
fine, and the 3.8 GB model is already on this machine.

The engine string is exactly "chatterbox_turbo". Plain "chatterbox" returns
HTTP 422, so the payload surface is not something to guess at: this renderer
sends the four fields that are known to work and nothing else.

WHY THE REFERENCE PROFILE IS THE PACING CONTROL
-----------------------------------------------
This is ZERO-SHOT cloning. Output prosody follows the reference audio, so pace
is chosen when you choose the profile, not afterwards. Measured on this
machine, one identical sentence through four references of the founder's voice:

  reference profile              inclusive pace
  James — THCA master (interview)    214 wpm
  James — Channel (measured)         196 wpm
  James — Founder Voice              188 wpm
  James — Channel (single-take)      170 wpm   ← default

Professional audiobook narration is 150-170 wpm. Reference selection is worth
44 wpm — more than any other lever here — and the single-take channel set is
the only one that lands in the band natively. Time-stretching is the fallback
if a future reference misses; it is not the plan, because 1.35x WSOLA is
audible and the clone path was abandoned once already for needing it.

So the renderer prints measured pace per segment, an early verdict after the
first five, and an inclusive figure at the end. A bad reference is meant to be
obvious in the first thirty seconds of the run, not at the end of an hour.

WHY EVERY SEGMENT IS TRANSCRIBED BACK
--------------------------------------
Chatterbox is 94-97% verbatim, NOT 100%. It drops words nondeterministically
and long inputs sometimes stop early. That is the whole reason this file
exists, and it is why `render_founder_el.py` is not the model to copy: that
renderer verifies nothing, which is how `he-cannot-deny-himself-day-4` shipped
restarting a sentence and cutting mid-phrase with nobody noticing. `textHash`
could not catch it either — it fingerprints the EXTRACTION, not what was said.

Four detectors run on every take, because each catches a defect the others
miss:

  1. phonetic clarity  — the Soundex/ASR-confusion gate from render_v2, which
                         scores dropped and misread words. Denominator is the
                         reference, so a drop always costs. Paired with an
                         ABSOLUTE missing-word ceiling (see below).
  2. tail intact       — clarity alone cannot catch the day-4 defect: five
                         missing words at the end of a 400-word segment still
                         scores 0.99. The last words are checked separately.
  3. pace envelope     — reference words over MEASURED duration. If the audio
                         stops early the figure spikes, so this catches
                         truncation without asking the ASR anything. Below
                         CHECK_MIN_WORDS a wpm figure is noise, so short parts
                         get a duration FLOOR instead — not nothing, which is
                         what an earlier revision of this file gave them.
  4. duplication ratio — a restart or a loop ADDS words, and clarity is blind
                         to insertions (matched is capped at the reference
                         length). Transcript length ratio catches it, gated by
                         an absolute excess floor so Whisper's own trailing
                         boilerplate cannot trip it.

WHAT THE GATE ACTUALLY GUARANTEES — the honest version
-------------------------------------------------------
It does NOT guarantee a take is word-perfect, and an earlier revision of this
docstring claimed it did. `clarity` is a RATIO, so on its own its tolerance
grows with the part. Measured with `evaluate()` at CLARITY_MIN = 0.97, words
that could go missing mid-phrase with every detector reporting clean:

  ≤30 words → 0    45-60 words → 1    90 words → 2    450 words → 30

i.e. the allowance was largest exactly where truncation risk is highest, and
unbounded in `--max-words`. DROP_MAX bounds it: no take may be missing more
than DROP_MAX word-equivalents after phonetic folding, at ANY length. At the
default 90-word ceiling that is the same 2 words the ratio already allowed, so
the default behaviour is unchanged and the retry budget is unaffected; what it
buys is that raising `--max-words` can no longer quietly buy tolerance. Set
`--max-dropped 0` for a zero-tolerance run, and expect retries: the ASR round
trip cannot prove a perfect reading, only fail to disprove one.

A take that fails any detector is deleted and re-rendered. Because the engine
is nondeterministic, a bare re-render is already a different sample — there is
no seed hunting here, and no unverified fields in the payload. If no attempt
clears the gate, the run STOPS and prints the diff.

WHAT IT DELIBERATELY DOES NOT DO
--------------------------------
No `--publish`. It never writes `public/audio/` or `src/data/audio-manifest.json`,
and it refuses `euangelion-voice-prototype/renders/` too — that directory holds
543 live Kokoro side manifests, and `<slug>.wav` there would silently overwrite
`<slug>.manifest.json`, permanently disabling chapter rebuild for that slug.
It writes the WAV, an M4A beside it, and a sidecar `.manifest.json`. Publishing
is a separate, later step so that a verified render and a catalog mutation are
never the same command.

The sidecar is written LAST, after whole-track verification and encoding, and
it records what those checks found. A run that fails any of them exits non-zero
with `"verified": false` — wrappers like `render_catalog.py` gate on the return
code, so a check that could only print a warning was not a check.

Usage:
  python3 render_chatterbox.py <devotional.json> <out.wav>
      [--profile <id|name substring>]   default: James — Channel (single-take)
      [--limit N] [--max-words 90] [--attempts 4] [--clarity-min 0.97]
      [--max-dropped 2]
      [--survey]        keep going after an unrecoverable segment, report all
      [--verify-track]  re-transcribe the finished file end to end (slow)
      [--no-encode] [--keep-takes]
      [--cache DIR]     accepted takes, for resume after a crash
      [--no-cache]      render everything fresh, keep nothing
"""
import array
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne                      # noqa: E402
from render_v2 import (                             # noqa: E402
    API, SENTENCE_GAP, clarity, get, norm_words, post, split_sentences,
    transcribe,
)
# Pause grammar and the trailing pad are imported, never copied, so a change to
# the house grammar reaches this renderer too.
#
# What importing them does NOT do is keep `build_chapters.py` in sync — an
# earlier comment here claimed it did. That script rebuilds the plan with
# `rk.split_long` at 450 words and never reads `maxSegmentWords`, and
# `split_segment` below is a different algorithm anyway (sentence-packing plus
# a short-tail merge, against a naive ". " split), so the ceiling alone cannot
# reproduce this plan. Replay is therefore not the contract. Instead the
# sidecar records, per part, the module it came from, its heading, its measured
# duration and the exact silence inserted after it — everything a chapter mark
# needs, with nothing to re-derive.
from render_kokoro import (                         # noqa: E402
    PAUSE_AFTER, TRAILING_PAD, apply_overrides, read_wav,
)

ENGINE = "chatterbox_turbo"

# James — Channel (single-take). The only reference measured inside the
# 150-170 wpm narration band (170), and the tightest across renders: ±1.8 Hz of
# the founder's real 84.2 Hz median against ±3.0 for the interview set.
DEFAULT_PROFILE = "464bca4c-58e7-4ad1-8926-a4427910f41d"

REFERENCE_PACE = [
    ("THCA master", 214), ("Channel (measured)", 196),
    ("Founder Voice", 188), ("Channel (single-take)", 170),
]

# Kokoro renders 450-word segments whole because it measured 100% verbatim.
# Chatterbox is autoregressive and its failure mode at length is to stop early,
# so the ceiling sits well below anything observed to truncate rather than at
# the edge of it: at the reference's 170 wpm, 90 words is ~32s of audio per
# request. Cuts land only on sentence boundaries — a boundary is where the
# voice breathes, and the pause grammar puts real silence there anyway.
MAX_SEGMENT_WORDS = 90
# A stranded fragment is both an audible stumble and a false alarm: one ASR
# hiccup in a five-word part scores 0.80 and burns every retry.
MIN_PART_WORDS = 12

ATTEMPTS = 4
CLARITY_MIN = 0.97          # tighter than Kokoro's 0.95 because here the gate
                            # is load-bearing, not advisory
DROP_MAX = 2                # absolute missing-word ceiling; see the docstring
TAIL_WORDS = 6
TAIL_MIN = 0.80
DUP_RATIO = 1.18            # transcript longer than this = restart or loop
DUP_MIN_EXCESS = 5          # ...but only if it is also this many words longer
PACE_MAX = 240              # wpm; above this the audio is short for its text
PACE_MIN = 90               # wpm; below this it stalled or garbled
CHECK_MIN_WORDS = 12        # a wpm figure below this is noise — and so is a
                            # clarity RATIO; see the gate below
SHORT_DROP_MAX = 1          # absolute ceiling for parts under that length
SHORT_MIN_SEC = 0.14        # so short parts get a duration floor per word
                            # instead (0.14 s/word ≈ a 428 wpm ceiling — wide
                            # enough never to fire on a normally-read title,
                            # tight enough to catch a part that came back as
                            # near-silence)
# Whole-track clarity is NOT comparable to per-part clarity and must not be
# scored against the same number: one Whisper pass over a 25-minute file with
# 80 pauses in it loses words to its own segmentation, so the per-part 0.97
# would fire constantly and train the operator to ignore the one check that
# catches a stitching error. This threshold asks a different question — is the
# assembly structurally the reading? — and is set where a missing or doubled
# segment shows and ordinary long-form ASR slippage does not.
TRACK_CLARITY_MIN = 0.93

BITRATE = 48000             # mono speech: transparent, ~8 MB for 22 minutes
POLL_SECONDS = 2
POLL_LIMIT = 600            # 20 minutes; a local model queues behind other work
FETCH_TIMEOUT = 300

CREATED = set()
TMP_PATH = None


# ── Voicebox plumbing ────────────────────────────────────────────────

def delete_generation(gid):
    """Rejected takes go immediately, not at the end.

    A run that retries four times on a long devotional creates hundreds of WAVs
    in Voicebox's data dir; deleting on rejection keeps the peak at one.
    Accepted takes are deleted too — the on-disk take cache, not Voicebox, is
    what makes a run resumable.
    """
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"{API}/history/{gid}", method="DELETE"), timeout=30)
    except Exception:  # noqa: BLE001
        return False
    CREATED.discard(gid)
    return True


def cleanup(keep):
    if keep:
        print(f"  --keep-takes: leaving {len(CREATED)} generation(s)")
        return
    n = 0
    for gid in list(CREATED):
        if delete_generation(gid):
            n += 1
    if n or CREATED:
        print(f"  cleanup: deleted {n} generation(s), {len(CREATED)} left behind")


def cleanup_tmp():
    """The scratch WAV is removed on every exit path, not just the happy one.

    It used to be unlinked only after a successful write, so an unrecoverable
    segment left a stray `<out>.wav.tmp.wav` behind. `render_catalog.py` sweeps
    those for the Kokoro path; nothing sweeps them here.
    """
    if TMP_PATH and os.path.exists(TMP_PATH):
        try:
            os.unlink(TMP_PATH)
        except OSError:
            pass


def resolve_profile(wanted):
    """Accept a profile id or a case-insensitive name substring.

    Ambiguity is an error rather than a guess: picking the wrong reference is
    the single most expensive mistake available here, and it is silent —
    the render succeeds, it just narrates 44 wpm too fast.
    """
    profiles = get("/profiles")
    for p in profiles:
        if p.get("id") == wanted:
            return p
    hits = [p for p in profiles
            if wanted.lower() in (p.get("name") or "").lower()]
    if len(hits) == 1:
        return hits[0]
    print(f"profile {wanted!r} " +
          ("is ambiguous" if hits else "not found") + ". Available:")
    for p in profiles:
        print(f"    {p['id']}  {p.get('voice_type','?'):8} {p.get('name','')}")
    raise SystemExit(2)


def generate(pid, text):
    """One generation. Returns (gid|None, status|None).

    The payload carries exactly the four fields known to work on this engine.
    No seed: Chatterbox is nondeterministic, so a plain re-render is already a
    different sample, and an unverified field risks the 422 that plain
    "chatterbox" returns.
    """
    try:
        gid = post("/generate", {"profile_id": pid, "text": text,
                                 "language": "en", "engine": ENGINE})["id"]
    except Exception as e:  # noqa: BLE001
        print(f"      generate failed: {str(e)[:120]}", flush=True)
        return None, None
    CREATED.add(gid)
    status = None
    for _ in range(POLL_LIMIT):
        try:
            status = get(f"/history/{gid}").get("status")
        except Exception:  # noqa: BLE001
            time.sleep(POLL_SECONDS)
            continue
        if status in ("completed", "failed"):
            break
        time.sleep(POLL_SECONDS)
    return gid, status


def fetch_audio(gid, dest):
    """Download a generation, with a timeout, and prove it is a WAV.

    `urllib.request.urlretrieve` accepts no timeout, so it inherits the global
    default of None and can hang forever on a stalled local server. It also
    writes whatever arrives — an HTML error body lands on disk and `read_wav`
    raises `wave.Error` from outside any try. Either one used to escape the
    render loop and discard every verified segment rendered so far, which on a
    `bible-365` day is ~40 sequential local generations.
    """
    with urllib.request.urlopen(f"{API}/audio/{gid}", timeout=FETCH_TIMEOUT) as r:
        data = r.read()
    if len(data) < 64 or data[:4] != b"RIFF":
        raise ValueError(f"response is not a WAV ({len(data)} bytes)")
    with open(dest, "wb") as f:
        f.write(data)


# ── verification ─────────────────────────────────────────────────────

# Whisper appends stock phrases to trailing silence, and Chatterbox emits
# trailing silence. Measured on this machine, appended to an otherwise perfect
# take: 12w + "Thank you for watching." → dup 1.33; 20w + "Subtitles by the
# Amara.org community" → dup 1.30. Both were rejected as restarts. The artifact
# belongs to the SILENCE, not the sample, so a re-render reproduces it and all
# four attempts burn before the whole devotional aborts. Stripping it is the
# fix; widening DUP_RATIO instead would blind the detector to real restarts.
HALLUCINATIONS = (
    "thank you for watching", "thanks for watching",
    "thank you for watching!", "thank you.", "thank you",
    "thank you for listening", "thanks for listening",
    "subtitles by the amara.org community", "subtitles by the amara.org",
    "transcription by castingwords", "please subscribe",
    "see you next time", "bye bye",
)
HALLUCINATION_TOKENS = [norm_words(p) for p in HALLUCINATIONS]


def strip_hallucination(hypothesis):
    """Normalized transcript tokens with Whisper's trailing boilerplate removed.

    Only strips from the END, only whole phrases, and never strips the entire
    hypothesis — a part whose text genuinely is "Thank you" must still be
    scored against what came back.
    """
    words = norm_words(hypothesis)
    changed = True
    while changed and words:
        changed = False
        for phrase in HALLUCINATION_TOKENS:
            n = len(phrase)
            if n and len(words) > n and words[-n:] == phrase:
                words = words[:-n]
                changed = True
    return words


def tail_score(reference, hyp_words):
    """How much of the reference's final clause survived.

    Scored on a window rather than the whole transcript because Whisper likes
    to append its own trailing phrase to silence; a window keeps that from
    reading as the tail.
    """
    r = norm_words(reference)
    if len(r) < TAIL_WORDS * 2:
        return 1.0                      # too short for a tail to be meaningful
    if not hyp_words:
        return 0.0                      # nothing came back: the tail is gone
    window = hyp_words[-(TAIL_WORDS * 3):]
    return clarity(" ".join(r[-TAIL_WORDS:]), " ".join(window))


def evaluate(spoken, hypothesis, duration, gate, drop_max=DROP_MAX):
    """Run the detectors over one take. Returns (metrics, reasons).

    Every count here is a NORMALIZED word count. Mixing `spoken.split()` for
    pace with `norm_words` for duplication, as an earlier revision did, makes
    the two disagree on any text containing digits — "1985" is one raw token
    and three spoken words — so the wpm figure and the length ratio were
    measuring different readings of the same take.
    """
    ref = norm_words(spoken)
    hyp = strip_hallucination(hypothesis)
    hyp_text = " ".join(hyp)
    words = len(ref)
    c = clarity(spoken, hyp_text)
    dropped = max(0, int(round((1.0 - c) * words)))
    excess = len(hyp) - words
    m = {
        "words": words,
        "clarity": round(c, 3),
        "dropped": dropped,
        "tail": round(tail_score(spoken, hyp), 3),
        "dup": round(len(hyp) / max(words, 1), 2),
        "wpm": round(words / duration * 60) if duration else 0,
    }
    reasons = []
    # A RATIO over a handful of tokens is noise, exactly as a wpm figure is —
    # which is why the pace check below already exempts short parts via
    # CHECK_MIN_WORDS. Clarity never got the same treatment, and it should:
    # "A Small Reading" loses its unstressed article to the ASR and scores
    # 0.67; "The Hebrew word tselem" loses the one word English cannot spell
    # and scores 0.75. Both are correct audio, and both burn all four attempts.
    # MIN_PART_WORDS exists to merge these away, but it only fires on a short
    # TAIL of a multi-part segment — a standalone short segment is unprotected.
    # So below the threshold, judge absolutely: at most ONE word-equivalent
    # missing, which is stricter than the drop_max applied to long parts. The
    # tail, pace and duplication detectors are untouched, so a short part that
    # is truncated, rushed or looped still fails.
    if words < CHECK_MIN_WORDS:
        if dropped > SHORT_DROP_MAX:
            reasons.append(
                f"{dropped} of {words} word-equivalents missing "
                f"> short-part ceiling {SHORT_DROP_MAX}")
    elif m["clarity"] < gate:
        reasons.append(f"clarity {m['clarity']:.2f} < {gate:.2f}")
    elif dropped > drop_max:
        reasons.append(f"{dropped} word-equivalents missing > ceiling {drop_max}")
    if m["tail"] < TAIL_MIN:
        reasons.append(f"tail {m['tail']:.2f} — final clause missing")
    if words >= CHECK_MIN_WORDS:
        if m["wpm"] > PACE_MAX:
            reasons.append(f"{m['wpm']} wpm — audio too short for the text")
        elif m["wpm"] < PACE_MIN:
            reasons.append(f"{m['wpm']} wpm — stalled or garbled")
    elif duration < words * SHORT_MIN_SEC:
        # Short parts are titles, headings and scripture references — the class
        # that previously shipped with the title never spoken. wpm is noise
        # here, silence is not.
        reasons.append(f"{duration:.2f}s of audio for {words} words — too short")
    if m["dup"] > DUP_RATIO and excess >= DUP_MIN_EXCESS:
        reasons.append(f"transcript {m['dup']}x longer (+{excess} words) — "
                       f"restart or loop")
    return m, reasons


def explain(reference, hypothesis, limit=5):
    """Word-level diff lines, so a human can adjudicate a hard failure fast."""
    import difflib
    r, h = norm_words(reference), norm_words(hypothesis)
    sm = difflib.SequenceMatcher(a=r, b=h, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal" or len(out) >= limit:
            continue
        out.append(f"      {tag:7} expected {' '.join(r[i1:i2])[:52]!r} "
                   f"| heard {' '.join(h[j1:j2])[:52]!r}")
    return out


# ── planning ─────────────────────────────────────────────────────────

def split_segment(text, ceiling):
    """Pack sentences up to the ceiling. Never cuts inside a sentence.

    A sentence longer than the ceiling is sent whole and reported rather than
    broken: a seam mid-clause is worse than a slightly long request, and the QA
    report names it so an over-long sentence is a content decision, not a
    silent engine risk.
    """
    if len(text.split()) <= ceiling:
        return [text]
    parts = []
    for s in split_sentences(text):
        if parts and len((parts[-1] + " " + s).split()) <= ceiling:
            parts[-1] += " " + s
        else:
            parts.append(s)
    # Merge a stranded tail backwards; the clause it finishes belongs with it.
    #
    # Pop FIRST, then append to the new last element. Writing this as
    # `parts[-2] += " " + parts.pop()` reads correctly and is not: the
    # augmented assignment loads `parts[-2]` before the right-hand side runs
    # but STORES to `parts[-2]` after `pop()` has shortened the list, so the
    # index resolves to a different element on the way out.
    # `['AAA','BBB','tail']` becomes `['BBB tail','BBB']` — AAA deleted from
    # the reading, BBB spoken twice — and with exactly two parts it raises
    # IndexError. Measured over public/devotionals at the 90-word ceiling:
    # 2,519 words silently removed across 29 devotionals, and a hard crash on
    # 90 of 575 (15.7%), first at bible-365-day-100. It corrupts the PLAN, so
    # every detector then verifies the corrupted plan and reports clean.
    if len(parts) > 1 and len(parts[-1].split()) < MIN_PART_WORDS:
        tail = parts.pop()
        parts[-1] += " " + tail
    return parts


def dedup_headings(segments):
    """Drop a heading segment that the very next segment repeats.

    `narration_extract` speaks a module's heading as its own segment, then
    speaks the field with its spoken lead-in. Where the two coincide the
    listener hears "The Voice Behind Today. The voice behind today: Hosea son
    of Beeri." The extractor's own `norm_key` dedup cannot collapse them
    because the second carries the name, and no detector in this file can see
    it either — the audio faithfully says what was extracted.

    The rule is deliberately narrow: the segment must BE its module's heading,
    the next segment must belong to the same module, and the heading's
    normalized words must be a strict prefix of it. Measured over
    public/devotionals that is 21 occurrences in 11 devotionals. A bespoke
    heading ("The Fugitive King") followed by "The voice behind today: David"
    is not a repeat and is left alone — 467 of the 476 profile modules in the
    catalog are that shape, so a looser rule would start deleting content.

    Removals are returned, printed, and recorded in the sidecar, because this
    is the one place the renderer deliberately says less than the extraction.
    """
    out, removed = [], []
    for i, s in enumerate(segments):
        nxt = segments[i + 1] if i + 1 < len(segments) else None
        if (nxt is not None and s.get("heading") and s["text"] == s["heading"]
                and s.get("module_index") == nxt.get("module_index")):
            a, b = norm_words(s["text"]), norm_words(nxt["text"])
            if a and len(b) > len(a) and b[:len(a)] == a:
                removed.append(s["text"])
                continue
        out.append(s)
    return out, removed


def build_plan(segments, ceiling):
    plan = []
    for s in segments:
        parts = split_segment(s["text"], ceiling)
        for j, part in enumerate(parts):
            plan.append({
                "register": s["register"], "label": s["label"], "text": part,
                "module_index": s.get("module_index", 0),
                "heading": s.get("heading"),
                # Which seams end a section and which are ordinary sentence
                # boundaries inside one. Without this the stitcher cannot tell
                # them apart and every part gets an end-of-section pause.
                "last_in_segment": j == len(parts) - 1,
            })
    return plan


def gap_after(part):
    """Silence to insert after this part.

    PAUSE_AFTER is a SEGMENT grammar — it is the breath between sections. At a
    450-word ceiling splitting was rare, so `render_kokoro` never needed the
    distinction; at 90 words splitting is the normal case, and corpus-wide the
    16,614 extracted segments become 21,677 parts. Applying the segment pause
    at all 21,676 seams puts an end-of-section silence at 5,063 mid-paragraph
    sentence boundaries. `render_v2` carried `last_in_segment` and
    `SENTENCE_GAP` for exactly this; on rekindled-day-1 (60 segments → 83
    parts) it is the difference between 48.8s and 45.1s of inserted silence,
    3.6s of it landing in the wrong places.
    """
    return (PAUSE_AFTER.get(part["register"], 0.55) if part["last_in_segment"]
            else SENTENCE_GAP)


# ── take cache (resume) ──────────────────────────────────────────────
# `render_catalog.py` gets resumability from one subprocess per devotional. At
# this chunk size the same protection is needed WITHIN a devotional: a
# bible-365 day is ~40 sequential local generations plus retries, and an
# accepted take is deleted from Voicebox the moment it passes, so without a
# local copy nothing is recoverable from either side.

def take_key(pid, spoken):
    """Content address for one accepted take.

    Keyed on the exact text SENT, so a pronunciation-override change or a
    reference change invalidates the entry rather than replaying stale audio.
    """
    return hashlib.sha1(
        f"{ENGINE}\n{pid}\n{spoken}".encode("utf-8")).hexdigest()[:16]


def cache_get(cache_dir, key):
    if not cache_dir:
        return None
    wav = os.path.join(cache_dir, key + ".wav")
    meta = os.path.join(cache_dir, key + ".json")
    if not (os.path.exists(wav) and os.path.exists(meta)):
        return None
    try:
        info = json.load(open(meta))
        samples, sr = read_wav(wav)
    except Exception:  # noqa: BLE001
        return None                      # unreadable cache entry: just re-render
    if not samples or not info.get("metrics"):
        return None
    return {"metrics": info["metrics"], "reasons": [], "samples": samples,
            "sr": sr, "duration": len(samples) / sr,
            "hyp": info.get("hyp", ""), "attempt": info.get("attempt", 1),
            "cached": True}


def cache_put(cache_dir, key, best):
    if not cache_dir:
        return
    try:
        os.makedirs(cache_dir, exist_ok=True)
        wav = os.path.join(cache_dir, key + ".wav")
        w = wave.open(wav, "wb")
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(best["sr"])
        w.writeframes(best["samples"].tobytes())
        w.close()
        json.dump({"metrics": best["metrics"], "hyp": best["hyp"],
                   "attempt": best["attempt"]},
                  open(os.path.join(cache_dir, key + ".json"), "w"))
    except Exception as e:  # noqa: BLE001
        # A cache that cannot be written costs resumability, not correctness.
        print(f"      cache write failed: {str(e)[:100]}", flush=True)


# ── output ───────────────────────────────────────────────────────────

def guard_out_path(out_path):
    """Refuse to write anywhere the site — or the chapter builder — reads from.

    This renderer produces evaluation output. `public/audio/` and
    `src/data/audio-manifest.json` are the published catalog, mutated by the
    publish step alone — and by other sessions concurrently.
    `euangelion-voice-prototype/renders/` is not the catalog but is just as
    live: it holds 543 Kokoro `<slug>.manifest.json` side manifests, and the
    sidecar path below is `<out>` with its extension swapped, so writing
    `renders/<slug>.wav` would overwrite one and silently disable chapter
    rebuild for that devotional.

    realpath, not abspath: a symlink into any of these is the same write.
    """
    p = os.path.realpath(out_path)
    owned = (
        (os.path.join(REPO, "public", "audio"),
         "the published catalog — this renderer does not publish"),
        (os.path.join(REPO, "src", "data"),
         "the published catalog — this renderer does not publish"),
        (os.path.join(REPO, "euangelion-voice-prototype", "renders"),
         "543 live Kokoro side manifests, which the shipped chapter marks "
         "are derived from"),
    )
    for path, why in owned:
        path = os.path.realpath(path)
        if p == path or p.startswith(path + os.sep):
            raise SystemExit(
                f"refusing to write {p}\n"
                f"  {path} is {why}. Choose a scratch path.")


def sidecar_path(out_path):
    return out_path.rsplit(".", 1)[0] + ".manifest.json"


def guard_sidecar(path):
    """Never overwrite a side manifest another renderer wrote."""
    if not os.path.exists(path):
        return
    try:
        existing = json.load(open(path))
    except Exception:  # noqa: BLE001
        existing = {}
    if existing.get("engine") != ENGINE:
        raise SystemExit(
            f"refusing to overwrite {path}\n"
            f"  it was written by engine {existing.get('engine') or 'unknown'!r}, "
            f"not {ENGINE!r}. Chapter marks are derived from these files. "
            f"Choose a different <out>.wav name.")


def encode(wav_path):
    """AAC via afconvert. macOS ships it; the box has no ffmpeg."""
    out = wav_path.rsplit(".", 1)[0] + ".m4a"
    r = subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(BITRATE), "-c", "1",
         wav_path, out], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ENCODE FAILED: {r.stderr.strip()[:200]}")
        return None
    return out


def encoded_duration(path):
    """Duration read back off the encoded file, not inferred from the WAV."""
    r = subprocess.run(["afinfo", path], capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if "estimated duration" in line:
            try:
                return float(line.split(":")[1].strip().split()[0])
            except Exception:  # noqa: BLE001
                return None
    return None


# ── main ─────────────────────────────────────────────────────────────

def arg(name, default=None):
    """Flag value, or `default`. A flag with no value is a usage error, not a
    traceback — `--limit` as the last token used to raise IndexError."""
    if name not in sys.argv:
        return default
    i = sys.argv.index(name) + 1
    if i >= len(sys.argv):
        raise SystemExit(f"{name} needs a value")
    return sys.argv[i]


def main():
    global TMP_PATH
    if len(sys.argv) < 3:
        raise SystemExit(__doc__.strip().rsplit("Usage:", 1)[-1])
    dev_path, out_path = sys.argv[1], sys.argv[2]
    guard_out_path(out_path)
    mpath = sidecar_path(out_path)
    guard_sidecar(mpath)

    profile_arg = arg("--profile", DEFAULT_PROFILE)
    ceiling = int(arg("--max-words", MAX_SEGMENT_WORDS))
    attempts = int(arg("--attempts", ATTEMPTS))
    gate = float(arg("--clarity-min", CLARITY_MIN))
    drop_max = int(arg("--max-dropped", DROP_MAX))
    limit = int(arg("--limit", 0))
    survey = "--survey" in sys.argv
    cache_dir = (None if "--no-cache" in sys.argv
                 else arg("--cache", out_path + ".takes"))

    dev = json.load(open(dev_path))
    segments, deduped = dedup_headings(ne.extract(dev))
    plan = build_plan(segments, ceiling)
    full_parts = len(plan)
    # `--limit` is a debug flag, and a debug flag must not be able to produce an
    # artifact that asserts completeness. It used to truncate the plan and then
    # stamp the sidecar `"verified": true` with the whole devotional's textHash;
    # nothing in the file distinguished a five-segment render from a finished
    # one.
    partial = bool(limit) and limit < full_parts
    if limit:
        plan = plan[:limit]

    profile = resolve_profile(profile_arg)
    if profile.get("voice_type") != "cloned":
        raise SystemExit(
            f"profile {profile.get('name')!r} is {profile.get('voice_type')!r}. "
            f"{ENGINE} is zero-shot cloning — it needs a cloned reference.")
    pid = profile["id"]

    total_words = sum(len(norm_words(p["text"])) for p in plan)
    over = [p for p in plan if len(p["text"].split()) > ceiling]
    seams = sum(1 for p in plan if not p["last_in_segment"])
    print(f"{os.path.basename(dev_path)}: {len(segments)} segments → "
          f"{len(plan)} renders, {total_words} words")
    print(f"  engine {ENGINE} | reference {profile.get('name')!r}")
    print(f"  reference pace measured on this machine: " +
          " · ".join(f"{n} {w}" for n, w in REFERENCE_PACE) + " wpm")
    print(f"  gate: clarity ≥ {gate:.2f}, ≤ {drop_max} word(s) missing, "
          f"tail ≥ {TAIL_MIN:.2f}, {PACE_MIN}-{PACE_MAX} wpm, "
          f"≤ {DUP_RATIO}x transcript, {attempts} attempts")
    print(f"  pauses: {len(plan) - seams - 1} section (PAUSE_AFTER), "
          f"{seams} sentence ({SENTENCE_GAP}s within a segment)")
    if deduped:
        print(f"  heading dedup: {len(deduped)} heading(s) the next segment "
              f"repeats verbatim, not spoken twice: "
              + "; ".join(repr(d) for d in deduped[:3]))
    if over:
        print(f"  note: {len(over)} sentence(s) exceed the {ceiling}-word "
              f"ceiling and are sent whole (never cut mid-sentence)")
    if partial:
        print(f"  ⚠ --limit {limit}: rendering {len(plan)} of {full_parts} "
              f"parts — the sidecar will be marked incomplete and carry no "
              f"textHash")
    if cache_dir:
        print(f"  take cache: {cache_dir}")

    TMP_PATH = tmp = out_path + ".tmp.wav"
    rendered, sr_ref, unrecoverable = [], None, []
    reused = 0
    t0 = time.time()

    for i, p in enumerate(plan):
        # Overrides change only what is SENT; the devotional text is untouched,
        # and the gate scores against the overridden text so a corrected
        # pronunciation is never counted as a misreading.
        spoken = apply_overrides(p["text"])
        key = take_key(pid, spoken)
        best = cache_get(cache_dir, key)
        if best is not None:
            reused += 1
        for attempt in range(1, attempts + 1):
            if best is not None and not best["reasons"]:
                break
            gid, status = generate(pid, spoken)
            if status != "completed":
                if gid:
                    delete_generation(gid)
                print(f"      attempt {attempt}: {status or 'no response'}",
                      flush=True)
                continue
            try:
                fetch_audio(gid, tmp)
                samples, sr = read_wav(tmp)
                hyp = transcribe(tmp)
            except Exception as e:  # noqa: BLE001
                # A stalled download or an HTML error body is a bad ATTEMPT,
                # not a dead run. Letting it escape used to throw away every
                # verified segment rendered so far.
                delete_generation(gid)
                print(f"      attempt {attempt}: fetch failed: {str(e)[:100]}",
                      flush=True)
                continue
            dur = len(samples) / sr
            m, reasons = evaluate(spoken, hyp, dur, gate, drop_max)
            cand = {"metrics": m, "reasons": reasons, "samples": samples,
                    "sr": sr, "duration": dur, "hyp": hyp, "attempt": attempt,
                    "cached": False}
            # Keep the closest take purely so a hard failure can show its diff.
            if best is None or m["clarity"] > best["metrics"]["clarity"]:
                best = cand
            if not reasons:
                best = cand
                delete_generation(gid)
                break
            delete_generation(gid)      # a rejected take has no further use
            print(f"      attempt {attempt} rejected: {'; '.join(reasons)}",
                  flush=True)

        if best is None or best["reasons"]:
            unrecoverable.append({"index": i, "plan": p, "best": best})
            print(f"[{i+1}/{len(plan)}] {p['register']:10} UNVERIFIED | "
                  f"{p['text'][:44]}", flush=True)
            if best is not None:
                for line in explain(spoken, best["hyp"]):
                    print(line)
            if not survey:
                break
            continue

        if not best.get("cached"):
            cache_put(cache_dir, key, best)

        # A rate change mid-run concatenates silently and yields a pitch and
        # speed shift, per-segment durations in the sidecar that disagree with
        # the file, and chapter marks derived from them that drift.
        if sr_ref is None:
            sr_ref = best["sr"]
        elif best["sr"] != sr_ref:
            raise SystemExit(
                f"sample rate changed mid-run: {sr_ref} Hz → {best['sr']} Hz "
                f"at part {i+1}. Refusing to concatenate.")

        m = best["metrics"]
        rendered.append({**p, "samples": best["samples"], "sr": best["sr"],
                         "words": m["words"],
                         "duration": round(best["duration"], 2),
                         "clarity": m["clarity"], "tail": m["tail"],
                         "dup": m["dup"], "dropped": m["dropped"],
                         "wpm": m["wpm"], "attempts": best["attempt"]})
        mark = " (cached)" if best.get("cached") else ""
        print(f"[{i+1}/{len(plan)}] {p['register']:10} "
              f"{m['words']:3}w {best['duration']:6.1f}s "
              f"{m['wpm']:4} wpm clarity={m['clarity']:.2f} "
              f"tail={m['tail']:.2f} try{best['attempt']}{mark} | "
              f"{p['text'][:36]}", flush=True)

        # Early pace verdict — the point of printing it here is that a wrong
        # reference should cost thirty seconds, not a whole devotional.
        if len(rendered) == 5:
            w = sum(r["words"] for r in rendered)
            d = sum(r["duration"] for r in rendered)
            pace = w / d * 60
            # Compare the figure that is PRINTED. The default reference
            # measures 170 wpm, so a bare `pace <= 170` puts the correct
            # default a rounding error outside its own band and tells the
            # operator to go looking for a better one.
            verdict = ("in the 150-170 audiobook band"
                       if 150 <= round(pace) <= 170
                       else "OUTSIDE the 150-170 band — consider another "
                            "--profile; reference selection is worth 44 wpm")
            print(f"  ── early pace: {pace:.0f} wpm over 5 segments, {verdict}",
                  flush=True)

    if unrecoverable:
        print(f"\nREFUSING TO ENCODE — {len(unrecoverable)} segment(s) never "
              f"verified after {attempts} attempts each.")
        print("  A track that is missing words is the defect this renderer "
              "exists to prevent, so nothing is written.")
        for u in unrecoverable[:5]:
            reasons = "; ".join(u["best"]["reasons"]) if u["best"] else "no take"
            print(f"    [{u['index']+1}] {u['plan']['register']}: {reasons}")
            print(f"        {u['plan']['text'][:100]}")
        if not survey:
            print("  (stopped at the first one — pass --survey to see them all)")
        if cache_dir:
            print(f"  verified takes kept in {cache_dir} — a re-run resumes "
                  f"from there rather than re-rendering them.")
        raise SystemExit(1)

    if not rendered:
        raise SystemExit("nothing rendered")

    # Pause grammar between EVERY part, with the RIGHT pause at each seam. The
    # ElevenLabs path applies it only between REQUESTS, joining segments inside
    # a request with a single space: 7 pauses on rekindled-day-1 where 59
    # belong. That is not a stylistic difference, it is the reading running
    # together. The opposite error is just as real — see gap_after().
    frames = array.array("h")
    for i, r in enumerate(rendered):
        frames.extend(r["samples"])
        r["pauseAfter"] = gap_after(r) if i < len(rendered) - 1 else 0.0
        frames.extend([0] * int(r["pauseAfter"] * sr_ref))
    frames.extend([0] * int(TRAILING_PAD * sr_ref))

    w = wave.open(out_path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr_ref)
    w.writeframes(frames.tobytes())
    w.close()
    cleanup_tmp()

    # QA is measured on the file that was actually written. A prior renderer
    # summed API-reported chunk durations and reported 2.87 w/s where the file
    # measured 3.48; reading the WAV back makes that class of error impossible.
    written, sr_written = read_wav(out_path)
    dur = len(written) / sr_written
    words = sum(r["words"] for r in rendered)
    speech = sum(r["duration"] for r in rendered)

    # ── checks that can still fail, BEFORE anything claims verified ──
    failures = []
    track = None
    if "--verify-track" in sys.argv:
        # Segment checks cannot catch a stitching mistake: every part can be
        # perfect and the assembly still wrong. This reads the finished file
        # back as one pass. Slow — minutes on a 25-minute track — and scored
        # against TRACK_CLARITY_MIN, not the per-part gate, because the two
        # measure different things.
        print("  verifying whole track (this takes a few minutes)…", flush=True)
        whole = " ".join(apply_overrides(r["text"]) for r in rendered)
        hyp = strip_hallucination(transcribe(out_path))
        c = clarity(whole, " ".join(hyp))
        d = len(hyp) / max(len(norm_words(whole)), 1)
        track = {"clarity": round(c, 3), "dup": round(d, 2),
                 "clarityMin": TRACK_CLARITY_MIN}
        print(f"  whole-track clarity {c:.3f} (floor {TRACK_CLARITY_MIN:.2f}), "
              f"length ratio {d:.2f}")
        if c < TRACK_CLARITY_MIN:
            failures.append(f"whole-track clarity {c:.3f} < {TRACK_CLARITY_MIN}")
        if d > DUP_RATIO:
            failures.append(f"whole-track length ratio {d:.2f} > {DUP_RATIO} — "
                            f"a segment is in the file twice")

    encoded = None
    if "--no-encode" not in sys.argv:
        encoded = encode(out_path)
        if not encoded:
            failures.append("afconvert failed — no M4A was produced")
        else:
            ed = encoded_duration(encoded)
            mb = os.path.getsize(encoded) / 1024 / 1024
            print(f"  encoded: {encoded} ({mb:.1f} MB"
                  + (f", {ed/60:.1f} min measured by afinfo)" if ed else ")"))
            if ed and abs(ed - dur) > 1.0:
                failures.append(f"encoded duration differs from the WAV by "
                                f"{abs(ed-dur):.1f}s")

    complete = not partial
    verified = complete and not failures
    sidecar = {
        "source": dev_path,
        "engine": ENGINE,
        "profile": {"id": pid, "name": profile.get("name")},
        # textHash fingerprints the EXTRACTION and is what a publisher compares
        # against the devotional on disk to decide whether audio is stale. A
        # partial render must not carry one: it would assert that this file
        # says everything that devotional says.
        "textHash": ne.text_hash(dev) if complete else None,
        # ...and this fingerprints what was actually sent to the engine, which
        # after heading dedup is deliberately not the same string.
        "spokenTextHash": hashlib.sha1(
            "\n".join(apply_overrides(r["text"]) for r in rendered)
            .encode("utf-8")).hexdigest()[:12],
        "complete": complete,
        "renderedParts": len(rendered),
        "planParts": full_parts,
        "verified": verified,
        "failures": failures,
        "trackCheck": track,
        "gate": {"clarityMin": gate, "maxDropped": drop_max,
                 "tailMin": TAIL_MIN, "dupRatio": DUP_RATIO,
                 "dupMinExcess": DUP_MIN_EXCESS,
                 "paceWpm": [PACE_MIN, PACE_MAX], "attempts": attempts},
        "maxSegmentWords": ceiling,
        # The pause grammar as APPLIED, per part, plus the constants. A chapter
        # builder needs `t` for each module boundary; with module_index,
        # duration and pauseAfter recorded here that is a running sum over this
        # list and nothing has to be replayed or re-derived.
        "pauseGrammar": {"pauseAfter": PAUSE_AFTER,
                         "sentenceGap": SENTENCE_GAP,
                         "trailingPad": TRAILING_PAD},
        "headingDedup": deduped,
        "duration": round(dur, 2),
        "segments": [{k: r[k] for k in
                      ("register", "label", "text", "module_index", "heading",
                       "last_in_segment", "pauseAfter", "words", "clarity",
                       "tail", "dup", "dropped", "duration", "wpm",
                       "attempts")} for r in rendered],
    }
    json.dump(sidecar, open(mpath, "w"), indent=1)

    retries = sum(r["attempts"] - 1 for r in rendered)
    print(f"\nQA REPORT — {out_path}")
    print(f"  duration {dur/60:.1f} min ({dur:.0f}s), measured on the written "
          f"file | {words} words")
    print(f"  pace {words/dur*60:.0f} wpm inclusive, {words/speech*60:.0f} wpm "
          f"speech-only (audiobook band 150-170)")
    print(f"  reference {profile.get('name')!r}")
    print(f"  mean clarity {sum(r['clarity'] for r in rendered)/len(rendered):.3f} "
          f"| min {min(r['clarity'] for r in rendered):.3f} "
          f"| min tail {min(r['tail'] for r in rendered):.2f} "
          f"| max words missing {max(r['dropped'] for r in rendered)}")
    scope = (f"all {len(rendered)} of {full_parts} part(s)" if complete
             else f"{len(rendered)} of {full_parts} part(s) — PARTIAL RENDER")
    print(f"  {scope} passed the segment gate; {retries} retry/retries needed"
          + (f", {reused} take(s) reused from cache" if reused else ""))
    print(f"  sidecar: {mpath}  (verified={verified}, complete={complete})")

    if not failures and complete and cache_dir and "--keep-takes" not in sys.argv:
        shutil.rmtree(cache_dir, ignore_errors=True)

    print(f"  wall clock {(time.time()-t0)/60:.1f} min")
    print("  NOT published. Publishing to public/audio + audio-manifest.json "
          "is a separate step.")

    if failures:
        # Exit code, not a warning. `render_catalog.py` drives the Kokoro path
        # by returncode; a check that could only print left a WAV, an M4A and a
        # sidecar on disk while every wrapper read the run as a success.
        print("\n  ⚠ NOT VERIFIED — do not publish:")
        for f in failures:
            print(f"    - {f}")
        raise SystemExit(1)
    if partial:
        print("\n  ⚠ PARTIAL — --limit was set. This is a debug artifact.")
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    finally:
        # Cleanup belongs in `finally`: the failure paths are exactly when a
        # run leaves the most orphans behind, and exactly when it is about to
        # be re-run.
        cleanup_tmp()
        cleanup("--keep-takes" in sys.argv)
