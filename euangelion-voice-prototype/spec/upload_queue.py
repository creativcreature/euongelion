#!/usr/bin/env python3
"""Emit the verified upload queue for R2, one `slug|path` per line.

Nothing reaches R2 without passing here first. Scoring writes into the staging
directory WHILE uploads run, so a half-written file can pass a size check;
decoding proves the container is complete, and comparing duration proves the
chapter marks — which are absolute times — still land where they belong.

Reasons for exclusion go to stderr rather than being swallowed. An earlier
version used a bare `except: continue`, selected nothing, and gave no clue why.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import produce as pr  # noqa: E402

MANIFEST = "src/data/audio-manifest.json"
SCORED = "euangelion-voice-prototype/scored"
DRIFT_TOLERANCE_S = 0.5

manifest = json.load(open(MANIFEST))
ready = pending = drifted = broken = 0

for slug, entry in sorted(manifest.items()):
    if entry.get("engine") == "elevenlabs":
        src = f"public/audio/{slug}.m4a"      # already scored and shipped
    else:
        src = f"{SCORED}/{slug}.m4a"

    if not os.path.exists(src) or os.path.getsize(src) < 4096:
        pending += 1
        continue

    probe = f"/tmp/_uq_{os.getpid()}.wav"
    try:
        pcm = pr.decode(src, probe)
        duration = len(pcm) / pr.SR
    except Exception as exc:                  # noqa: BLE001
        broken += 1
        print(f"  UNREADABLE {slug}: {type(exc).__name__} {str(exc)[:90]}",
              file=sys.stderr)
        continue
    finally:
        if os.path.exists(probe):
            os.unlink(probe)

    drift = duration - entry["duration"]
    if abs(drift) > DRIFT_TOLERANCE_S:
        drifted += 1
        print(f"  DRIFT {slug}: {drift:+.2f}s — chapter marks would misplace",
              file=sys.stderr)
        continue

    ready += 1
    print(f"{slug}|{src}")

print(f"  queue: {ready} ready | {pending} not yet scored | "
      f"{drifted} drifted | {broken} unreadable", file=sys.stderr)
