#!/usr/bin/env python3
"""Euangelion narration renderer v2.

Changes from v1 (render_devotional.py), each driven by a measurement:

1. COMPLETE TEXT — uses narration_extract.py. v1 (and the shipped
   src/lib/audio/segments.ts) read a fixed field list and spoke a median 70.7%
   of each devotional's distinct prose. v2 speaks 1.37x more words.

2. PACE IN POST — v1 tried to hit register targets by seed-hunting. Measured on
   this machine, seeds move rate by ~±0.4 w/s around a 3.0-3.6 floor, the
   `instruct` field is a no-op on the MLX path, and register-specific reference
   profiles changed nothing. Nothing in generation reaches 2.3-2.8, so pace is
   corrected by WSOLA time-stretch (timestretch.py).

3. PHONETIC CLARITY GATE — v1 compared ASR output to source by exact spelling,
   so it scored good takes as broken on wilfully/willfully and prophets/profits.
   v2 compares Soundex keys.

4. HONEST RATE MATH — v1's QA reported 2.87 w/s for take A3; measuring the
   stitched file gives 3.48. v2 measures the written audio, never the sum of
   API-reported chunk durations.

Usage:
  python3 render_v2.py <devotional.json> <out.wav> [--limit N] [--keep-takes]
"""
import array
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import narration_extract as ne          # noqa: E402
import timestretch as ts                # noqa: E402

# Voicebox's MLX/Metal backend aborts the whole process when two generations
# contend for a command encoder inside it — it does not fail the request, it
# calls abort(). Separate PROCESSES each get their own Metal context and run
# happily side by side, so parallelism here means several servers on several
# ports, one renderer each. VOICEBOX_API selects which one this process talks to.
API = os.environ.get("VOICEBOX_API", "http://127.0.0.1:17493")
PROFILE = "897d703c-b220-464b-9c81-3eb9fb5fafbd"   # founder-curated original

# Register → target words/sec of speech (spec §2).
TARGETS = {
    "title": 2.70, "scripture": 2.45, "teaching": 2.85,
    "reflection": 2.60, "prayer": 2.30, "takeaway": 2.60,
}
# Pause after a segment of this register, in seconds (spec §3 — never exceeds
# the 0.70s maximum measured in the founder's own speech).
PAUSE_AFTER = {
    "title": 0.70, "scripture": 0.70, "prayer": 0.70,
    "reflection": 0.70, "teaching": 0.55, "takeaway": 0.55,
}
SENTENCE_GAP = 0.40          # within a segment, between chunks
TRAILING_PAD = 1.00

MAX_WORDS = 40
MIN_WORDS = 8
SEEDS = [7, 11, 23]
CLARITY_MIN = 0.95

CREATED = []


def post(path, payload):
    req = urllib.request.Request(
        API + path, json.dumps(payload).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=600))


def get(path):
    return json.load(urllib.request.urlopen(API + path, timeout=60))


# ── verbatim comparison (phonetic) ───────────────────────────────────

_ORDINAL = re.compile(r"^(\d+)(st|nd|rd|th)$")
_ORD_WORD = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
             6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth"}
_ORD_TO_CARDINAL = {
    "first": "one", "second": "two", "third": "three", "fourth": "four",
    "fifth": "five", "sixth": "six", "seventh": "seven", "eighth": "eight",
    "ninth": "nine", "tenth": "ten",
}


