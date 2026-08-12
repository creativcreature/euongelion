#!/usr/bin/env python3
"""Euangelion narration renderer — implements NARRATION-PACING-SPEC v0.1.

Repeatable for any devotional: extracts spoken segments from a devotional JSON
(modules format), shapes text per spec §4, renders each chunk through Voicebox
with rate-targeted seed-hunting (§5), and stitches with the founder's measured
pause grammar (§3). Prints a QA report.

Usage:
  python3 render_devotional.py <devotional.json> <pacing-rules.json> <out.wav> [--keep-takes]

Requires: Voicebox running on 127.0.0.1:17493 with the founder voice profile.

Disk hygiene (spec §7): every generation this run creates — winning takes AND
rejected seed-hunt takes — is deleted from Voicebox (DB row + WAV on disk)
after the stitched output is written. The only artifacts that persist are the
output WAV and a .manifest.json beside it recording chunk → (text, seed, rate),
which makes any chunk exactly reproducible. Pass --keep-takes to skip deletion
when debugging.
"""

import json
import re
import sys
import time
import urllib.request
import wave
import array

API = "http://127.0.0.1:17493"
PROFILE_ID = "897d703c-b220-464b-9c81-3eb9fb5fafbd"  # James — Founder Voice


def post(path, payload):
    req = urllib.request.Request(
        API + path, json.dumps(payload).encode(), {"Content-Type": "application/json"}
    )
    return json.load(urllib.request.urlopen(req, timeout=120))


def get(path):
    return json.load(urllib.request.urlopen(API + path, timeout=30))


# ── Spec §4.5: strip for speech (mirrors src/lib/audio/segments.ts) ──

