#!/usr/bin/env python3
"""Cut a listenable excerpt from a rendered devotional.

A 21-minute file is a bad way to judge a voice. This takes the opening — title,
scripture, and the first stretch of teaching — so the founder can compare
candidates in a couple of minutes.

Usage: python3 make_sample.py <in.wav> <out.wav> [seconds]
"""
import array
import sys
import wave


def main():
    src, dst = sys.argv[1], sys.argv[2]
    seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 120.0

    w = wave.open(src, "rb")
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    a = array.array("h")
    a.frombytes(w.readframes(n))
    w.close()
    if ch == 2:
        a = a[0::2]

    cut = min(len(a), int(seconds * sr))

    # Land the cut in a silence so the excerpt does not end mid-word: scan back
    # up to 6s for the quietest 200ms window.
    win = int(sr * 0.2)
    best, best_energy = cut, None
    for pos in range(cut, max(0, cut - int(sr * 6)), -win):
        seg = a[max(0, pos - win):pos]
        if not seg:
            continue
        energy = sum(abs(v) for v in seg) / len(seg)
        if best_energy is None or energy < best_energy:
            best_energy, best = energy, pos
    out = a[:best]

    # Gentle 40ms fade-out so the excerpt does not click.
    fade = min(int(sr * 0.04), len(out))
    for i in range(fade):
        out[len(out) - fade + i] = int(out[len(out) - fade + i] * (1 - i / fade))

    ww = wave.open(dst, "wb")
    ww.setnchannels(1)
    ww.setsampwidth(2)
    ww.setframerate(sr)
    ww.writeframes(out.tobytes())
    ww.close()
    print(f"{dst}: {len(out)/sr:.1f}s")


if __name__ == "__main__":
    main()