def norm_words(t):
    """Lowercase, strip punctuation, and spell numbers out on BOTH sides.

    Whisper writes back what the voice said correctly as digits and ordinals
    ('1st Thessalonians chapter 5'), so comparing raw tokens scores a perfect
    reading at 0.50. Normalizing both sides removes that entire false-positive
    class.
    """
    t = t.lower().replace("’", "'")
    # Acronyms: "b.c." → "bc" before punctuation stripping turns it into "b c".
    t = re.sub(r"\b([a-z])\.([a-z])\.", r"\1\2", t)
    t = re.sub(r"[^a-z0-9' ]", " ", t)
    words = []
    for w in t.split():
        m = _ORDINAL.match(w)
        if m and int(m.group(1)) in _ORD_WORD:
            words.append(_ORD_WORD[int(m.group(1))])
        elif w.isdigit() and len(w) <= 4:
            words.extend(ne.num_to_words(w).replace("-", " ").split())
        else:
            words.append(w)
    # Ordinal → cardinal on both sides. Whisper writes a spoken "First
    # Thessalonians" as "1 Thessalonians"; there is no way to tell the two
    # apart from the transcript, so folding them stops a false alarm on every
    # numbered-book reference in the catalog.
    return [_ORD_TO_CARDINAL.get(w, w) for w in words]


# Near-homophones the ASR reliably mishears in this vocabulary. These are
# transcription artifacts, not speech defects; folding them stops the clarity
# gate rejecting good takes. Kept explicit and small so it never hides a real
# mispronunciation.
ASR_CONFUSIONS = {
    frozenset(("acts", "axe")), frozenset(("acts", "ax")),
    frozenset(("prophets", "profits")), frozenset(("prophet", "profit")),
    frozenset(("lord", "lard")), frozenset(("psalm", "some")),
    frozenset(("hosea", "hoseah")), frozenset(("yahweh", "yaweh")),
    frozenset(("israel", "isreal")), frozenset(("thee", "the")),
}


