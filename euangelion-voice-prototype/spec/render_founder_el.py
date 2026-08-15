#!/usr/bin/env python3
"""Render a full devotional in the founder's ElevenLabs voice.

The local clone path was abandoned; this is the IVC profile built from the THCA
interview audio, which is the take the founder judged "a lot better".

Why this exists separately from `render_kokoro.py`: ElevenLabs is a network TTS
with a per-request character ceiling, so a 25-minute reading has to be sent as
a series of requests and stitched back together locally. The stitching has to
reproduce the same pause grammar the Kokoro path uses, or the two voices pace
differently on the same devotional and cannot be compared fairly.

Chunks are cut at SEGMENT boundaries, never mid-sentence — a chunk boundary is
where the voice takes a breath, so splitting inside a sentence would put a seam
in the middle of a clause.

The API key is read from .env.local and never printed.

Usage:
  python3 render_founder_el.py <devotional.json> <out.wav> [--limit N]
"""
import array
import json
import os
import re
import subprocess
import sys
import time
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne              # noqa: E402
from render_kokoro import PAUSE_AFTER, TRAILING_PAD  # noqa: E402

ENV = os.path.join(REPO, ".env.local")
MODEL = "eleven_v3"
# Well under the model ceiling: smaller requests fail less often and a retry
# costs less, and the seam is inaudible because it lands on a pause anyway.
CHUNK_CHARS = 2400
SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.85,
    "style": 0.0,
    "use_speaker_boost": True,
}


def api_key():
    hits = [
        re.match(r"^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$", line).group(1)
        for line in open(ENV, encoding="utf-8")
        if re.match(r"^\s*ELEVENLABS_API_KEY\s*=\s*\S", line)
    ]
    if not hits:
        raise SystemExit("no ELEVENLABS_API_KEY in .env.local")
    return hits[-1].strip().strip("\"'")


def voice_id():
    path = os.environ.get("EL_VOICE_FILE", "")
    if path and os.path.exists(path):
        return open(path).read().strip()
    raise SystemExit("set EL_VOICE_FILE to the file holding the voice id")


def chunks(segments):
    """Group segments into requests, cutting only on segment boundaries."""
    out, cur, size = [], [], 0
    for seg in segments:
        n = len(seg["text"])
        if cur and size + n > CHUNK_CHARS:
            out.append(cur)
            cur, size = [], 0
        cur.append(seg)
        size += n
    if cur:
        out.append(cur)
    return out


def speak(text, key, vid, dst):
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS})
    for attempt in range(3):
        r = subprocess.run(
            ["curl", "-s", "--max-time", "900", "-w", "%{http_code}",
             "-X", "POST",
             f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
             "-H", f"xi-api-key: {key}",
             "-H", "Content-Type: application/json",
             "-d", body, "--output", dst],
            capture_output=True, text=True,
        )
        code = (r.stdout or "").strip()[-3:]
        if code == "200" and os.path.exists(dst) and os.path.getsize(dst) > 4096:
            return True
        print(f"    HTTP {code}, retry {attempt + 1}/3", flush=True)
        time.sleep(4)
    return False


def decode(src, dst, sr=24000):
    r = subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{sr}", "-c", "1", src, dst],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"decode failed: {r.stderr[:200]}")
    w = wave.open(dst, "rb")
    frames = w.readframes(w.getnframes())
    w.close()
    a = array.array("h")
    a.frombytes(frames)
    return a, sr


def main():
    dev_path, out_path = sys.argv[1], sys.argv[2]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0

    key, vid = api_key(), voice_id()
    dev = json.load(open(dev_path))
    segments = ne.extract(dev)
    if limit:
        segments = segments[:limit]
    groups = chunks(segments)
    words = sum(len(s["text"].split()) for s in segments)
    chars = sum(len(s["text"]) for s in segments)
    print(f"{os.path.basename(dev_path)}: {len(segments)} segments, {words} words, "
          f"{chars:,} chars -> {len(groups)} requests", flush=True)

    tmp = out_path + ".part"
    frames = array.array("h")
    sr = 24000
    t0 = time.time()
    for i, group in enumerate(groups, 1):
        # A chunk is spoken as one continuous take; the pause grammar is
        # applied between segments here rather than inside the request, so
        # both voices get identical spacing.
        text = " ".join(s["text"] for s in group)
        if not speak(text, key, vid, tmp + ".mp3"):
            raise SystemExit(f"chunk {i} failed after retries")
        samples, sr = decode(tmp + ".mp3", tmp + ".wav")
        frames.extend(samples)
        if i < len(groups):
            frames.extend([0] * int(PAUSE_AFTER.get(group[-1]["register"], 0.55) * sr))
        el = time.time() - t0
        print(f"  [{i}/{len(groups)}] {len(samples)/sr:5.1f}s  "
              f"({el/60:.1f}m elapsed, ~{(len(groups)-i)*el/i/60:.0f}m left)", flush=True)
    frames.extend([0] * int(TRAILING_PAD * sr))

    w = wave.open(out_path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(frames.tobytes())
    w.close()
    for ext in (".mp3", ".wav"):
        if os.path.exists(tmp + ext):
            os.unlink(tmp + ext)

    dur = len(frames) / sr
    print(f"\n{out_path}")
    print(f"  {dur/60:.1f} min | {words} words | {words/dur*60:.0f} wpm inclusive")
    print(f"  wall clock {(time.time()-t0)/60:.1f} min")


if __name__ == "__main__":
    main()
