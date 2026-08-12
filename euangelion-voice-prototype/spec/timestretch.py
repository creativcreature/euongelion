#!/usr/bin/env python3
"""WSOLA time-stretch — pitch-preserving pace correction.

WHY: measured on this machine, the local qwen/MLX engine renders devotional
prose at 3.0-3.6 w/s regardless of seed, reference profile, or the `instruct`
field (which is a confirmed no-op on the MLX path). Devotional registers want
2.3-2.8 w/s. Nothing in the generation stack closes that gap, so it is closed
in post.

WSOLA (waveform-similarity overlap-add) shifts each analysis frame to the
position that best correlates with the previous frame's natural continuation
before overlap-adding, which preserves pitch and avoids the phasiness of naive
resampling or the metallic ring of a phase vocoder. `audioop.findfit` does the
similarity search in C.

Keep factors modest: <=1.45 is transparent on speech; beyond ~1.6 the ear starts
hearing repeated glottal pulses.
"""
import array
import audioop
import math

FRAME_MS = 30.0
TOLERANCE_MS = 10.0


def _hann(n):
    return [0.5 - 0.5 * math.cos(2.0 * math.pi * i / (n - 1)) for i in range(n)]


def stretch(samples, sr, factor):
    """Stretch `samples` (array('h'), mono) by `factor` (>1 = slower/longer)."""
    if abs(factor - 1.0) < 0.01 or len(samples) < sr // 10:
        return samples

    N = int(sr * FRAME_MS / 1000.0)
    N -= N % 2
    Hs = N // 2                      # synthesis hop
    Ha = max(1, int(round(Hs / factor)))   # analysis hop
    delta = int(sr * TOLERANCE_MS / 1000.0)
    win = _hann(N)

    out_len = int(len(samples) * factor) + N
    acc = [0.0] * out_len
    norm = [0.0] * out_len

    # template = the samples that would naturally follow the previous frame
    template = None
    n_frames = max(1, (len(samples) - N - delta) // Ha)

    for m in range(n_frames):
        ta = m * Ha
        if template is None or ta < delta:
            pos = ta
        else:
            lo = max(0, ta - delta)
            hi = min(len(samples) - N, ta + delta)
            if hi <= lo:
                pos = max(0, min(ta, len(samples) - N))
            else:
                region = samples[lo:hi + N]
                try:
                    off, _ = audioop.findfit(
                        region.tobytes(), template.tobytes())
                    pos = lo + off
                except Exception:
                    pos = ta
        pos = max(0, min(pos, len(samples) - N))

        frame = samples[pos:pos + N]
        if len(frame) < N:
            break
        base = m * Hs
        for i in range(N):
            w = win[i]
            acc[base + i] += frame[i] * w
            norm[base + i] += w

        # next natural continuation: what follows this frame by one synth hop
        nxt = pos + Hs
        template = samples[nxt:nxt + Hs]
        if len(template) < Hs:
            break

    out = array.array("h", bytes(2 * out_len))
    written = 0
    for i in range(out_len):
        if norm[i] > 1e-6:
            v = int(acc[i] / norm[i])
            out[i] = 32767 if v > 32767 else (-32768 if v < -32768 else v)
            written = i
    return out[:written + 1]


def stretch_to_rate(samples, sr, words, target_ws, max_factor=1.45,
                    min_factor=0.85):
    """Stretch so the clip lands at `target_ws` words/sec of speech.

    Returns (new_samples, applied_factor, achieved_rate).
    """
    dur = len(samples) / float(sr)
    if dur <= 0 or words <= 0:
        return samples, 1.0, 0.0
    current = words / dur
    factor = current / target_ws
    factor = max(min_factor, min(max_factor, factor))
    out = stretch(samples, sr, factor)
    new_dur = len(out) / float(sr)
    return out, round(factor, 3), round(words / new_dur, 2) if new_dur else 0.0
