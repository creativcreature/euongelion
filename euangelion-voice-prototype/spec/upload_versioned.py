#!/usr/bin/env python3
"""Build the verified, content-versioned upload plan for R2.

Emits `slug|source-path|key|sha` per line, one per manifest track.

Why versioned keys: R2 objects are served with `immutable, max-age=1yr`. If a
track is ever re-scored under the same key, edge caches can keep serving the old
bytes for a year. Putting the content hash IN the key means new content is a new
URL, so the cache can never be wrong and never needs purging.

Nothing is emitted unverified: the file must decode, and its duration must match
the manifest within half a second, because chapter marks are absolute times and
drift moves every one after it.
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import produce as pr  # noqa: E402

SCORED = "euangelion-voice-prototype/scored"
manifest = json.load(open("src/data/audio-manifest.json"))

ready = drifted = broken = missing = 0
for slug, entry in sorted(manifest.items()):
    scored = f"{SCORED}/{slug}.m4a"
    inplace = f"public/audio/{slug}.m4a"
    if os.path.exists(scored) and os.path.getsize(scored) > 4096:
        src = scored
    elif entry.get("mix") and os.path.exists(inplace):
        src = inplace          # the original seven, scored in place
    else:
        missing += 1
        print(f"  NO SCORED SOURCE {slug}", file=sys.stderr)
        continue

    probe = f"/tmp/_uv_{os.getpid()}.wav"
    try:
        duration = len(pr.decode(src, probe)) / pr.SR
    except Exception as exc:                       # noqa: BLE001
        broken += 1
        print(f"  UNREADABLE {slug}: {type(exc).__name__}", file=sys.stderr)
        continue
    finally:
        if os.path.exists(probe):
            os.unlink(probe)

    if abs(duration - entry["duration"]) > 0.5:
        drifted += 1
        print(f"  DRIFT {slug}: {duration - entry['duration']:+.2f}s", file=sys.stderr)
        continue

    h = hashlib.sha1()
    with open(src, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    sha = h.hexdigest()[:10]
    print(f"{slug}|{src}|{slug}-{sha}.m4a|{sha}")
    ready += 1

print(f"  plan: {ready} ready | {missing} no source | {drifted} drifted | "
      f"{broken} unreadable", file=sys.stderr)