def soundex(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w:
        return ""
    codes = {**dict.fromkeys("bfpv", "1"), **dict.fromkeys("cgjkqsxz", "2"),
             **dict.fromkeys("dt", "3"), "l": "4",
             **dict.fromkeys("mn", "5"), "r": "6"}
    out, last = w[0], codes.get(w[0], "")
    for ch in w[1:]:
        c = codes.get(ch, "")
        if c and c != last:
            out += c
        if ch not in "hw":
            last = c
    return (out + "000")[:4].upper()


def clarity(reference, hypothesis):
    import difflib
    r, h = norm_words(reference), norm_words(hypothesis)
    sm = difflib.SequenceMatcher(a=r, b=h, autojunk=False)
    matched = sum(b.size for b in sm.get_matching_blocks())
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "replace":
            continue
        exp, got = r[i1:i2], h[j1:j2]
        # Word-boundary disagreement: "a way" vs "away", "north east" vs
        # "northeast". Identical speech, different transcription.
        if "".join(exp) == "".join(got):
            matched += i2 - i1
            continue
        if (i2 - i1) != (j2 - j1):
            continue
        if [soundex(x) for x in exp] == [soundex(x) for x in got]:
            matched += i2 - i1                # same sound, different spelling
        elif all(frozenset((a, b)) in ASR_CONFUSIONS
                 for a, b in zip(exp, got) if a != b):
            matched += i2 - i1                # known transcription confusion
    return min(matched, len(r)) / max(len(r), 1)


def transcribe(path):
    out = subprocess.run(
        ["curl", "-s", "-m", "600", "-X", "POST", f"{API}/transcribe",
         "-F", f"file=@{path}", "-F", "model=turbo"],
        capture_output=True, text=True)
    try:
        return json.loads(out.stdout).get("text", "")
    except Exception:
        return ""


# ── chunking ─────────────────────────────────────────────────────────

ABBREV = re.compile(
    r"\b(?:[A-Z]\.|Mr|Mrs|Ms|Dr|St|Rev|Prof|Jr|Sr|vs|etc|cf|ca|approx|ch|v|vv)\.",
)


def split_sentences(text):
    """Split on sentence enders, protecting initials and abbreviations
    ('C. S. Lewis' must not become two chunks) and numeric refs (10:12-13)."""
    protected = ABBREV.sub(lambda m: m.group(0).replace(".", "\x01"), text)
    protected = re.sub(r"(\d)\.(\d)",
                       lambda m: m.group(1) + "\x01" + m.group(2), protected)
    parts = re.split(r'(?<=[.!?"])\s+', protected)
    return [p.replace("\x01", ".").strip() for p in parts if p.strip()]


def chunk_text(text):
    """Sentence-pack → hard-split over-long → merge fragments.

    The merge MUST run last. Running it before the hard split (as v1 did) means
    split tails are never merged, which is how 'having one.' and 'until it
    repose in Thee."' reached the voice as standalone two- and five-word
    utterances — an audible stumble mid-paragraph.
    """
    sents = split_sentences(text)

    packed = []
    for s in sents:
        if packed and len((packed[-1] + " " + s).split()) <= MAX_WORDS:
            packed[-1] += " " + s
        else:
            packed.append(s)

    # Hard-split anything over the sidecar-stability limit (spec §9), choosing
    # a cut that leaves a viable tail rather than a stub.
    split = []
    for p in packed:
        w = p.split()
        while len(w) > MAX_WORDS:
            cut = MAX_WORDS
            for j in range(MAX_WORDS, MAX_WORDS // 2, -1):
                if w[j - 1].endswith((",", ";", ":", "—")):
                    cut = j
                    break
            # never strand a tail shorter than MIN_WORDS
            if 0 < len(w) - cut < MIN_WORDS:
                cut = max(MIN_WORDS, len(w) - MIN_WORDS)
            split.append(" ".join(w[:cut]))
            w = w[cut:]
        if w:
            split.append(" ".join(w))

    # Merge any remaining fragment into a neighbour, preferring backward so the
    # fragment finishes the clause it belongs to.
    out = []
    for piece in split:
        if out and len(piece.split()) < MIN_WORDS:
            out[-1] += " " + piece
        else:
            out.append(piece)
    if len(out) > 1 and len(out[0].split()) < MIN_WORDS:
        out[1] = out[0] + " " + out[1]
        out.pop(0)
    return out


# ── rendering ────────────────────────────────────────────────────────

def read_wav(path):
    w = wave.open(path, "rb")
    ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
    a = array.array("h")
    a.frombytes(w.readframes(n))
    w.close()
    if ch == 2:
        a = a[0::2]
    return a, sr


def render_chunk(text, tmp):
    """Render with seed retries until the phonetic clarity gate passes."""
    best = None
    for seed in SEEDS:
        try:
            gid = post("/generate", {
                "profile_id": PROFILE, "text": text, "language": "en",
                "engine": "qwen", "model_size": "1.7B", "seed": seed})["id"]
        except Exception as e:  # noqa: BLE001
            print(f"      generate failed: {e}", flush=True)
            continue
        CREATED.append(gid)
        status = None
        for _ in range(300):
            try:
                h = get(f"/history/{gid}")
            except Exception:
                time.sleep(3)
                continue
            status = h.get("status")
            if status in ("completed", "failed"):
                break
            time.sleep(2)
        if status != "completed":
            continue
        urllib.request.urlretrieve(f"{API}/audio/{gid}", tmp)
        c = clarity(text, transcribe(tmp))
        a, sr = read_wav(tmp)
        cand = {"seed": seed, "clarity": c, "samples": a, "sr": sr}
        if best is None or c > best["clarity"]:
            best = cand
        if c >= CLARITY_MIN:
            return best, False
    return best, True          # flagged: never cleared the gate


def cleanup(keep):
    if keep:
        print(f"  --keep-takes: leaving {len(CREATED)} generations")
        return
    n = 0
    for gid in CREATED:
        try:
            urllib.request.urlopen(urllib.request.Request(
                f"{API}/history/{gid}", method="DELETE"), timeout=30)
            n += 1
        except Exception:
            pass
    print(f"  cleanup: deleted {n}/{len(CREATED)} generations")


def main():
    dev_path, out_path = sys.argv[1], sys.argv[2]
    limit = 0
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    dev = json.load(open(dev_path))
    segs = ne.extract(dev)

    plan = []
    for s in segs:
        chunks = chunk_text(s["text"])
        for j, c in enumerate(chunks):
            plan.append({"register": s["register"], "label": s["label"],
                         "text": c, "last_in_segment": j == len(chunks) - 1})
    if limit:
        plan = plan[:limit]

    total_words = sum(len(p["text"].split()) for p in plan)
    print(f"{len(segs)} segments → {len(plan)} chunks, {total_words} words")

    tmp = out_path + ".tmp.wav"
    rendered, sr_ref = [], None
    t0 = time.time()
    for i, p in enumerate(plan):
        best, flagged = render_chunk(p["text"], tmp)
        if best is None:
            print(f"[{i+1}/{len(plan)}] {p['register']:10} FAILED | {p['text'][:50]}",
                  flush=True)
            continue
        sr_ref = sr_ref or best["sr"]
        words = len(p["text"].split())
        raw_rate = words / (len(best["samples"]) / best["sr"])
        stretched, factor, new_rate = ts.stretch_to_rate(
            best["samples"], best["sr"], words, TARGETS.get(p["register"], 2.8))
        rendered.append({**p, "samples": stretched, "sr": best["sr"],
                         "seed": best["seed"], "clarity": round(best["clarity"], 3),
                         "raw_rate": round(raw_rate, 2), "factor": factor,
                         "rate": new_rate, "flagged": flagged})
        mark = " ⚠" if flagged else ""
        print(f"[{i+1}/{len(plan)}] {p['register']:10} {raw_rate:4.2f}→{new_rate:4.2f} w/s "
              f"(x{factor}) clarity={best['clarity']:.2f} seed{best['seed']}{mark} | "
              f"{p['text'][:46]}", flush=True)

    if not rendered:
        print("nothing rendered")
        return

    frames = array.array("h")
    for i, r in enumerate(rendered):
        frames.extend(r["samples"])
        gap = (PAUSE_AFTER.get(r["register"], 0.55)
               if r["last_in_segment"] else SENTENCE_GAP)
        if i < len(rendered) - 1:
            frames.extend([0] * int(gap * sr_ref))
    frames.extend([0] * int(TRAILING_PAD * sr_ref))

    w = wave.open(out_path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr_ref)
    w.writeframes(frames.tobytes())
    w.close()
    if os.path.exists(tmp):
        os.unlink(tmp)

    manifest = {
        "source": dev_path,
        "profile_id": PROFILE,
        "chunks": [{k: r[k] for k in
                    ("register", "label", "text", "seed", "clarity",
                     "raw_rate", "factor", "rate", "flagged")} for r in rendered],
    }
    mpath = out_path.rsplit(".", 1)[0] + ".manifest.json"
    json.dump(manifest, open(mpath, "w"), indent=1)

    dur = len(frames) / sr_ref
    words = sum(len(r["text"].split()) for r in rendered)
    speech = sum(len(r["samples"]) / r["sr"] for r in rendered)
    flags = [r for r in rendered if r["flagged"]]
    low = [r for r in rendered if r["clarity"] < CLARITY_MIN]
    print(f"\nQA REPORT — {out_path}")
    print(f"  duration {dur/60:.1f} min ({dur:.1f}s) | {words} words")
    print(f"  speech rate {words/speech:.2f} w/s (speech-only, measured on output)")
    print(f"  mean clarity {sum(r['clarity'] for r in rendered)/len(rendered):.3f}")
    print(f"  chunks below clarity gate: {len(low)}/{len(rendered)}")
    print(f"  flagged: {len(flags)}")
    for r in flags[:10]:
        print(f"    ⚠ {r['clarity']:.2f} {r['text'][:70]}")
    print(f"  manifest: {mpath}")
    print(f"  wall clock {(time.time()-t0)/60:.1f} min")
    cleanup("--keep-takes" in sys.argv)


if __name__ == "__main__":
    main()
