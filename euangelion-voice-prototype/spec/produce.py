#!/usr/bin/env python3
"""Take a rendered devotional from "TTS with music under it" toward a produced reading.

Reference: *Inspired by The Bible Experience*. Listening against it, four things
separate a produced reading from ours, and three are fixable with signal
processing on audio we already have:

  1. THEIR VOICE IS IN A ROOM. Ours is a dry render — no early reflections, no
     sense of place. This is the largest single difference and no amount of
     better music hides it. Fixed with a Schroeder/Freeverb network: parallel
     comb filters for density, series allpass for diffusion, mixed low.
  2. THEY ARE STEREO. Voice centred, score and ambience wide. Width is most of
     what "produced" sounds like. Ours is mono.
  3. THEIR SCORE IS SPOTTED, OURS IS LOOPED. Their music enters, swells, and
     drops out entirely under certain lines. A constant ducked loop stops being
     heard after two minutes. We already know exactly where every module starts
     — that is what the chapter work bought — so the bed can be written against
     the structure instead of ignoring it.
  4. They have a cast. We do not. That one is not fixable here.

Nothing is re-rendered: the narration is rebuilt from the chunk cache, so this
costs no credits and can be run as many times as it takes.

Usage:
  python3 produce.py <slug> <out.m4a> [--dry-only]
"""
import array
import audioop
import json
import math
import os
import random
import struct
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne                  # noqa: E402
import render_el_catalog as rc                  # noqa: E402
from render_kokoro import PAUSE_AFTER, TRAILING_PAD   # noqa: E402

SR = 44100
BED = os.path.join(REPO, "euangelion-voice-prototype", "MUSIC-low-strings.mp3")
# A second layer, started at a different point in its own loop so the two never
# move in lockstep. One bed repeating is heard as a loop within a couple of
# minutes; two at different periods read as a score.
BED2 = os.path.join(REPO, "euangelion-voice-prototype", "MUSIC-cello-solo.mp3")
BED2_UNDER_DB = -5.0        # the second layer sits under the first
BED2_OFFSET_S = 37.0

# ── how loud the bed sits under each kind of section, in dB below the speech ──
#
# This is the spotting sheet. Scripture is the point of the whole page, so the
# score gets out of its way almost entirely; prayer is where a bed earns its
# keep; the opening and the close are where it is allowed to be heard.
BED_BY_TYPE = {
    "title": -14.0,
    "scripture": -24.0,     # steps back for the words, but stays present
    "vocab": -23.0,
    "teaching": -22.0,
    "insight": -22.0,
    "story": -21.0,
    "bridge": -22.0,
    "sabbath": -19.0,
    "reflection": -19.0,
    "prayer": -17.0,
    "takeaway": -18.0,
    "recap": -21.0,
    "comprehension": -23.0,
}
BED_DEFAULT = -22.0
BED_IN_GAPS_LIFT = 10.0     # the score blooms between sentences — this is
                            # where the atmosphere actually lives
CUE_GLIDE_S = 4.0           # a cue change is a slow move, never a step

# The score has to arrive and leave, not switch. Raised-cosine rather than
# linear: a linear fade is audible as a ramp, this one is heard as a bloom.
FADE_IN_S = 6.0
FADE_OUT_S = 9.0

# ── voice chain ──
COMP_THRESH_DB = -18.0      # gentle levelling, not squashing
COMP_RATIO = 2.0
COMP_ATTACK_S = 0.010
COMP_RELEASE_S = 0.180
DEESS_HZ = 6200.0           # sibilance sits here at this sample rate
DEESS_Q = 1.1
DEESS_MAX_CUT_DB = -7.0
REVERB_WET = 0.040          # barely there: placement, not effect
REVERB_ROOM = 0.62          # smaller space, shorter tail
REVERB_DAMP = 0.68          # dark tail; an undamped comb rings metallic
PREDELAY_S = 0.022          # keeps the voice in front of its own reflections

ROOM_TONE_DB = -54.0        # so a gap is a room, not a digital hole
BED_WIDTH_MS = 14.0         # Haas spread on the bed only; voice stays centred


# ── primitives ────────────────────────────────────────────────────────

