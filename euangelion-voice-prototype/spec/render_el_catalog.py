#!/usr/bin/env python3
"""Render site devotionals in the founder's voice, atmosphere and all.

This is the production path for the founder-voice catalog. It differs from the
Kokoro renderer in three ways that matter:

  - the voice is a network TTS with a per-request character ceiling, so a
    25-minute reading is sent as a series of requests and stitched locally.
    Chunks are cut at SEGMENT boundaries, never mid-sentence, because a chunk
    boundary is where the voice takes a breath;
  - every track gets the atmospheric bed underneath it. The reference is
    *Inspired by The Bible Experience* — atmosphere is part of the work, not
    decoration laid over it — so a dry track is not a finished track here;
  - credits are finite and a failed run costs real money, so the character cost
    is reported up front and the run refuses to start if the budget will not
    cover the devotional.

Work order is newest-upload-first: the devotionals a reader is most likely to
open are the ones worth converting first.

Usage:
  python3 render_el_catalog.py <slug> [<slug> ...] [--dry-run] [--no-music]
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
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne                      # noqa: E402
from render_kokoro import PAUSE_AFTER, TRAILING_PAD  # noqa: E402

ENV = os.path.join(REPO, ".env.local")
DEVOTIONALS = os.path.join(REPO, "public", "devotionals")
AUDIO_DIR = os.path.join(REPO, "public", "audio")
MANIFEST = os.path.join(REPO, "src", "data", "audio-manifest.json")
PROTO = os.path.join(REPO, "euangelion-voice-prototype")
BED = os.path.join(PROTO, "MUSIC-low-strings.mp3")
VOICE_FILE = os.path.join(PROTO, "el-voice-id.txt")

MODEL = "eleven_v3"
SETTINGS = {"stability": 0.5, "similarity_boost": 0.85,
            "style": 0.0, "use_speaker_boost": True}
# Comfortably under the model ceiling: smaller requests fail less often, a
# retry costs fewer credits, and the seam lands on a pause either way.
CHUNK_CHARS = 2400
SR = 24000


def api_key():
    hits = [re.match(r"^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$", ln).group(1)
            for ln in open(ENV, encoding="utf-8")
            if re.match(r"^\s*ELEVENLABS_API_KEY\s*=\s*\S", ln)]
    if not hits:
        raise SystemExit("no ELEVENLABS_API_KEY in .env.local")
    return hits[-1].strip().strip("\"'")


def credits_left(key):
    req = urllib.request.Request("https://api.elevenlabs.io/v1/user",
                                 headers={"xi-api-key": key})
    sub = json.load(urllib.request.urlopen(req, timeout=60))["subscription"]
    return sub["character_limit"] - sub["character_count"], sub["character_limit"]


def chunks(segments):
    """Group segments into requests.

    Two rules, both about where a seam is allowed to fall:
      - never inside a segment, because a segment boundary is where the voice
        takes a breath and a mid-sentence seam is audible;
      - never across a module boundary, so every module begins a chunk. That
        makes each module's start time exactly the sum of the chunk durations
        before it — which is what turns chapters from an estimate into a
        measurement. Billing is per character, so the extra requests are free.
    """
    out, cur, size, mod = [], [], 0, None
    for seg in segments:
        n = len(seg["text"])
        if cur and (size + n > CHUNK_CHARS or seg["module_index"] != mod):
            out.append(cur)
            cur, size = [], 0
        cur.append(seg)
        size += n
        mod = seg["module_index"]
    if cur:
        out.append(cur)
    return out


# A module of one of these types starts its own chapter even with no heading —
# they are the landmarks a listener navigates by.
LANDMARK_TYPES = {"scripture", "vocab", "reflection", "prayer", "takeaway",
                  "comprehension", "profile", "interactive", "recap", "sabbath"}
FRIENDLY = {"scripture": "Scripture", "vocab": "Word study",
            "reflection": "Reflect", "prayer": "Prayer", "takeaway": "Takeaway",
            "comprehension": "One question", "profile": "The voice behind today",
            "interactive": "A practice", "recap": "The week in one sitting",
            "sabbath": "Sabbath", "bridge": "Where this sits in the story",
            "story": "Story", "insight": "Insight"}


def chapters_from(groups, times, dev):
    """Chapter marks from measured chunk durations, not estimates."""
    types = [m.get("type", "teaching") for m in (dev.get("modules") or [])]
    out, last = [], None
    for group, t in zip(groups, times):
        mod = group[0]["module_index"]
        if mod == last:
            continue
        last = mod
        mtype = types[mod - 1] if 1 <= mod <= len(types) else None
        heading = group[0].get("heading")
        if not (mod == 0 or heading or mtype in LANDMARK_TYPES):
            continue
        label = "Opening" if mod == 0 else (heading or FRIENDLY.get(mtype, "Reading"))
        if not out or round(t, 1) > out[-1]["t"]:
            out.append({"t": round(t, 1), "label": label, "module": mod})
    return out


# Every chunk that comes back is kept, keyed by exactly what produced it. A run
# that dies partway — a dropped connection, a transient 401 — resumes for free
# instead of paying again for audio already bought. This is the difference
# between a failed run costing minutes and costing credits.
CACHE = os.path.join(PROTO, ".el-chunk-cache")


def cache_key(text, vid):
    import hashlib
    stamp = json.dumps([vid, MODEL, SETTINGS, text], sort_keys=True)
    return hashlib.sha1(stamp.encode("utf-8")).hexdigest()[:20]


def speak(text, key, vid, dst):
    os.makedirs(CACHE, exist_ok=True)
    hit = os.path.join(CACHE, cache_key(text, vid) + ".mp3")
    if os.path.exists(hit) and os.path.getsize(hit) > 4096:
        with open(hit, "rb") as a, open(dst, "wb") as b:
            b.write(a.read())
        return "cached"

    # Backoff spans about six minutes. The API returned 401 mid-run once on a
    # key that was valid before and after, so a blip must not end a job that
    # has already spent credits.
    for attempt, wait in enumerate((5, 15, 45, 90, 180), 1):
        r = subprocess.run(
            ["curl", "-s", "-w", "%{http_code}", "--max-time", "900", "-X", "POST",
             f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
             "-H", f"xi-api-key: {key}", "-H", "Content-Type: application/json",
             "-d", body_for(text), "--output", dst],
            capture_output=True, text=True)
        code = (r.stdout or "").strip()[-3:]
        if code == "200" and os.path.exists(dst) and os.path.getsize(dst) > 4096:
            with open(dst, "rb") as a, open(hit, "wb") as b:
                b.write(a.read())
            return True
        # curl wrote the error body to --output; a bare status code is not
        # enough to tell a bad key from a rejected payload.
        detail = ""
        try:
            with open(dst, "rb") as fh:
                detail = fh.read(400).decode("utf-8", "replace").replace("\n", " ")
        except Exception:
            pass
        print(f"      HTTP {code}, retry {attempt}/5 in {wait}s :: {detail[:300]}",
              flush=True)
        time.sleep(wait)
    return False


def body_for(text):
    return json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS})


def decode(src, dst, sr=SR):
    """Decode to mono PCM. The RIFF chunks are walked by hand rather than read
    with `wave`, because afconvert emits WAVE_FORMAT_EXTENSIBLE (0xFFFE) on
    some inputs and the stdlib module rejects it outright."""
    r = subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{sr}", "-c", "1",
                        src, dst], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"decode failed: {r.stderr[:200]}")
    b = open(dst, "rb").read()
    i, data = 12, b""
    while i + 8 <= len(b):
        cid = b[i:i + 4]
        size = int.from_bytes(b[i + 4:i + 8], "little")
        if cid == b"data":
            data = b[i + 8:i + 8 + size]
            break
        i += 8 + size + (size & 1)
    a = array.array("h")
    a.frombytes(data[:len(data) // 2 * 2])
    return a


def render(slug, key, vid, music=True):
    dev_path = os.path.join(DEVOTIONALS, f"{slug}.json")
    dev = json.load(open(dev_path))
    segments = ne.extract(dev)
    groups = chunks(segments)
    words = sum(len(s["text"].split()) for s in segments)

    tmp = os.path.join(PROTO, f"_{slug}")
    frames = array.array("h")
    starts = []
    t0 = time.time()
    for i, group in enumerate(groups, 1):
        starts.append(len(frames) / SR)
        text = " ".join(s["text"] for s in group)
        if not speak(text, key, vid, tmp + ".mp3"):
            raise RuntimeError(f"chunk {i}/{len(groups)} failed after retries")
        frames.extend(decode(tmp + ".mp3", tmp + ".wav"))
        if i < len(groups):
            frames.extend([0] * int(PAUSE_AFTER.get(group[-1]["register"], 0.55) * SR))
        print(f"    [{i}/{len(groups)}] {(time.time()-t0)/60:.1f}m", flush=True)
    frames.extend([0] * int(TRAILING_PAD * SR))

    dry = tmp + ".dry.wav"
    w = wave.open(dry, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(frames.tobytes())
    w.close()

    os.makedirs(AUDIO_DIR, exist_ok=True)
    out = os.path.join(AUDIO_DIR, f"{slug}.m4a")
    if music:
        # The bed is the finished product, not a garnish. mix_atmosphere holds
        # the calibrated levels and matches loudness to the rest of the catalog.
        r = subprocess.run([sys.executable, os.path.join(HERE, "mix_atmosphere.py"),
                            dry, BED, out], capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"mix failed: {(r.stderr or r.stdout)[-300:]}")
        print("    " + "\n    ".join(r.stdout.strip().splitlines()[-3:]))
    else:
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000",
                        "-c", "1", dry, out], check=True, capture_output=True)

    dur = len(decode(out, tmp + ".chk.wav")) / SR
    for f in (".mp3", ".wav", ".dry.wav", ".chk.wav"):
        if os.path.exists(tmp + f):
            os.unlink(tmp + f)

    # Segment durations for chapter building come from re-measuring the render,
    # so the side manifest matches what build_chapters.py expects.
    # Locked read-modify-write: another renderer or session writing the manifest
    # between our read and our write would silently drop whichever entries lost
    # the race, and the only recovery is paying to render them again.
    import fcntl
    lock = open(MANIFEST + ".lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST))
    manifest[slug] = {
        "src": f"/audio/{slug}.m4a",
        "duration": round(dur, 1),
        "words": words,
        "voice": "chris-james-thca-master",
        "engine": "elevenlabs",
        "bytes": os.path.getsize(out),
        "textHash": ne.text_hash(dev),
        "chapters": chapters_from(groups, starts, dev),
    }
    tmp_m = MANIFEST + ".tmp"
    json.dump(dict(sorted(manifest.items())), open(tmp_m, "w"), indent=1)
    os.replace(tmp_m, MANIFEST)
    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()
    return dur, words, len(manifest[slug]["chapters"])


def main():
    slugs = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry_run = "--dry-run" in sys.argv
    music = "--no-music" not in sys.argv
    if not slugs:
        raise SystemExit("usage: render_el_catalog.py <slug> [<slug> ...]")

    key = api_key()
    vid = open(VOICE_FILE).read().strip()
    left, limit = credits_left(key)

    cost = 0
    for slug in slugs:
        dev = json.load(open(os.path.join(DEVOTIONALS, f"{slug}.json")))
        cost += sum(len(s["text"]) for s in ne.extract(dev))
    print(f"{len(slugs)} devotional(s) | {cost:,} characters")
    print(f"credits: {left:,} of {limit:,} remaining")
    if cost > left:
        raise SystemExit(f"STOP: needs {cost:,}, only {left:,} left. "
                         f"Nothing rendered, nothing spent.")
    print(f"after this run: {left - cost:,} remaining\n")
    if dry_run:
        return

    failed = []
    for i, slug in enumerate(slugs, 1):
        print(f"[{i}/{len(slugs)}] {slug}", flush=True)
        try:
            dur, words, nch = render(slug, key, vid, music)
        except Exception as e:              # noqa: BLE001
            # One bad devotional must not strand the rest of the run. Its
            # finished chunks are cached, so retrying it later is free.
            failed.append(slug)
            print(f"    FAILED: {str(e)[:160]}\n", flush=True)
            continue
        left, _ = credits_left(key)
        print(f"    -> {dur/60:.1f} min | {words} words | "
              f"{words/dur*60:.0f} wpm | {nch} chapters | "
              f"{left:,} credits left\n", flush=True)
    if failed:
        print(f"{len(failed)} failed, rerun free from cache: {' '.join(failed)}")


if __name__ == "__main__":
    main()
