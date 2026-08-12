#!/usr/bin/env python3
"""Fail if the published catalog uses more than one narrator voice.

A devotional series read by two different voices is an obvious defect to a
listener and completely invisible to text-accuracy checks — the words are all
correct, they are just spoken by two people. This happened during the voice
bake-off (three candidates rendered from the same devotional) and is exactly
the kind of thing that should be caught mechanically rather than by ear.

Usage:
  python3 verify_voice_lock.py [expected_voice]

Exit 1 on any mismatch so it can gate a build.
"""
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.abspath(
    os.path.join(HERE, "..", "..", "public", "audio", "manifest.json"))
CANONICAL_VOICE = "am_michael"


def main():
    expected = sys.argv[1] if len(sys.argv) > 1 else CANONICAL_VOICE
    if not os.path.exists(MANIFEST):
        print(f"no manifest at {MANIFEST} — nothing published yet")
        return 0

    manifest = json.load(open(MANIFEST))
    if not manifest:
        print("manifest is empty — nothing published yet")
        return 0

    voices = Counter(v.get("voice") for v in manifest.values())
    engines = Counter(v.get("engine") for v in manifest.values())

    print(f"{len(manifest)} published track(s)")
    for voice, n in voices.most_common():
        print(f"  voice {voice}: {n}")
    for engine, n in engines.most_common():
        print(f"  engine {engine}: {n}")

    problems = []
    if len(voices) > 1:
        problems.append(f"MIXED VOICES: {dict(voices)}")
    wrong = [k for k, v in manifest.items() if v.get("voice") != expected]
    if wrong:
        problems.append(
            f"{len(wrong)} track(s) are not the canonical voice '{expected}': "
            + ", ".join(wrong[:6]))
    missing = [k for k, v in manifest.items()
               if not os.path.exists(os.path.join(
                   os.path.dirname(MANIFEST), os.path.basename(v.get("src", ""))))]
    if missing:
        problems.append(f"{len(missing)} manifest entries have no audio file: "
                        + ", ".join(missing[:6]))

    if problems:
        print()
        for p in problems:
            print(f"FAIL: {p}")
        return 1

    total = sum(v["duration"] for v in manifest.values())
    size = sum(v["bytes"] for v in manifest.values()) / 1024 / 1024
    print(f"\nOK — one voice ({expected}), {total/60:.0f} min, {size:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