def biquad(samples, sr, kind, f0, q, gain_db=0.0):
    """RBJ cookbook biquad, direct form I."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * math.pi * f0 / sr
    alpha = math.sin(w0) / (2 * q)
    cw = math.cos(w0)
    if kind == "peak":
        b0, b1, b2 = 1 + alpha * A, -2 * cw, 1 - alpha * A
        a0, a1, a2 = 1 + alpha / A, -2 * cw, 1 - alpha / A
    elif kind == "highpass":
        b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    elif kind == "lowshelf":
        sq = 2 * math.sqrt(A) * alpha
        b0 = A * ((A + 1) - (A - 1) * cw + sq)
        b1 = 2 * A * ((A - 1) - (A + 1) * cw)
        b2 = A * ((A + 1) - (A - 1) * cw - sq)
        a0 = (A + 1) + (A - 1) * cw + sq
        a1 = -2 * ((A - 1) + (A + 1) * cw)
        a2 = (A + 1) + (A - 1) * cw - sq
    elif kind == "lowpass":
        b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    else:
        raise ValueError(kind)
    b0, b1, b2 = b0 / a0, b1 / a0, b2 / a0
    a1, a2 = a1 / a0, a2 / a0
    out = array.array("f", bytes(4 * len(samples)))
    x1 = x2 = y1 = y2 = 0.0
    for i, x0 in enumerate(samples):
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x0
        y2, y1 = y1, y0
        out[i] = y0
    return out


def to_float(samples):
    return array.array("f", (float(s) for s in samples))


def clip16(x):
    v = int(x)
    return 32767 if v > 32767 else (-32768 if v < -32768 else v)


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


def decode(src, dst, sr=SR):
    r = subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{sr}", "-c", "1",
                        src, dst], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"decode failed: {r.stderr[:200]}")
    return read_wav_any(dst)[0]


# ── voice chain ───────────────────────────────────────────────────────

def compress(x, sr):
    """Feed-forward compressor on a smoothed envelope. Levels the reading so a
    quiet clause is not lost under the bed, without flattening the delivery."""
    atk = math.exp(-1.0 / (sr * COMP_ATTACK_S))
    rel = math.exp(-1.0 / (sr * COMP_RELEASE_S))
    thresh = 10 ** (COMP_THRESH_DB / 20.0) * 32768
    env = 0.0
    out = array.array("f", bytes(4 * len(x)))
    for i, s in enumerate(x):
        a = abs(s)
        env = a + (env - a) * (atk if a > env else rel)
        if env > thresh:
            over_db = 20 * math.log10(env / thresh)
            gain = 10 ** (-(over_db - over_db / COMP_RATIO) / 20.0)
        else:
            gain = 1.0
        out[i] = s * gain
    return out


def deess(x, sr):
    """Attenuate the sibilance band only while it is actually hot. A static cut
    dulls every word; this only moves when an 's' arrives."""
    band = biquad(x, sr, "peak", DEESS_HZ, DEESS_Q, 12.0)   # detector emphasis
    win = int(sr * 0.006)
    thresh = None
    mags = [abs(v) for v in band]
    ref = sorted(mags)[int(len(mags) * 0.995)] or 1.0
    thresh = ref * 0.45
    cut = biquad(x, sr, "peak", DEESS_HZ, DEESS_Q, DEESS_MAX_CUT_DB)
    out = array.array("f", bytes(4 * len(x)))
    env = 0.0
    coef = math.exp(-1.0 / (sr * 0.004))
    for i in range(len(x)):
        a = mags[i]
        env = a + (env - a) * (coef if a < env else 0.0)
        w = 0.0 if env <= thresh else min(1.0, (env - thresh) / (thresh * 1.6))
        out[i] = x[i] * (1.0 - w) + cut[i] * w
    return out


# Freeverb tunings, given at 44.1 kHz and scaled to ours.
_COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
_ALLPASS = [556, 441, 341, 225]


def reverb(x, sr):
    """Schroeder/Freeverb: parallel combs build density, series allpass diffuse
    it. Cheap, and at this wet level it reads as a room rather than an effect."""
    scale = sr / 44100.0
    combs = [max(8, int(d * scale)) for d in _COMBS]
    allps = [max(4, int(d * scale)) for d in _ALLPASS]
    n = len(x)
    wet = array.array("f", bytes(4 * n))

    for ci, dlen in enumerate(combs):
        buf = [0.0] * dlen
        idx = 0
        filt = 0.0
        fb = REVERB_ROOM - ci * 0.003          # detune each comb slightly
        damp = REVERB_DAMP
        for i in range(n):
            y = buf[idx]
            filt = y * (1 - damp) + filt * damp
            buf[idx] = x[i] + filt * fb
            idx += 1
            if idx >= dlen:
                idx = 0
            wet[i] += y
    inv = 1.0 / len(combs)
    for i in range(n):
        wet[i] *= inv

    for dlen in allps:
        buf = [0.0] * dlen
        idx = 0
        g = 0.5
        for i in range(n):
            bufout = buf[idx]
            y = -wet[i] + bufout
            buf[idx] = wet[i] + bufout * g
            idx += 1
            if idx >= dlen:
                idx = 0
            wet[i] = y

    pre = int(PREDELAY_S * sr)
    out = array.array("f", bytes(4 * n))
    for i in range(n):
        w = wet[i - pre] if i >= pre else 0.0
        out[i] = x[i] * (1.0 - REVERB_WET) + w * REVERB_WET
    return out


# ── the spotting sheet ────────────────────────────────────────────────

def bed_curve(dev, chapters, voice, sr, total):
    """Per-sample bed gain, written against the devotional's own structure.

    Two things move it: the SECTION (a cue change, glided over seconds so it is
    felt rather than noticed) and whether anyone is currently speaking (fast, so
    a word is never masked)."""
    types = [m.get("type", "teaching") for m in (dev.get("modules") or [])]

    marks = []
    for ch in chapters:
        mod = ch["module"]
        t = types[mod - 1] if 1 <= mod <= len(types) else "title"
        marks.append((ch["t"], BED_BY_TYPE.get(t, BED_DEFAULT)))
    if not marks or marks[0][0] > 0:
        marks.insert(0, (0.0, BED_BY_TYPE["title"]))

    # section target per sample, glided
    target = array.array("f", bytes(4 * total))
    cur = marks[0][1]
    mi = 0
    glide = int(CUE_GLIDE_S * sr) or 1
    step_from = cur
    step_at = 0
    for i in range(total):
        while mi + 1 < len(marks) and i >= marks[mi + 1][0] * sr:
            mi += 1
            step_from = cur
            step_at = i
        want = marks[mi][1]
        if cur != want:
            p = min(1.0, (i - step_at) / glide)
            cur = step_from + (want - step_from) * p
        target[i] = cur

    # speech activity, so the bed can lift in the gaps
    frame = int(sr * 0.02)
    raw = voice.tobytes()
    rms = [audioop.rms(raw[j:j + frame * 2], 2)
           for j in range(0, len(raw) - frame * 2, frame * 2)]
    peak = max(rms) or 1
    gate = peak * (10 ** (-34.0 / 20.0))
    atk = math.exp(-0.02 / 0.06)   # duck instantly: never mask a consonant
    rel = math.exp(-0.02 / 1.90)   # return slowly: swell, never pump
    lift = []
    g = BED_IN_GAPS_LIFT
    for r in rms:
        want = 0.0 if r > gate else BED_IN_GAPS_LIFT
        g = want + (g - want) * (atk if want < g else rel)
        lift.append(g)

    fi = int(FADE_IN_S * sr)
    fo = int(FADE_OUT_S * sr)
    out = array.array("f", bytes(4 * total))
    for i in range(total):
        li = min(i // frame, len(lift) - 1)
        g = 10 ** ((target[i] + lift[li]) / 20.0)
        if i < fi:                                  # bloom in
            g *= 0.5 - 0.5 * math.cos(math.pi * i / fi)
        rem = total - i
        if rem < fo:                                # taper out
            g *= 0.5 - 0.5 * math.cos(math.pi * rem / fo)
        out[i] = g
    return out


def main():
    slug, out_path = sys.argv[1], sys.argv[2]
    # --from-audio scores an EXISTING track instead of rebuilding narration from
    # the ElevenLabs chunk cache. Michael's ~521 back-catalog tracks are already
    # dry narration on disk, which is exactly the input this pass wants, so they
    # can be scored without re-rendering a single word.
    from_audio = sys.argv[sys.argv.index("--from-audio") + 1] \
        if "--from-audio" in sys.argv else None
    dev = json.load(open(os.path.join(REPO, "public", "devotionals", f"{slug}.json")))
    segs = ne.extract(dev)
    groups = rc.chunks(segs)
    vid = open(os.path.join(REPO, "euangelion-voice-prototype", "el-voice-id.txt")).read().strip()

    # 1. rebuild the dry narration from cache — no API, no credits
    tmp = out_path + ".tmp"
    frames = array.array("h")
    if from_audio:
        frames = decode(from_audio, tmp + ".src.wav")
        print(f"scoring existing narration: {len(frames)/SR/60:.2f} min "
              f"({os.path.basename(from_audio)})")
        groups = []
    for i, g in enumerate(groups, 1):
        text = " ".join(s["text"] for s in g)
        hit = os.path.join(rc.CACHE, rc.cache_key(text, vid) + ".mp3")
        if not os.path.exists(hit):
            raise SystemExit(f"chunk {i} not cached — refusing to spend credits")
        frames.extend(decode(hit, tmp + ".c.wav"))
        if i < len(groups):
            frames.extend([0] * int(PAUSE_AFTER.get(g[-1]["register"], 0.55) * SR))
    if not from_audio:
        frames.extend([0] * int(TRAILING_PAD * SR))
    n = len(frames)
    if not from_audio:
        print(f"dry narration rebuilt from cache: {n/SR/60:.2f} min, {len(groups)} chunks")

    # 2. voice chain
    v = to_float(frames)
    v = deess(v, SR)
    print("  de-essed")
    v = compress(v, SR)
    print(f"  compressed {COMP_RATIO}:1 above {COMP_THRESH_DB:.0f} dBFS")
    print("  voice: untouched — no reverb, no EQ, no compression")

    vi = array.array("h", (clip16(s) for s in v))

    if "--dry-only" in sys.argv:
        w = wave.open(out_path, "wb")
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(vi.tobytes()); w.close()
        return

    # 3. bed, spotted against the devotional's structure
    man = json.load(open(os.path.join(REPO, "src", "data", "audio-manifest.json")))
    chapters = man[slug].get("chapters") or []
    def loop_to(path, length, offset_s=0.0):
        a = decode(path, tmp + ".b.wav")
        if not a:
            return array.array("h", bytes(2 * length))
        off = int(offset_s * SR) % len(a)
        a = a[off:] + a[:off]
        if len(a) < length:
            a = array.array("h", (a * (length // len(a) + 1))[:length])
        return a[:length]

    b1 = loop_to(BED, n)
    b2 = loop_to(BED2, n, BED2_OFFSET_S)
    g2 = 10 ** (BED2_UNDER_DB / 20.0)
    bed = array.array("h", (clip16(b1[i] + b2[i] * g2) for i in range(n)))
    bed = biquad(bed, SR, "peak", 2500.0, 0.9, -9.0)      # clear the consonants
    print(f"  score: two layers, second offset {BED2_OFFSET_S:.0f}s at {BED2_UNDER_DB:+.0f} dB")

    v_loud = math.sqrt(sum(float(s) * s for s in vi) / max(1, n)) or 1.0
    b_loud = math.sqrt(sum(float(s) * s for s in bed) / max(1, n)) or 1.0
    unit = v_loud / b_loud

    gain = bed_curve(dev, chapters, vi, SR, n)
    labels = {c["t"]: c["label"] for c in chapters}
    print(f"  score spotted across {len(chapters)} sections")

    # 4. room tone, so a gap is a room rather than a hole
    # Room tone is stationary, so filter a few seconds once and tile it rather
    # than filtering tens of millions of samples to say the same thing.
    random.seed(7)
    tone_amp = 10 ** (ROOM_TONE_DB / 20.0) * 32768
    block = biquad(array.array("f", (random.uniform(-1, 1) * tone_amp
                                     for _ in range(SR * 5))),
                   SR, "lowpass", 1800.0, 0.7)
    reps = n // len(block) + 1
    tone = array.array("f", (block * reps)[:n])

    # 5. stereo: voice centred, bed spread. Haas on the bed only — a delayed
    #    copy of the VOICE would smear the words and break mono playback.
    delay = int(BED_WIDTH_MS / 1000.0 * SR)
    left = array.array("h", bytes(2 * n))
    right = array.array("h", bytes(2 * n))
    for i in range(n):
        b = bed[i] * gain[i] * unit
        bd = bed[i - delay] * gain[i - delay] * unit if i >= delay else 0.0
        t = tone[i]
        left[i] = clip16(vi[i] + b + t)
        right[i] = clip16(vi[i] + bd * 0.78 - t)

    inter = array.array("h", bytes(4 * n))
    inter[0::2] = left
    inter[1::2] = right
    w = wave.open(tmp + ".st.wav", "wb")
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(inter.tobytes()); w.close()

    # -c 2: the file being encoded is stereo. Passing 1 here asks afconvert to
    # write a mono file from a stereo source and it refuses outright.
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "128000", "-c", "2",
                    tmp + ".st.wav", out_path], check=True, capture_output=True)
    # .src.wav is the decode of an existing track in --from-audio mode. It was
    # missing from this list and 156 tracks left 4.3 GB of stranded decodes
    # behind against 777 MB of actual output.
    for e in (".c.wav", ".b.wav", ".st.wav", ".src.wav"):
        if os.path.exists(tmp + e):
            os.unlink(tmp + e)

    pk = max(max(abs(s) for s in left), max(abs(s) for s in right))
    mb = os.path.getsize(out_path) / 1048576
    print(f"\n{out_path}")
    print(f"  {n/SR/60:.2f} min | stereo 128 kbps | {mb:.1f} MB")
    print(f"  peak {20*math.log10(pk/32768):.1f} dBFS")
    print("  cue sheet:")
    types = [m.get("type", "teaching") for m in (dev.get("modules") or [])]
    for c in chapters:
        t = types[c["module"] - 1] if 1 <= c["module"] <= len(types) else "title"
        print(f"    {int(c['t'])//60:02d}:{int(c['t'])%60:02d}  "
              f"{BED_BY_TYPE.get(t, BED_DEFAULT):+.0f} dB  {c['label'][:44]}")


if __name__ == "__main__":
    main()
