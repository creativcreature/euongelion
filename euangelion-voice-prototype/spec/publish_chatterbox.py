#!/usr/bin/env python3
"""Publish a verified Chatterbox render into the live catalog.

`render_chatterbox.py` deliberately refuses to write `public/audio/` or
`src/data/audio-manifest.json` — it produces evaluation output, and the catalog
is mutated by a publish step alone, concurrently with other sessions. This is
that step. `render_kokoro.py --publish` is the Kokoro equivalent; this mirrors
its conventions exactly (afconvert, mono, flock, atomic rename) so the manifest
stays one shape no matter which engine produced a track.

WHAT IT REFUSES TO DO
---------------------
Publishing is where a bad render becomes a reader's problem, so every gate the
renderer applied is re-checked here against the sidecar rather than trusted:

  * `verified` must be true and `complete` must be true. A partial render
    carries no textHash by design; publishing one would assert that the track
    says everything the devotional says.
  * The sidecar's `textHash` must still match the devotional on disk. If the
    prose was edited after rendering, the audio is stale — it would be quietly
    saying something the page no longer shows.
  * Size is reported and sanity-bounded. Since SA-098/F-144, audio is served
    from R2 by `src/app/audio/[file]/route.ts` and STRIPPED from the asset
    bundle at deploy, and Cloudflare's 25 MiB per-asset limit no longer applies
    to tracks — an oversized track is now a warning, not a refusal.

PUBLISHING IS NOT FINISHED WHEN THIS EXITS
------------------------------------------
R2 is the serving path. After this writes `public/audio/`, run:

    ./scripts/upload-audio-to-r2.sh

`--remote` is not optional inside that script and it already passes it; without
it uploads land in the local miniflare store and the deployed Worker sees
nothing. This script prints the reminder on success.

CHAPTERS
--------
Derived here rather than by `build_chapters.py`, which reads the Kokoro
`renders/` directory and knows nothing about this path. The sidecar records, per
part, its `module_index`, its measured `duration` and the `pauseAfter` actually
applied — so chapter times are a running sum over that list, replicating the
stitcher's pause grammar exactly. Estimating from word counts drifts tens of
seconds over a 20-minute reading and lands mid-sentence.

Usage:
  python3 publish_chatterbox.py <rendered.m4a|rendered.wav> [--dry-run] [--force-stale]
"""
import fcntl
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne  # noqa: E402

AUDIO_DIR = os.path.join(REPO, "public", "audio")
MANIFEST_PATH = os.path.join(REPO, "src", "data", "audio-manifest.json")
DEVOTIONALS = os.path.join(REPO, "public", "devotionals")
BITRATE = 48000                      # mono speech, matches render_kokoro
WORKERS_ASSET_LIMIT = 25 * 1024 * 1024


def die(msg):
    raise SystemExit(f"publish refused: {msg}")


def sidecar_for(path):
    return path.rsplit(".", 1)[0] + ".manifest.json"


def chapters_from(sidecar):
    """Running sum over rendered parts, emitting one chapter per module."""
    gap = sidecar["pauseGrammar"]["sentenceGap"]
    out, t, seen = [], 0.0, None
    for seg in sidecar["segments"]:
        mod = seg.get("module_index")
        if mod != seen:
            label = (seg.get("heading") or seg.get("label")
                     or str(seg.get("register", "")).title() or "Section")
            out.append({"t": round(t, 1), "label": label, "module": mod})
            seen = mod
        t += seg.get("duration", 0.0)
        t += seg.get("pauseAfter", gap) if not seg.get("last_in_segment") else gap
    return out


