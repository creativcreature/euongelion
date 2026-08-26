#!/usr/bin/env python3
"""Rate, transcribe and fingerprint candidate reference clips.

Produces the evidence needed to choose reference audio deliberately rather than
by vibe: for each clip, what is said, how fast it is really said (words over
speech time, pauses excluded), and whether the speaker is actually the founder.

The pitch fingerprint is the load-bearing part. A channel contains co-hosts,
family, bystanders and music; any of them blended into the profile corrupts the
clone in a way that is obvious to a listener and invisible to a text metric.

Stdlib only, plus Voicebox's /transcribe.
"""
import array
import audioop
import json
import os
import statistics
import struct
import subprocess
import sys

API = "http://127.0.0.1:17493"
F0_LO, F0_HI = 60, 320
PITCH_SR = 8000


def read_wav_any(path):
    b = open(path, "rb").read()
    i, fmt, data = 12, None, None
    while i + 8 <= len(b):
        cid = b[i:i + 4]
        sz = struct.unpack("<I", b[i + 4:i + 8])[0]
        body = b[i + 8:i + 8 + sz]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            data = body
        i += 8 + sz + (sz & 1)
    _, ch, sr = struct.unpack("<HHI", fmt[:8])
    a = array.array("h")
    a.frombytes(data[:len(data) // 2 * 2])
    if ch == 2:
        a = a[0::2]
    return a, sr


def transcribe(path):
    out = subprocess.run(
        ["curl", "-s", "-m", "600", "-X", "POST", f"{API}/transcribe",
         "-F", f"file=@{path}", "-F", "model=turbo"],
        capture_output=True, text=True)
    try:
        return json.loads(out.stdout).get("text", "")
    except Exception:
        return ""


def speech_seconds(samples, sr):
    """Duration minus silence, so rate reflects delivery not pausing."""
    raw = samples.tobytes()
    win = int(sr * 0.05) * 2
    env = [audioop.rms(raw[i:i + win], 2) for i in range(0, len(raw) - win, win)]
    if not env:
        return len(samples) / sr, 0
    srt = sorted(env)
    thr = max(60.0, srt[int(len(srt) * 0.85)] * 0.10)
    quiet = sum(1 for r in env if r < thr)
    total = len(samples) / sr
    return max(0.1, total - quiet * 0.05), quiet


def median_f0(samples, sr):
    raw = samples.tobytes()
    raw, _ = audioop.ratecv(raw, 2, 1, sr, PITCH_SR, None)
    a = array.array("h")
    a.frombytes(raw)
    win = int(PITCH_SR * 0.04)
    lo, hi = PITCH_SR // F0_HI, PITCH_SR // F0_LO
    step = max(win, (len(a) - win) // 40 if len(a) > win else win)
    out = []
    for i in range(0, len(a) - win, step):
        s = a[i:i + win]
        r0 = sum(v * v for v in s)
        if r0 / win < 1.0e5:
            continue
        best, best_lag = 0.0, 0
        for lag in range(lo, hi):
            c = 0
            for j in range(0, win - lag):
                c += s[j] * s[j + lag]
            c /= (r0 or 1)
            if c > best:
                best, best_lag = c, lag
        if best_lag and best > 0.30:
            out.append(PITCH_SR / best_lag)
    return round(statistics.median(out), 1) if len(out) >= 5 else None


def norm_words(t):
    import re
    return re.sub(r"[^a-z0-9' ]", " ", t.lower()).split()


def main():
    clips = json.load(open(os.path.join(sys.argv[1], "clips.json")))
    out_path = sys.argv[2]
    rated = []
    for n, c in enumerate(clips, 1):
        try:
            samples, sr = read_wav_any(c["path"])
            speech, _ = speech_seconds(samples, sr)
            text = transcribe(c["path"])
            words = len(norm_words(text))
            rec = {**c,
                   "words": words,
                   "speech_s": round(speech, 2),
                   "rate_ws": round(words / speech, 3) if speech else 0.0,
                   "f0": median_f0(samples, sr),
                   "text": text.strip()}
        except Exception as e:  # noqa: BLE001
            rec = {**c, "error": str(e)[:80], "words": 0, "rate_ws": 0.0,
                   "f0": None, "text": ""}
        rated.append(rec)
        if n % 25 == 0:
            print(f"  {n}/{len(clips)}", flush=True)

    json.dump(rated, open(out_path, "w"), indent=1)
    good = [r for r in rated if r["words"] >= 8 and r["f0"]]
    print(f"\n{len(good)}/{len(rated)} clips with speech and a pitch reading")
    if good:
        f0s = sorted(r["f0"] for r in good)
        rates = sorted(r["rate_ws"] for r in good)
        print(f"  f0     min {f0s[0]:.0f} / median {f0s[len(f0s)//2]:.0f} / max {f0s[-1]:.0f} Hz")
        print(f"  rate   min {rates[0]:.2f} / median {rates[len(rates)//2]:.2f} / max {rates[-1]:.2f} w/s")


if __name__ == "__main__":
    main()
