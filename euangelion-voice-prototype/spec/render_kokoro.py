#!/usr/bin/env python3
"""Euangelion narration renderer — Kokoro preset narrator.

WHY THIS REPLACES THE CLONE PATH
--------------------------------
Cloning the founder's voice from conversational interview audio and then
slowing it in post was the wrong method. Measured, the clone stack could not
reach narration pace natively (3.0-3.6 w/s against a 2.5-2.8 target), the
`instruct` field was a no-op, reference profiles did not move pacing at all,
and every take had to be time-stretched ~1.35x — which is audible.

Kokoro-82M ships purpose-built narration voices. Measured on the same
devotional text:

  voice        inclusive pace   natural pauses   verbatim
  am_michael      164 wpm            19            100%
  bm_lewis        168 wpm            23            100%
  bm_george       170 wpm            22            100%

Professional audiobook narration is 150-170 wpm. `am_michael` lands dead
centre with NO time-stretch, NO seed hunting, and NO chunking — it renders a
352-word segment whole in 12s at 164 wpm with 44 natural pauses.

Rendering whole segments matters: prosody arcs across a paragraph instead of
resetting every 40 words, which is what made the chunked clone takes sound
stitched.

Usage:
  python3 render_kokoro.py <devotional.json> <out.wav> [--voice am_michael]
                           [--limit N] [--publish]

`--publish` encodes the result to AAC with macOS `afconvert` (no ffmpeg needed)
and registers it in `src/data/audio-manifest.json`, which is what the in-app
player reads. 21.7 min of speech comes out at ~8 MB, well under the 25 MiB
Cloudflare Workers per-asset limit.
"""
import array
import json
import os
import sys
import time
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import narration_extract as ne          # noqa: E402
from render_v2 import clarity, transcribe, post, get, API  # noqa: E402

DEFAULT_VOICE = "am_michael"

# Pause after a segment of this register (spec §3 pause grammar).
PAUSE_AFTER = {
    "title": 0.90, "scripture": 0.70, "prayer": 0.70,
    "reflection": 0.70, "teaching": 0.55, "takeaway": 0.55,
}
TRAILING_PAD = 1.0

# Kokoro handles long text well, but keep a ceiling for engine stability.
MAX_SEGMENT_WORDS = 450
CLARITY_MIN = 0.95
CREATED = []


def load_overrides():
    """Spoken overrides for terms the narrator mispronounces.

    Only what is SENT to the engine changes; the devotional text is untouched,
    so the reading stays verbatim.
    """
    path = os.path.join(HERE, "pronunciation-overrides.json")
    try:
        data = json.load(open(path)).get("overrides", {})
    except Exception:
        return {}
    return {k.lower(): v for k, v in data.items() if isinstance(v, str)}


OVERRIDES = load_overrides()


def apply_overrides(text):
    if not OVERRIDES:
        return text
    import re as _re

    def sub(m):
        return OVERRIDES.get(m.group(0).lower(), m.group(0))

    pattern = _re.compile(
        r"\b(" + "|".join(_re.escape(k) for k in sorted(OVERRIDES, key=len, reverse=True)) + r")\b",
        _re.IGNORECASE,
    )
    return pattern.sub(sub, text)


def ensure_profile(voice_id):
    for p in get("/profiles"):
        if (p.get("preset_voice_id") == voice_id
                and p.get("preset_engine") == "kokoro"):
            return p["id"]
    return post("/profiles", {
        "name": f"Kokoro — {voice_id}",
        "description": "Euangelion narration voice (preset, not a clone).",
        "language": "en",
        "voice_type": "preset",
        "preset_engine": "kokoro",
        "preset_voice_id": voice_id,
        "default_engine": "kokoro",
    })["id"]


def split_long(text):
    """Only split segments past the stability ceiling, at a sentence boundary."""
    words = text.split()
    if len(words) <= MAX_SEGMENT_WORDS:
        return [text]
    out, buf = [], []
    for sentence in text.replace("? ", "?\x00").replace("! ", "!\x00") \
                        .replace(". ", ".\x00").split("\x00"):
        if len((" ".join(buf + [sentence])).split()) > MAX_SEGMENT_WORDS and buf:
            out.append(" ".join(buf))
            buf = [sentence]
        else:
            buf.append(sentence)
    if buf:
        out.append(" ".join(buf))
    return out


def read_wav(path):
    w = wave.open(path, "rb")
    ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
    a = array.array("h")
    a.frombytes(w.readframes(n))
    w.close()
    if ch == 2:
        a = a[0::2]
    return a, sr


def render_segment(pid, text, tmp):
    spoken = apply_overrides(text)
    gid = post("/generate", {"profile_id": pid, "text": spoken,
                             "language": "en", "engine": "kokoro"})["id"]
    CREATED.append(gid)
    status = None
    for _ in range(600):
        try:
            h = get(f"/history/{gid}")
        except Exception:
            time.sleep(2)
            continue
        status = h.get("status")
        if status in ("completed", "failed"):
            break
        time.sleep(2)
    if status != "completed":
        return None, 0.0
    urllib.request.urlretrieve(f"{API}/audio/{gid}", tmp)
    # Score against what was actually spoken, so an override is not counted as
    # a misreading of the source.
    return read_wav(tmp), clarity(spoken, transcribe(tmp))


REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
AUDIO_DIR = os.path.join(REPO, "public", "audio")
# The manifest is a BUILD INPUT, not a served asset. Keeping it out of
# public/ is what stops it inheriting the /audio/* immutable cache rule —
# _headers has no negation syntax, so a path exception there merely appends
# a second, contradictory Cache-Control instead of overriding.
MANIFEST_PATH = os.path.join(REPO, "src", "data", "audio-manifest.json")
BITRATE = 48000          # mono speech: transparent, ~8 MB for 22 minutes


