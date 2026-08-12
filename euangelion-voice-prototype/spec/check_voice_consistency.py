#!/usr/bin/env python3
"""Verify one narrator voice is used throughout a render, and across renders.

A rendered devotional is stitched from dozens of separate generations. If the
engine or profile ever varied, the voice would change mid-reading — the kind of
defect that is obvious to a listener and invisible in a text-accuracy metric.

Method: median F0 (autocorrelation) sampled over consecutive windows. One
speaker holds a tight band; a voice change shows as a step in the track.
"""
import array
import os
import statistics
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", ".."))

SR_T = 8000
F0_LO, F0_HI = 60, 320
WINDOW_S = 20.0


def load_8k(path):
    import audioop
    w = wave.open(path, "rb")
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n)
    w.close()
    if ch == 2:
        raw = audioop.tomono(raw, sw, 0.5, 0.5)
    raw, _ = audioop.ratecv(raw, sw, 1, sr, SR_T, None)
    a = array.array("h")
    a.frombytes(raw)
    return a


def f0_of(seg):
    win = int(SR_T * 0.04)
    lo, hi = SR_T // F0_HI, SR_T // F0_LO
    out = []
    step = max(win, (len(seg) - win) // 30 if len(seg) > win else win)
    for i in range(0, len(seg) - win, step):
        s = seg[i:i + win]
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
            out.append(SR_T / best_lag)
    return statistics.median(out) if len(out) >= 5 else None


def profile_file(path):
    a = load_8k(path)
    per_window = []
    wlen = int(WINDOW_S * SR_T)
    for i in range(0, len(a) - wlen, wlen):
        f = f0_of(a[i:i + wlen])
        if f:
            per_window.append(round(f, 1))
    if not per_window:
        return None
    return {
        "windows": len(per_window),
        "median": round(statistics.median(per_window), 1),
        "min": min(per_window),
        "max": max(per_window),
        "stdev": round(statistics.pstdev(per_window), 2) if len(per_window) > 1 else 0.0,
        "track": per_window,
    }


def main():
    files = sys.argv[1:]
    results = {}
    for f in files:
        if not os.path.exists(f):
            print(f"missing: {f}")
            continue
        r = profile_file(f)
        results[f] = r
        if not r:
            print(f"{os.path.basename(f):48} no voiced audio")
            continue
        # Thresholds calibrated against a known-good single-voice render:
        # am_michael over 21.7 min sits at sd 7.6 with a 36 Hz window-to-window
        # range purely from prosody (first-half median 114.1, second-half
        # 115.2 — no trend). Flagging that as drift was a false alarm. A real
        # voice change is a sustained STEP, so compare halves rather than
        # window scatter.
        half = len(r["track"]) // 2
        if half >= 2:
            first = statistics.median(r["track"][:half])
            second = statistics.median(r["track"][half:])
            step = abs(first - second)
        else:
            step = 0.0
        flag = "  <-- VOICE STEP" if step > 12 else ""
        print(f"{os.path.basename(f):48} median {r['median']:6.1f} Hz  "
              f"range {r['min']:.0f}-{r['max']:.0f}  half-to-half step "
              f"{step:4.1f} Hz  ({r['windows']} windows){flag}")

    good = {k: v for k, v in results.items() if v}
    if len(good) > 1:
        meds = [v["median"] for v in good.values()]
        spread = max(meds) - min(meds)
        print()
        print(f"ACROSS FILES: medians {sorted(meds)}  spread {spread:.1f} Hz")
        print("  same voice" if spread <= 8 else "  <-- FILES DO NOT MATCH")


if __name__ == "__main__":
    main()
