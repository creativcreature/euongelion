#!/usr/bin/env python3
"""Measure a reference recording to write an evidence-based music brief.

This extracts objective characteristics only — spectral balance, dynamic range,
pulse rate, speech presence — so a music brief can be grounded in what the
reference actually does rather than in an impression of it. Nothing here copies
or reproduces the source; the output is a set of numbers used to describe an
ORIGINAL piece to a generator.

Bands are derived by cascaded halving with `audioop.ratecv`: each stage is a
lowpass plus decimate, so differencing successive stages gives band energy
without needing an FFT.
"""
import array
import audioop
import math
import os
import struct
import subprocess
import sys


def decode(src, dst, sr=16000):
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{sr}", "-c", "1",
                    src, dst], check=True, capture_output=True, text=True)
    return dst


def read_wav_any(path):
    b = open(path, "rb").read()
    i, fmt, data = 12, None, None
    while i + 8 <= len(b):
        cid, sz = b[i:i + 4], struct.unpack("<I", b[i + 4:i + 8])[0]
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


def db(x, ref=32768.0):
    return 20 * math.log10(max(x, 1e-9) / ref)


def _fft(re_, im_):
    """In-place iterative radix-2 FFT. Pure stdlib; n must be a power of two."""
    n = len(re_)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            re_[i], re_[j] = re_[j], re_[i]
            im_[i], im_[j] = im_[j], im_[i]
    length = 2
    while length <= n:
        ang = -2 * math.pi / length
        wr, wi = math.cos(ang), math.sin(ang)
        for i in range(0, n, length):
            cr, ci = 1.0, 0.0
            for k in range(i, i + length // 2):
                ur, ui = re_[k], im_[k]
                vr = re_[k + length // 2] * cr - im_[k + length // 2] * ci
                vi = re_[k + length // 2] * ci + im_[k + length // 2] * cr
                re_[k], im_[k] = ur + vr, ui + vi
                re_[k + length // 2], im_[k + length // 2] = ur - vr, ui - vi
                cr, ci = cr * wr - ci * wi, cr * wi + ci * wr
        length <<= 1


BANDS = [(0, 120, "sub/low <120"), (120, 250, "low 120-250"),
         (250, 500, "low-mid 250-500"), (500, 1000, "mid 500-1k"),
         (1000, 2000, "upper-mid 1-2k"), (2000, 4000, "presence 2-4k"),
         (4000, 8000, "air 4-8k")]


def band_profile(samples, sr, n=4096, windows=40):
    """Average magnitude per band across several Hann-windowed FFT frames."""
    step = max(n, (len(samples) - n) // windows)
    acc = {b[2]: 0.0 for b in BANDS}
    frames = 0
    hann = [0.5 - 0.5 * math.cos(2 * math.pi * i / (n - 1)) for i in range(n)]
    for off in range(0, len(samples) - n, step):
        re_ = [samples[off + i] * hann[i] for i in range(n)]
        im_ = [0.0] * n
        _fft(re_, im_)
        for lo, hi, label in BANDS:
            k0, k1 = int(lo * n / sr), min(int(hi * n / sr), n // 2)
            if k1 <= k0:
                continue
            e = sum(re_[k] * re_[k] + im_[k] * im_[k] for k in range(k0, k1))
            acc[label] += math.sqrt(e / (k1 - k0)) / n
        frames += 1
    if frames:
        for k in acc:
            acc[k] /= frames
    total = sum(acc.values()) or 1
    return acc, total


def dynamics(samples, sr, win_s=1.0):
    raw = samples.tobytes()
    n = int(sr * win_s) * 2
    rms = [audioop.rms(raw[i:i + n], 2) for i in range(0, len(raw) - n, n)]
    rms = [r for r in rms if r > 0]
    if not rms:
        return None
    rms.sort()
    return {"p10": rms[len(rms) // 10], "p50": rms[len(rms) // 2],
            "p90": rms[9 * len(rms) // 10], "peak": rms[-1]}


def pulse_bpm(samples, sr):
    """Autocorrelate the energy envelope to find a repeating pulse, if any."""
    raw = samples.tobytes()
    hop = int(sr * 0.02)
    env = [audioop.rms(raw[i:i + hop * 2], 2)
           for i in range(0, len(raw) - hop * 2, hop * 2)]
    if len(env) < 200:
        return None, 0.0
    mean = sum(env) / len(env)
    env = [e - mean for e in env]
    best, best_lag, energy = 0.0, 0, sum(e * e for e in env) or 1
    # 40-160 BPM -> lag in 0.02s frames
    for lag in range(int(60 / 160 / 0.02), int(60 / 40 / 0.02)):
        c = sum(env[i] * env[i + lag] for i in range(0, len(env) - lag, 3))
        c /= energy
        if c > best:
            best, best_lag = c, lag
    return (60.0 / (best_lag * 0.02) if best_lag else None), best


def main():
    src, start_s, dur_s = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    tmp = "/tmp/_ref_analysis.wav"
    samples, sr = read_wav_any(decode(src, tmp))
    seg = samples[int(start_s * sr):int((start_s + dur_s) * sr)]
    print(f"segment {start_s:.0f}-{start_s+dur_s:.0f}s of {len(samples)/sr:.0f}s total\n")

    bands, total = band_profile(seg, sr)
    print("SPECTRAL BALANCE (share of total energy per band)")
    for lo, hi, label in BANDS:
        v = bands[label]
        share = (v / total * 100) if total else 0
        print(f"  {label:>16}  {share:5.1f}%  {'#' * int(share / 1.5)}")

    d = dynamics(seg, sr)
    if d:
        print(f"\nDYNAMICS (1s windows)")
        print(f"  quiet (p10) {db(d['p10']):6.1f} dB")
        print(f"  median      {db(d['p50']):6.1f} dB")
        print(f"  loud  (p90) {db(d['p90']):6.1f} dB")
        print(f"  range p10-p90: {db(d['p90'])-db(d['p10']):.1f} dB   "
              f"{'DYNAMIC — it breathes' if db(d['p90'])-db(d['p10']) > 9 else 'fairly flat/compressed'}")

    bpm, conf = pulse_bpm(seg, sr)
    print(f"\nPULSE")
    if bpm and conf > 0.12:
        print(f"  ~{bpm:.0f} BPM (confidence {conf:.2f}) — a real rhythmic pulse is present")
    else:
        print(f"  no strong periodic pulse (best confidence {conf:.2f}) — rubato / unmetered")

    os.unlink(tmp)


if __name__ == "__main__":
    main()