def encode(src, dest):
    if src.lower().endswith(".m4a"):
        shutil.copy2(src, dest)
        return
    r = subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(BITRATE), "-c", "1",
         src, dest],
        capture_output=True, text=True)
    if r.returncode != 0:
        die(f"afconvert failed: {r.stderr.strip()[:300]}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__.strip().rsplit("Usage:", 1)[-1])
    render = os.path.abspath(args[0])
    dry = "--dry-run" in sys.argv
    force_stale = "--force-stale" in sys.argv

    mpath = sidecar_for(render)
    if not os.path.exists(mpath):
        die(f"no sidecar beside {os.path.basename(render)} — render first")
    side = json.load(open(mpath))

    if not side.get("complete"):
        die("sidecar says the render is incomplete (a --limit run?)")
    if not side.get("verified"):
        die(f"sidecar says verified=false; failures: {side.get('failures')}")
    thash = side.get("textHash")
    if not thash:
        die("sidecar carries no textHash")

    slug = os.path.basename(side["source"]).rsplit(".", 1)[0]
    dev_path = os.path.join(DEVOTIONALS, f"{slug}.json")
    staged = side["source"]

    # Staleness: the fingerprint must match the devotional the site will serve.
    if os.path.exists(dev_path):
        live_hash = ne.text_hash(json.load(open(dev_path)))
        if live_hash != thash and not force_stale:
            die(f"textHash mismatch — audio {thash} vs {os.path.relpath(dev_path, REPO)} "
                f"{live_hash}. Copy the staged devotional into public/devotionals/ "
                f"first, or the track will say what the page does not.")
    else:
        print(f"  note: {slug}.json is not in public/devotionals yet "
              f"(rendered from {os.path.relpath(staged, REPO)})")

    # Source audio: prefer an already-encoded m4a beside the wav.
    src = render
    m4a_sibling = render.rsplit(".", 1)[0] + ".m4a"
    if not render.lower().endswith(".m4a") and os.path.exists(m4a_sibling):
        src = m4a_sibling
    if not os.path.exists(src):
        die(f"no audio at {src}")

    dest = os.path.join(AUDIO_DIR, f"{slug}.m4a")
    chapters = chapters_from(side)
    words = sum(s.get("words", 0) for s in side["segments"])
    duration = side["duration"]
    voice = (side.get("profile") or {}).get("name") or "unknown"

    print(f"{slug}")
    print(f"  engine   {side.get('engine')}  ·  voice {voice!r}")
    print(f"  duration {duration/60:.1f} min  ·  {words} words  ·  "
          f"{len(chapters)} chapters  ·  textHash {thash}")
    if chapters:
        print(f"  first chapter t={chapters[0]['t']}s {chapters[0]['label']!r}; "
              f"last t={chapters[-1]['t']}s {chapters[-1]['label']!r}")
    bad = [c for c in chapters if c["t"] < 0 or c["t"] > duration]
    if bad:
        die(f"{len(bad)} chapter mark(s) fall outside the runtime")

    if dry:
        print(f"  --dry-run: would write {os.path.relpath(dest, REPO)} "
              f"and one manifest entry")
        return

    os.makedirs(AUDIO_DIR, exist_ok=True)
    encode(src, dest)
    size = os.path.getsize(dest)
    if size > WORKERS_ASSET_LIMIT:
        # Not fatal since SA-098: tracks are stripped from the asset bundle and
        # served from R2, so the per-asset ceiling does not apply to them.
        print(f"  warning: {size/1024/1024:.1f} MB exceeds the 25 MiB asset "
              f"limit — fine for R2-served audio, but check it is stripped")

    # The manifest is read-modify-written by every render and several sessions
    # share this tree, so hold an exclusive lock across read and write, then
    # swap atomically. Without both, the last writer silently drops entries the
    # others just added.
    lock = open(MANIFEST_PATH + ".lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    try:
        manifest = {}
        if os.path.exists(MANIFEST_PATH):
            try:
                manifest = json.load(open(MANIFEST_PATH))
            except Exception:
                manifest = {}
        manifest[slug] = {
            "src": f"/audio/{slug}.m4a",
            "duration": round(duration, 1),
            "words": words,
            "voice": voice,
            "engine": side.get("engine"),
            "bytes": size,
            "textHash": thash,
            "chapters": chapters,
        }
        tmp = MANIFEST_PATH + ".tmp"
        json.dump(dict(sorted(manifest.items())), open(tmp, "w"), indent=1)
        os.replace(tmp, MANIFEST_PATH)
        total = len(manifest)
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()

    print(f"  published: public/audio/{slug}.m4a ({size/1024/1024:.1f} MB) "
          f"→ manifest now lists {total} track(s)")
    print(f"  NEXT: ./scripts/upload-audio-to-r2.sh   "
          f"(R2 is the serving path — public/audio alone reaches nobody)")


if __name__ == "__main__":
    main()