def publish(wav_path, dev_path, voice, duration_s, words, text_hash=None):
    """Encode to AAC and register in the manifest the app reads."""
    import subprocess
    slug = os.path.basename(dev_path).rsplit(".", 1)[0]
    os.makedirs(AUDIO_DIR, exist_ok=True)
    out = os.path.join(AUDIO_DIR, f"{slug}.m4a")
    r = subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(BITRATE), "-c", "1",
         wav_path, out],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f"  publish FAILED: {r.stderr.strip()[:200]}")
        return None

    # The manifest is read-modify-written by every render. Shards run several
    # renders at once, so without a lock the last writer silently drops the
    # entries the others just added. flock is advisory and process-wide, which
    # is exactly the scope here: one lock file, held across read and write.
    import fcntl
    manifest_path = MANIFEST_PATH
    lock_path = manifest_path + ".lock"
    lock = open(lock_path, "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            manifest = json.load(open(manifest_path))
        except Exception:
            manifest = {}
    manifest[slug] = {
        "src": f"/audio/{slug}.m4a",
        "duration": round(duration_s, 1),
        "words": words,
        "voice": voice,
        "engine": "kokoro",
        "bytes": os.path.getsize(out),
        # Fingerprint of the text this track actually says. render_catalog.py
        # compares it against the devotional on disk, so an edited devotional
        # re-renders instead of keeping audio that no longer matches the page.
        "textHash": text_hash,
    }
    # Write via a temp file and rename: a reader that opens the manifest while
    # this is running sees either the old file or the new one, never a partial.
    tmp_manifest = manifest_path + ".tmp"
    json.dump(dict(sorted(manifest.items())), open(tmp_manifest, "w"), indent=1)
    os.replace(tmp_manifest, manifest_path)
    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()
    mb = os.path.getsize(out) / 1024 / 1024
    print(f"  published: public/audio/{slug}.m4a ({mb:.1f} MB) "
          f"→ manifest now lists {len(manifest)} track(s)")
    return out


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
    voice = DEFAULT_VOICE
    if "--voice" in sys.argv:
        voice = sys.argv[sys.argv.index("--voice") + 1]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0

    dev = json.load(open(dev_path))
    segs = ne.extract(dev)
    plan = []
    for s in segs:
        for part in split_long(s["text"]):
            plan.append({"register": s["register"], "label": s["label"], "text": part})
    if limit:
        plan = plan[:limit]

    pid = ensure_profile(voice)
    total_words = sum(len(p["text"].split()) for p in plan)
    print(f"{len(segs)} segments → {len(plan)} renders, {total_words} words "
          f"| voice {voice}")

    tmp = out_path + ".tmp.wav"
    rendered, sr_ref = [], None
    t0 = time.time()
    for i, p in enumerate(plan):
        res, clar = render_segment(pid, p["text"], tmp)
        if res is None:
            print(f"[{i+1}/{len(plan)}] {p['register']:10} FAILED | {p['text'][:44]}",
                  flush=True)
            continue
        samples, sr = res
        sr_ref = sr_ref or sr
        words = len(p["text"].split())
        dur = len(samples) / sr
        rendered.append({**p, "samples": samples, "sr": sr, "clarity": round(clar, 3),
                         "duration": round(dur, 2),
                         "wpm": round(words / dur * 60) if dur else 0})
        mark = " ⚠" if clar < CLARITY_MIN else ""
        print(f"[{i+1}/{len(plan)}] {p['register']:10} {words:4}w "
              f"{dur:6.1f}s {rendered[-1]['wpm']:4} wpm "
              f"clarity={clar:.2f}{mark} | {p['text'][:40]}", flush=True)

    if not rendered:
        print("nothing rendered")
        return

    frames = array.array("h")
    for i, r in enumerate(rendered):
        frames.extend(r["samples"])
        if i < len(rendered) - 1:
            gap = PAUSE_AFTER.get(r["register"], 0.55)
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
        "source": dev_path, "engine": "kokoro", "voice": voice,
        "segments": [{k: r[k] for k in
                      ("register", "label", "text", "clarity", "duration", "wpm")}
                     for r in rendered],
    }
    mpath = out_path.rsplit(".", 1)[0] + ".manifest.json"
    json.dump(manifest, open(mpath, "w"), indent=1)

    dur = len(frames) / sr_ref
    words = sum(len(r["text"].split()) for r in rendered)
    low = [r for r in rendered if r["clarity"] < CLARITY_MIN]
    print(f"\nQA REPORT — {out_path}")
    print(f"  duration {dur/60:.1f} min ({dur:.0f}s) | {words} words | voice {voice}")
    print(f"  pace {words/dur*60:.0f} wpm inclusive "
          f"(audiobook narration band 150-170)")
    print(f"  mean clarity {sum(r['clarity'] for r in rendered)/len(rendered):.3f}")
    print(f"  segments below clarity gate: {len(low)}/{len(rendered)}")
    for r in low[:8]:
        print(f"    ⚠ {r['clarity']:.2f} {r['text'][:66]}")
    print(f"  manifest: {mpath}")
    print(f"  wall clock {(time.time()-t0)/60:.1f} min")
    if "--publish" in sys.argv:
        publish(out_path, dev_path, voice, dur, words, ne.text_hash(dev))
    cleanup("--keep-takes" in sys.argv)


if __name__ == "__main__":
    main()
