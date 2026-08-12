#!/usr/bin/env python3
"""Derive audio chapters from real render timings.

Chapters let a listener jump to a section the way Audible does. That requires
TRUE timestamps — an estimate from word counts drifts by tens of seconds over a
20-minute reading and lands mid-sentence.

Where the numbers come from: every render writes a per-devotional manifest with
each segment's measured duration. Those manifests do not record which module a
segment came from, but extraction is deterministic — re-running
`narration_extract` reproduces the rendered segment list exactly (verified
across the corpus, text-for-text). So this zips a fresh extraction, which knows
module indices, against the stored durations, which know time.

Any devotional whose re-extraction does NOT match its render is skipped and
reported rather than emitted with wrong timestamps.

Timestamps replicate the stitcher's pause grammar exactly: after each segment
except the last, `render_kokoro` inserts PAUSE_AFTER[that segment's register].
Ignoring those gaps would drift roughly half a second per segment — about 20
seconds by the end of a long reading.

Usage: python3 build_chapters.py [--verbose]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

import narration_extract as ne          # noqa: E402
import render_kokoro as rk              # noqa: E402

RENDERS = os.path.join(REPO, "euangelion-voice-prototype", "renders")
DEVOTIONALS = os.path.join(REPO, "public", "devotionals")
MANIFEST = os.path.join(REPO, "src", "data", "audio-manifest.json")

# A module of one of these types starts its own chapter even with no heading —
# they are the landmarks a listener actually navigates by. Consecutive
# unheaded `teaching` folds into whatever chapter precedes it, which is what
# keeps the list navigable instead of becoming a segment dump.
LANDMARK_TYPES = {
    "scripture", "vocab", "reflection", "prayer", "takeaway",
    "comprehension", "profile", "interactive", "recap", "sabbath",
}

FRIENDLY = {
    "scripture": "Scripture",
    "vocab": "Word study",
    "reflection": "Reflect",
    "prayer": "Prayer",
    "takeaway": "Takeaway",
    "comprehension": "One question",
    "profile": "The voice behind today",
    "interactive": "A practice",
    "recap": "The week in one sitting",
    "sabbath": "Sabbath",
    "bridge": "Where this sits in the story",
    "story": "Story",
    "insight": "Insight",
}


def module_types(dev):
    return [m.get("type", "teaching") for m in (dev.get("modules") or [])]


def chapters_for(slug):
    """Return (chapters, error). chapters = [{t, label, module}]."""
    man_path = os.path.join(RENDERS, f"{slug}.manifest.json")
    dev_path = os.path.join(DEVOTIONALS, f"{slug}.json")
    if not (os.path.exists(man_path) and os.path.exists(dev_path)):
        return None, "no render manifest"

    man = json.load(open(man_path))
    dev = json.load(open(dev_path))

    # Rebuild the render plan and prove it matches what was actually spoken.
    plan = []
    for seg in ne.extract(dev):
        for part in rk.split_long(seg["text"]):
            plan.append({**seg, "text": part})
    spoken = man["segments"]
    if len(plan) != len(spoken):
        return None, f"segment count differs ({len(plan)} vs {len(spoken)})"
    for a, b in zip(plan, spoken):
        if a["text"] != b["text"]:
            return None, "segment text differs — needs re-render"

    types = module_types(dev)
    chapters = []
    t = 0.0
    last_module = None
    for i, (p, s) in enumerate(zip(plan, spoken)):
        mod = p["module_index"]
        if mod != last_module:
            mtype = types[mod - 1] if 1 <= mod <= len(types) else None
            heading = p.get("heading")
            starts = mod == 0 or bool(heading) or mtype in LANDMARK_TYPES
            if starts:
                if mod == 0:
                    label = "Opening"
                else:
                    label = heading or FRIENDLY.get(mtype, "Reading")
                # Never emit two chapters at the same second: a module that
                # contributes no audio would otherwise stack on its neighbour.
                if not chapters or round(t, 1) > chapters[-1]["t"]:
                    chapters.append(
                        {"t": round(t, 1), "label": label, "module": mod}
                    )
            last_module = mod
        t += s["duration"]
        if i < len(spoken) - 1:
            t += rk.PAUSE_AFTER.get(p["register"], 0.55)
    return chapters, None


def main():
    verbose = "--verbose" in sys.argv
    manifest = json.load(open(MANIFEST))
    built = skipped = 0
    problems = []
    for slug, entry in manifest.items():
        chs, err = chapters_for(slug)
        if err:
            skipped += 1
            problems.append((slug, err))
            entry.pop("chapters", None)
            continue
        entry["chapters"] = chs
        built += 1
        if verbose:
            print(f"{slug}: {len(chs)} chapters")

    json.dump(dict(sorted(manifest.items())), open(MANIFEST, "w"), indent=1)
    counts = [len(e["chapters"]) for e in manifest.values() if e.get("chapters")]
    print(f"chapters built for {built} devotionals, {skipped} skipped")
    if counts:
        counts.sort()
        print(f"  per devotional: min {counts[0]}, median "
              f"{counts[len(counts)//2]}, max {counts[-1]}")
    for slug, err in problems[:10]:
        print(f"  SKIPPED {slug}: {err}")


if __name__ == "__main__":
    main()
