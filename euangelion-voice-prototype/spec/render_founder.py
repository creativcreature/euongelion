#!/usr/bin/env python3
"""Render a devotional in the founder's cloned voice, for evaluation.

This is the clone path rebuilt on everything learned since it was abandoned.
The original attempt failed for reasons that are now fixed independently:

  - it read a fixed field list, so it spoke ~70% of the devotional. It now uses
    `narration_extract`, which reads everything, expands scripture references
    and Roman numerals, and never speaks a glyph.
  - it tried to reach narration pace by seed-hunting, which cannot work: the
    engine renders 3.0-3.6 w/s on prose regardless of seed, `instruct` is a
    no-op on the MLX path, and register-specific reference profiles change pace
    not at all. Pace is now corrected in post with WSOLA (`timestretch.py`).
  - its QA compared ASR output by spelling, scoring correct readings as broken.
    The gate is phonetic now.

Chunking differs from the Kokoro path by necessity. Kokoro renders 450-word
segments whole; qwen's sidecar becomes unstable past roughly 40 words, so this
chunks small and relies on the pause grammar to rebuild the paragraph.

Usage:
  python3 render_founder.py <devotional.json> <out.wav> [--engine qwen]
                            [--model-size 1.7B] [--target-wpm 162]
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
import narration_extract as ne              # noqa: E402
import timestretch as ts                    # noqa: E402
from render_kokoro import (                 # noqa: E402
    API, PAUSE_AFTER, TRAILING_PAD, post, get, read_wav, transcribe,
)
from render_v2 import clarity, chunk_text   # noqa: E402

# Default is the channel single-take profile. Measured across three seeds
# against the founder's real 84.2 Hz: interview 81.2 (off 3.0, clarity 0.96),
# channel-mixed 86.8 (off 2.6 but a 77-92 Hz spread — the voice would drift
# inside a long reading), channel single-take 86.0 (off 1.8, tight, clarity
# 1.00). Consistency across renders matters more than a marginally closer
# median, so the single-take set wins.
FOUNDER_PROFILE = "464bca4c-58e7-4ad1-8926-a4427910f41d"
CLARITY_MIN = 0.90
SEEDS = [7, 11]
CREATED = []


def render_chunk(text, engine, model_size, tmp):
    """Render one chunk, retrying seeds until the phonetic gate passes."""
    best = None
    for seed in SEEDS:
        body = {"profile_id": FOUNDER_PROFILE, "text": text, "language": "en",
                "engine": engine, "seed": seed}
        if model_size:
            body["model_size"] = model_size
        try:
            gid = post("/generate", body)["id"]
        except Exception as e:  # noqa: BLE001
            print(f"      generate failed: {str(e)[:90]}", flush=True)
            continue
        CREATED.append(gid)
        status = None
        for _ in range(400):
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
        samples, sr = read_wav(tmp)
        cand = {"seed": seed, "clarity": c, "samples": samples, "sr": sr}
        if best is None or c > best["clarity"]:
            best = cand
        if c >= CLARITY_MIN:
            return best, False
    return best, True


def cleanup():
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
    engine = sys.argv[sys.argv.index("--engine") + 1] if "--engine" in sys.argv else "qwen"
    model_size = (sys.argv[sys.argv.index("--model-size") + 1]
                  if "--model-size" in sys.argv else "1.7B")
    target_wpm = float(sys.argv[sys.argv.index("--target-wpm") + 1]
                       if "--target-wpm" in sys.argv else 162)
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    global FOUNDER_PROFILE
    if "--profile" in sys.argv:
        FOUNDER_PROFILE = sys.argv[sys.argv.index("--profile") + 1]
    target_ws = target_wpm / 60.0

    dev = json.load(open(dev_path))
    plan = []
    for seg in ne.extract(dev):
        for part in chunk_text(seg["text"]):
            plan.append({"register": seg["register"], "text": part})
    if limit:
        plan = plan[:limit]

    words_total = sum(len(p["text"].split()) for p in plan)
    print(f"{len(plan)} chunks, {words_total} words | engine {engine} "
          f"{model_size} | target {target_wpm:.0f} wpm", flush=True)

    tmp = out_path + ".tmp.wav"
    rendered, sr_ref = [], None
    t0 = time.time()
    for i, p in enumerate(plan):
        best, flagged = render_chunk(p["text"], engine, model_size, tmp)
        if best is None:
            print(f"[{i+1}/{len(plan)}] FAILED | {p['text'][:48]}", flush=True)
            continue
        sr_ref = sr_ref or best["sr"]
        words = len(p["text"].split())
        raw_rate = words / (len(best["samples"]) / best["sr"])
        stretched, factor, new_rate = ts.stretch_to_rate(
            best["samples"], best["sr"], words, target_ws)
        rendered.append({**p, "samples": stretched, "sr": best["sr"],
                         "clarity": round(best["clarity"], 3),
                         "raw_rate": round(raw_rate, 2), "factor": factor,
                         "rate": new_rate, "flagged": flagged})
        if (i + 1) % 10 == 0 or i == 0:
            el = time.time() - t0
            print(f"[{i+1}/{len(plan)}] {raw_rate:.2f}->{new_rate:.2f} w/s "
                  f"(x{factor}) clarity={best['clarity']:.2f} | "
                  f"{el/60:.1f}m elapsed, ~{(len(plan)-i-1)*el/(i+1)/60:.0f}m left",
                  flush=True)

    if not rendered:
        print("nothing rendered")
        return

    frames = array.array("h")
    for i, r in enumerate(rendered):
        frames.extend(r["samples"])
        if i < len(rendered) - 1:
            frames.extend([0] * int(PAUSE_AFTER.get(r["register"], 0.55) * sr_ref))
    frames.extend([0] * int(TRAILING_PAD * sr_ref))

    w = wave.open(out_path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr_ref)
    w.writeframes(frames.tobytes())
    w.close()
    if os.path.exists(tmp):
        os.unlink(tmp)

    dur = len(frames) / sr_ref
    words = sum(len(r["text"].split()) for r in rendered)
    low = [r for r in rendered if r["clarity"] < CLARITY_MIN]
    json.dump({"source": dev_path, "engine": engine, "voice": "founder-clone",
               "segments": [{k: r[k] for k in
                             ("register", "text", "clarity", "raw_rate",
                              "factor", "rate")} for r in rendered]},
              open(out_path.rsplit(".", 1)[0] + ".manifest.json", "w"), indent=1)

    print(f"\nQA REPORT — {out_path}")
    print(f"  duration {dur/60:.1f} min | {words} words | "
          f"pace {words/dur*60:.0f} wpm inclusive")
    print(f"  mean clarity {sum(r['clarity'] for r in rendered)/len(rendered):.3f}")
    print(f"  below gate: {len(low)}/{len(rendered)}")
    print(f"  mean stretch x{sum(r['factor'] for r in rendered)/len(rendered):.2f}")
    print(f"  wall clock {(time.time()-t0)/60:.1f} min")
    cleanup()


if __name__ == "__main__":
    main()
