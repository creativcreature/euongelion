#!/usr/bin/env python3
"""Verify a rendered devotional track is COMPLETE and does not clip at the end.

Founder bar (SA-123): "ensure the audio is full and doesnt clip at thr end."

The manifest alone cannot prove this — a truncated encode still reports a
plausible duration. So this decodes the actual shipped .m4a and checks:

  1. duration drift vs the manifest  (< 0.5s; chapter marks are ABSOLUTE, so
     drift moves every mark after it)
  2. the last chapter mark lands inside the runtime
  3. the tail DECAYS to near-silence rather than stopping mid-word
  4. there is real audio in the final 30s (i.e. it did not end early)
  5. file size under the hard 25 MiB Cloudflare Workers per-asset limit

Usage: python3 scripts/verify-audio-tail.py <slug> [<slug> ...]
"""
import json, os, struct, subprocess, sys, tempfile

MANIFEST = "src/data/audio-manifest.json"
LIMIT = 25 * 1024 * 1024


def decode(path):
    """Decode m4a -> mono 16-bit PCM. Parses the WAV manually because afconvert
    emits WAVE_FORMAT_EXTENSIBLE (0xFFFE), which Python's `wave` rejects."""
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@22050", "-c", "1",
                    path, tmp], check=True, capture_output=True)
    raw = open(tmp, "rb").read()
    os.unlink(tmp)
    i, sr, data = 12, 22050, b""
    while i + 8 <= len(raw):
        cid, sz = raw[i:i+4], struct.unpack("<I", raw[i+4:i+8])[0]
        body = raw[i+8:i+8+sz]
        if cid == b"fmt ":
            sr = struct.unpack("<I", body[4:8])[0]
        elif cid == b"data":
            data = body
            break
        i += 8 + sz + (sz & 1)
    return sr, data


def rms(b):
    if not b:
        return 0
    n = len(b) // 2
    s = sum(v * v for v in struct.unpack("<%dh" % n, b[: n * 2]))
    return int((s / n) ** 0.5)


def check(slug):
    man = json.load(open(MANIFEST))
    e = man.get(slug)
    path = f"public/audio/{slug}.m4a"
    if not e or not os.path.exists(path):
        print(f"{slug}: MISSING (manifest={bool(e)} file={os.path.exists(path)})")
        return False

    size = os.path.getsize(path)
    sr, data = decode(path)
    actual = len(data) / 2 / sr
    stated = float(e["duration"])
    drift = abs(actual - stated)

    ch = e.get("chapters") or []
    last_ch = ch[-1]["t"] if ch else 0.0

    win = int(0.5 * sr) * 2
    tail = data[-win * 4:]                     # final 2s
    body = data[-int(30 * sr) * 2: -win * 4]   # the 28s before it
    tail_rms = rms(tail[-win:])                # final 0.5s
    body_rms = rms(body)

    ok_drift = drift < 0.5
    ok_ch = (not ch) or (ch[0]["t"] == 0.0 and last_ch < actual)
    ok_decay = tail_rms < 400
    ok_alive = body_rms > 150
    ok_size = size < LIMIT

    ok = all([ok_drift, ok_ch, ok_decay, ok_alive, ok_size])
    print(
        f"{slug}: {'PASS' if ok else 'FAIL'} | "
        f"dur {actual:7.2f}s vs manifest {stated:7.2f}s (drift {drift:.3f}s {'ok' if ok_drift else 'DRIFT'}) | "
        f"chapters {len(ch)} last@{last_ch:.1f}s {'ok' if ok_ch else 'OUT-OF-RANGE'} | "
        f"final-0.5s RMS {tail_rms} {'(decays, not clipped)' if ok_decay else '(LOUD — CLIPPED MID-WORD)'} | "
        f"prior-28s RMS {body_rms} {'(speech present)' if ok_alive else '(SILENT — ENDED EARLY)'} | "
        f"{size/1048576:.1f}MiB {'ok' if ok_size else 'OVER 25MiB'}"
    )
    return ok


if __name__ == "__main__":
    results = [check(s) for s in sys.argv[1:]]
    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)
