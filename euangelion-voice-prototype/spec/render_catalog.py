#!/usr/bin/env python3
"""Render narration for the whole catalog, resumably.

Order: curated series first (149 devotionals, ~4.5 h), then bible-365 (365
devotionals, ~11 h). The curated series are what a reader actually lands on,
so they should have audio before the daily-reading bulk.

Resumable by design — anything already in src/data/audio-manifest.json is
skipped, so this can be stopped and restarted freely. One devotional per
subprocess so a single failure cannot take down the run.

Usage:
  python3 render_catalog.py [--voice am_michael] [--limit N] [--only PREFIX]
"""
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
DEVOTIONALS = os.path.join(REPO, "public", "devotionals")
# The manifest is a build input under src/, NOT a served asset — it must not
# sit in public/ where the /audio/* immutable cache rule would pin a stale
# copy for a year. Resume logic reads it, so pointing at the wrong path would
# silently re-render the entire catalog.
MANIFEST = os.path.join(REPO, "src", "data", "audio-manifest.json")
RENDERS = os.path.join(REPO, "euangelion-voice-prototype", "renders")
BULK_PREFIX = "bible-365"


def published():
    if not os.path.exists(MANIFEST):
        return set()
    try:
        return set(json.load(open(MANIFEST)))
    except Exception:
        return set()


def series_of(slug):
    m = re.match(r"^(.*)-day-\d+$", slug)
    return m.group(1) if m else slug


def day_of(slug):
    m = re.search(r"-day-(\d+)$", slug)
    return int(m.group(1)) if m else 0


def work_list(only=None):
    done = published()
    items = []
    for path in sorted(os.listdir(DEVOTIONALS)):
        if not path.endswith(".json"):
            continue
        slug = path[:-5]
        if slug in done:
            continue
        if only and not slug.startswith(only):
            continue
        try:
            dev = json.load(open(os.path.join(DEVOTIONALS, path)))
        except Exception:
            continue
        if not dev.get("modules"):
            continue
        items.append(slug)
    # curated series before the bulk daily-reading set; then series, then day
    items.sort(key=lambda s: (s.startswith(BULK_PREFIX), series_of(s), day_of(s)))
    return items


def main():
    voice = "am_michael"
    if "--voice" in sys.argv:
        voice = sys.argv[sys.argv.index("--voice") + 1]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None

    todo = work_list(only)
    if limit:
        todo = todo[:limit]
    os.makedirs(RENDERS, exist_ok=True)

    print(f"{len(todo)} devotionals to render | voice {voice}", flush=True)
    started = time.time()
    ok, failed = 0, []
    for i, slug in enumerate(todo, 1):
        src = os.path.join(DEVOTIONALS, f"{slug}.json")
        out = os.path.join(RENDERS, f"{slug}.wav")
        t0 = time.time()
        proc = subprocess.run(
            [sys.executable, os.path.join(HERE, "render_kokoro.py"),
             src, out, "--voice", voice, "--publish"],
            capture_output=True, text=True,
        )
        tail = [ln for ln in proc.stdout.splitlines()
                if ln.strip().startswith(("pace", "mean clarity", "published:",
                                          "duration"))]
        if proc.returncode != 0 or "published:" not in proc.stdout:
            failed.append(slug)
            err = (proc.stderr or proc.stdout).strip().splitlines()[-3:]
            print(f"[{i}/{len(todo)}] FAILED {slug}: {' | '.join(err)}", flush=True)
        else:
            ok += 1
            summary = " | ".join(x.strip() for x in tail)
            print(f"[{i}/{len(todo)}] {slug} ({time.time()-t0:.0f}s) {summary}",
                  flush=True)
        # keep the WAV only until it is encoded; the m4a is the deliverable
        for stale in (out, out + ".tmp.wav"):
            if os.path.exists(stale):
                os.unlink(stale)

        elapsed = time.time() - started
        rate = elapsed / i
        remaining = (len(todo) - i) * rate
        if i % 5 == 0 or i == len(todo):
            print(f"    -- {ok} ok, {len(failed)} failed, "
                  f"{elapsed/3600:.1f}h elapsed, ~{remaining/3600:.1f}h left",
                  flush=True)

    print(f"\nDONE: {ok} rendered, {len(failed)} failed, "
          f"{(time.time()-started)/3600:.1f}h")
    if failed:
        print("failed slugs: " + ", ".join(failed))
    m = json.load(open(MANIFEST))
    total = sum(v["duration"] for v in m.values())
    size = sum(v["bytes"] for v in m.values()) / 1024 / 1024
    print(f"manifest: {len(m)} tracks, {total/3600:.1f} h audio, {size:.0f} MB")


if __name__ == "__main__":
    main()