def to_speech(raw):
    if not raw:
        return ""
    s = raw
    s = re.sub(r"\{\{wn:[a-z0-9-]+\|([^}]*)\}\}", r"\1", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", s)
    s = re.sub(r"`{1,3}([^`]*)`{1,3}", r"\1", s)
    s = re.sub(r"^#{1,6}\s+", "", s, flags=re.M)
    s = re.sub(r"^>\s?", "", s, flags=re.M)
    s = re.sub(r"^\s*[-*+]\s+", "", s, flags=re.M)
    s = re.sub(r"^\s*\d+\.\s+", "", s, flags=re.M)
    return re.sub(r"\s+", " ", s).strip()


# ── Segment extraction: devotional JSON → (module_type, text) list ──

MODULE_TEXT_FIELDS = [
    "passage", "definition", "usage", "content", "keyInsight", "ancientTruth",
    "modernApplication", "connectionPoint", "prompt", "prayerText",
    "breathPrayer", "commitment", "explanation", "invitation",
]


def extract_segments(dev):
    segs = [("title", f"{dev.get('title', '')}. {dev.get('subtitle', '')}")]
    for m in dev.get("modules", []):
        t = m.get("type", "teaching")
        if t in ("inline-image", "art", "pullquote"):
            continue
        if t == "scripture":
            segs.append(("scripture", f"{m.get('reference', '')}. {m.get('passage', '')}"))
            continue
        if t == "sabbath":
            if m.get("invitation"):
                segs.append(("reflection", m["invitation"]))
            if m.get("prayerText"):
                segs.append(("prayer", m["prayerText"]))
            continue
        text = ". ".join(m[f] for f in MODULE_TEXT_FIELDS if m.get(f))
        label = t if t in ("reflection", "prayer", "insight", "story", "takeaway") else "teaching"
        if text:
            segs.append((label, text))
    return [(label, to_speech(tx)) for label, tx in segs if to_speech(tx)]


# ── Spec §4.2–4.4 (v0.1.1): paragraph packing ──
# Sentence-level chunks caused prosody resets every few seconds (§8). Pack
# sentences greedily into paragraph chunks up to max_chunk_words so the engine
# keeps its natural intonation arc; the stitcher only pauses BETWEEN chunks.

def chunk(label, text, rules):
    maxw = rules["engine"]["max_chunk_words"]
    min_words = rules["text_shaping"]["min_chunk_words"]
    if label == "scripture":
        for sep in rules["text_shaping"]["scripture_split_extra"]:
            text = text.replace(sep + " ", sep + "\x00")
    sents = [p.strip() for p in re.split(r'(?<=[.!?"])\s+|\x00', text) if p.strip()]
    packed = []
    for s in sents:
        if packed and len((packed[-1] + " " + s).split()) <= maxw:
            packed[-1] = packed[-1] + " " + s
        else:
            packed.append(s)
    # never leave a fragment shorter than min_words on its own
    if len(packed) > 1 and len(packed[-1].split()) < min_words:
        tail = packed.pop()
        packed[-1] = packed[-1] + " " + tail
    # hard-split any single sentence longer than maxw (sidecar stability, §9)
    out = []
    for m in packed:
        words = m.split()
        while len(words) > maxw:
            cut = maxw
            for i in range(maxw, maxw // 2, -1):
                if words[i - 1].endswith((",", ";", "—")):
                    cut = i
                    break
            out.append(" ".join(words[:cut]))
            words = words[cut:]
        out.append(" ".join(words))
    return out


def apply_pronunciation(text, rules):
    for word, spoken in rules.get("pronunciation_map", {}).items():
        if word != spoken:
            text = re.sub(rf"\b{re.escape(word)}\b", spoken, text)
    return text


# ── Spec §5 (v0.1.1): clarity-gated take selection ──
# v0.1's rate-only picker adversely selected mumbled takes (slow ≈ degenerate,
# §8). Now every take is round-tripped through Whisper and must match its own
# text (clarity ≥ threshold) before rate is even considered. Selection order:
# first CLEAR take inside the rate band wins; else clearest take wins.

CREATED_GIDS = []  # every generation this run makes; swept in cleanup (§7)


def _norm_words(t):
    return re.sub(r"[^a-z0-9' ]", " ", t.lower()).split()


def clarity(reference_text, audio_gid, out_dir):
    """Whisper round-trip: 1.0 = transcript matches the chunk text exactly."""
    import difflib
    import subprocess
    tmp = out_dir + ".clar.tmp.wav"
    urllib.request.urlretrieve(f"{API}/audio/{audio_gid}", tmp)
    out = subprocess.run(
        ["curl", "-s", "-m", "120", "-X", "POST", f"{API}/transcribe",
         "-F", f"file=@{tmp}", "-F", "model=turbo"],
        capture_output=True, text=True)
    try:
        hyp = json.loads(out.stdout)["text"]
    except Exception:
        return 0.0
    r, h = _norm_words(reference_text), _norm_words(hyp)
    sm = difflib.SequenceMatcher(a=r, b=h)
    return sum(b.size for b in sm.get_matching_blocks()) / max(len(r), 1)


def render_chunk(text, label, rules, out_dir):
    tgt = rules["module_targets_ws"].get(label, rules["module_targets_ws"]["default"])
    target, tol = tgt["target"], tgt["tolerance"]
    clar_min = rules["qa"]["clarity_threshold"]
    seeds = [rules["engine"]["primary_seed"]] + rules["engine"]["hunt_seeds"]
    wc = len(text.split())
    takes = []
    for seed in seeds:
        status, h = None, {}
        for _ in range(rules["engine"]["retry_on_failure"] + 1):
            try:
                r = post("/generate", {
                    "profile_id": PROFILE_ID, "text": text, "language": "en",
                    "engine": rules["engine"]["name"],
                    "model_size": rules["engine"]["model_size"], "seed": seed,
                })
                gid = r["id"]
                CREATED_GIDS.append(gid)
                for _ in range(120):
                    try:
                        h = get(f"/history/{gid}")
                    except Exception:
                        time.sleep(8)
                        continue
                    status = h.get("status")
                    if status in ("completed", "failed"):
                        break
                    time.sleep(3)
            except Exception:
                status = "error"
                time.sleep(10)
            if status == "completed":
                break
        if status == "completed" and h.get("duration"):
            rate = wc / h["duration"]
            c = clarity(text, gid, out_dir)
            takes.append((gid, rate, seed, c))
            if c >= clar_min and abs(rate - target) <= tol:
                return gid, rate, seed, c, len(takes), False  # clear + in band
    if not takes:
        return None, None, None, 0.0, len(seeds), True
    clear = [t for t in takes if t[3] >= clar_min]
    if clear:
        best = min(clear, key=lambda t: abs(t[1] - target))
        return best[0], best[1], best[2], best[3], len(takes), False
    best = max(takes, key=lambda t: t[3])  # nothing clear: least-bad, flagged
    return best[0], best[1], best[2], best[3], len(takes), True


def cleanup(keep_takes):
    """Spec §7: delete every generation this run created (row + WAV on disk)."""
    if keep_takes:
        print(f"  --keep-takes: leaving {len(CREATED_GIDS)} generations in Voicebox")
        return
    deleted = 0
    for gid in CREATED_GIDS:
        try:
            req = urllib.request.Request(f"{API}/history/{gid}", method="DELETE")
            urllib.request.urlopen(req, timeout=30)
            deleted += 1
        except Exception:
            pass
    print(f"  cleanup: deleted {deleted}/{len(CREATED_GIDS)} generations from Voicebox")


# ── Spec §3: pause grammar stitch ──

def gap_between(prev_label, next_label, prev_text, pg):
    if prev_label == next_label:
        return pg["sentence_same_module"]
    if prev_label == "scripture" or next_label == "scripture":
        return pg["scripture_boundary"]
    if next_label == "prayer":
        return pg["before_prayer"]
    if prev_text.rstrip().endswith("?"):
        return pg["after_question"]
    return pg["module_boundary"]


def main():
    dev_path, rules_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    dev = json.load(open(dev_path))
    rules = json.load(open(rules_path))
    pg = rules["pause_grammar_s"]

    plan = []
    for label, text in extract_segments(dev):
        for c in chunk(label, text, rules):
            plan.append((label, apply_pronunciation(c, rules)))
    print(f"{len(plan)} chunks from {dev_path}")

    rendered = []
    for i, (label, text) in enumerate(plan):
        gid, rate, seed, clar, n_takes, flag = render_chunk(text, label, rules, out_path)
        mark = " ⚠ FLAG" if flag else ""
        print(f"[{i + 1}/{len(plan)}] {label:11} "
              f"{f'{rate:.2f}' if rate else 'FAILED':>6} w/s "
              f"clarity={clar:.2f} ({n_takes} take{'s' if n_takes > 1 else ''}){mark} | {text[:60]}", flush=True)
        if gid:
            rendered.append((label, text, gid, rate, seed, flag))

    frames = array.array("h")
    sr_ref = None
    for i, (label, text, gid, rate, seed, flag) in enumerate(rendered):
        tmp = out_path + ".chunk.tmp.wav"
        urllib.request.urlretrieve(f"{API}/audio/{gid}", tmp)
        w = wave.open(tmp, "rb")
        ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
        a = array.array("h")
        a.frombytes(w.readframes(n))
        w.close()
        if ch == 2:
            a = a[0::2]
        if sr_ref is None:
            sr_ref = sr
        if i > 0:
            prev_label, prev_text = rendered[i - 1][0], rendered[i - 1][1]
            frames.extend([0] * int(gap_between(prev_label, label, prev_text, pg) * sr_ref))
        frames.extend(a)
    frames.extend([0] * int(pg["trailing_pad"] * sr_ref))

    w = wave.open(out_path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr_ref)
    w.writeframes(frames.tobytes())
    w.close()

    import os
    for suffix in (".chunk.tmp.wav", ".clar.tmp.wav"):
        tmp = out_path + suffix
        if os.path.exists(tmp):
            os.unlink(tmp)

    manifest = {
        "spec_version": rules["version"],
        "source": dev_path,
        "profile_id": PROFILE_ID,
        "engine": rules["engine"],
        "chunks": [
            {"label": l, "text": t, "seed": s, "rate_ws": round(r, 3), "flagged": f}
            for l, t, _, r, s, f in rendered
        ],
    }
    manifest_path = out_path.rsplit(".", 1)[0] + ".manifest.json"
    json.dump(manifest, open(manifest_path, "w"), indent=1)

    total_words = sum(len(t.split()) for _, t, _, _, _, _ in rendered)
    speech_s = sum(len(t.split()) / r for _, t, _, r, _, _ in rendered if r)
    flags = [t for _, t, _, _, _, f in rendered if f]
    print(f"\nQA REPORT — {out_path}")
    print(f"  duration {len(frames) / sr_ref:.1f}s | {total_words} words | "
          f"overall speech rate {total_words / speech_s:.2f} w/s")
    print(f"  flagged chunks: {len(flags)}")
    for t in flags:
        print(f"    ⚠ {t[:80]}")
    print(f"  manifest: {manifest_path}")
    cleanup("--keep-takes" in sys.argv)


if __name__ == "__main__":
    main()
