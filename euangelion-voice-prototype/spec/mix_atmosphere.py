#!/usr/bin/env python3
"""Mix an atmospheric bed under narration, with calibrated levels.

Reference: *Inspired by The Bible Experience* — atmosphere as part of the work,
not decoration laid over it. That means the bed has to be felt continuously
without ever competing with the words.

Levels are set relative to the speech itself rather than to absolute dBFS,
because absolute targets drift with whatever the narration happens to peak at.
Three numbers do the work:

  BED_UNDER_SPEECH   how far below the speech the bed sits while someone is
                     talking. Broadcast practice for narration underscore is
                     15-25 dB; founder set it at 26 by ear: 24 read as
                     accompaniment, 28 vanished. 26 is present but not heard.
  BED_IN_GAPS        how far below while nobody is talking. Bringing it up in
                     the pauses is what makes it read as scoring rather than
                     noise — the bed breathes between sections.
  DUCK_ATTACK/RELEASE  how fast it moves between those. Fast attack so a word
                     is never masked; slow release so it swells rather than
                     pumps.

The finished mix is then matched to the loudness of the existing catalog, so a
reader moving between an atmospheric track and a dry one does not reach for the
volume.

Stdlib only, plus macOS `afconvert`. No ffmpeg.
"""
import array
import audioop
import math
import os
import struct
import subprocess
import sys

# Bed level relative to measured speech loudness, in dB.
BED_UNDER_SPEECH = -26.0
BED_IN_GAPS = -18.0
DUCK_ATTACK_S = 0.12       # fast: never mask a word's onset
DUCK_RELEASE_S = 1.40      # slow: swell back, do not pump
FRAME_S = 0.02
FADE_S = 3.0               # bed fade in/out at the very ends
SPEECH_GATE_DB = -34.0     # below this relative to speech peak = a gap

# Frequency carving. Film-scoring practice is to keep the underscore's timbre
# clear of the voice; the measured reference does this too, putting only ~6% of
# its energy above 2 kHz. A peaking cut centred in the consonant band buys
# intelligibility far more cheaply than simply turning the bed down, because
# consonants — not vowels — are what carry a word's identity.
CARVE_HZ = 2500.0
CARVE_Q = 0.9
CARVE_GAIN_DB = -7.0


def peaking_eq(samples, sr, f0, q, gain_db):
    """Single biquad peaking filter, direct form I. RBJ cookbook coefficients."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * math.pi * f0 / sr
    alpha = math.sin(w0) / (2 * q)
    cw = math.cos(w0)
    b0, b1, b2 = 1 + alpha * A, -2 * cw, 1 - alpha * A
    a0, a1, a2 = 1 + alpha / A, -2 * cw, 1 - alpha / A
    b0, b1, b2 = b0 / a0, b1 / a0, b2 / a0
    a1, a2 = a1 / a0, a2 / a0
    out = array.array("h", bytes(2 * len(samples)))
    x1 = x2 = y1 = y2 = 0.0
    for i, x0 in enumerate(samples):
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x0
        y2, y1 = y1, y0
        v = int(y0)
        out[i] = 32767 if v > 32767 else (-32768 if v < -32768 else v)
    return out


def decode(src, dst, sr=24000):
    r = subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{sr}", "-c", "1",
                        src, dst], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"decode failed: {r.stderr[:200]}")
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


def write_wav(samples, sr, path):
    w = __import__("wave").open(path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(samples.tobytes())
    w.close()


def frame_rms(samples, sr, frame_s=FRAME_S):
    raw = samples.tobytes()
    n = int(sr * frame_s) * 2
    return [audioop.rms(raw[i:i + n], 2) for i in range(0, len(raw) - n, n)], n // 2


def speech_loudness(samples, sr):
    """RMS over speech-active frames only. Silence would drag a naive average
    down and make quiet narration mix too loud."""
    rms, _ = frame_rms(samples, sr)
    if not rms:
        return 1.0
    peak = max(rms) or 1
    gate = peak * (10 ** (SPEECH_GATE_DB / 20.0))
    active = [r for r in rms if r > gate]
    if not active:
        active = rms
    return math.sqrt(sum(r * r for r in active) / len(active))


def duck_curve(voice, sr):
    """Per-frame bed gain, in linear terms, from the speech envelope."""
    rms, _ = frame_rms(voice, sr)
    peak = max(rms) or 1
    gate = peak * (10 ** (SPEECH_GATE_DB / 20.0))
    lo = 10 ** (BED_UNDER_SPEECH / 20.0)
    hi = 10 ** (BED_IN_GAPS / 20.0)
    atk = math.exp(-FRAME_S / DUCK_ATTACK_S)
    rel = math.exp(-FRAME_S / DUCK_RELEASE_S)
    out, g = [], hi
    for r in rms:
        target = lo if r > gate else hi
        coef = atk if target < g else rel
        g = target + (g - target) * coef
        out.append(g)
    return out


def main():
    voice_src, music_src, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    match_to = sys.argv[4] if len(sys.argv) > 4 else None
    tmp = out_path + ".tmp"

    voice, sr = read_wav_any(decode(voice_src, tmp + ".v.wav"))
    music, _ = read_wav_any(decode(music_src, tmp + ".m.wav", sr))

    v_loud = speech_loudness(voice, sr)
    m_loud = math.sqrt(sum(float(s) * s for s in music) / max(1, len(music)))
    print(f"speech loudness {20*math.log10(max(v_loud,1)/32768):6.1f} dBFS")
    print(f"bed loudness    {20*math.log10(max(m_loud,1)/32768):6.1f} dBFS (raw)")

    # Loop or trim the bed to the narration's length.
    if len(music) < len(voice):
        reps = len(voice) // len(music) + 1
        music = array.array("h", (music * reps)[:len(voice)])
    else:
        music = music[:len(voice)]

    # Carve the consonant band out of the bed before levelling, so the level
    # maths sees the bed as it will actually be heard.
    music = peaking_eq(music, sr, CARVE_HZ, CARVE_Q, CARVE_GAIN_DB)
    m_loud = math.sqrt(sum(float(s) * s for s in music) / max(1, len(music)))
    print(f"carved {CARVE_GAIN_DB:+.0f} dB at {CARVE_HZ:.0f} Hz (Q {CARVE_Q}) "
          f"to clear the voice band")

    # Normalize the bed so BED_* are true dB below the SPEECH, not below
    # whatever the generator happened to output.
    bed_unit = (v_loud / m_loud) if m_loud else 0.0
    gains = duck_curve(voice, sr)
    hop = int(sr * FRAME_S)
    fade_n = int(FADE_S * sr)

    out = array.array("h", bytes(2 * len(voice)))
    for i in range(len(voice)):
        gi = min(i // hop, len(gains) - 1)
        g = gains[gi] * bed_unit
        if i < fade_n:
            g *= i / fade_n
        elif i > len(voice) - fade_n:
            g *= max(0.0, (len(voice) - i) / fade_n)
        v = voice[i] + int(music[i] * g)
        out[i] = 32767 if v > 32767 else (-32768 if v < -32768 else v)

    # Match the finished mix to the catalog's loudness, so a reader moving
    # between an atmospheric track and a dry one never reaches for the volume.
    # Measured on speech-active frames of both, so the bed does not skew it.
    if match_to and os.path.exists(match_to):
        ref, _ = read_wav_any(decode(match_to, tmp + ".r.wav", sr))
        target = speech_loudness(ref, sr)
        cur = speech_loudness(out, sr)
        adj = min(target / cur, 4.0) if cur else 1.0
        # Guard the ceiling: scaling up can clip a mix that was already hot.
        peak = max(abs(s) for s in out) or 1
        if peak * adj > 32000:
            adj = 32000 / peak
        scaled = array.array("h")
        scaled.frombytes(audioop.mul(out.tobytes(), 2, adj))
        out = scaled
        print(f"catalog-matched: {20*math.log10(adj):+.1f} dB "
              f"(target {20*math.log10(max(target,1)/32768):.1f} dBFS speech)")

    write_wav(out, sr, tmp + ".mix.wav")

    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", "-c", "1",
                    tmp + ".mix.wav", out_path], check=True,
                   capture_output=True, text=True)
    for f in (".v.wav", ".m.wav", ".r.wav", ".mix.wav"):
        if os.path.exists(tmp + f):
            os.unlink(tmp + f)

    final, _ = read_wav_any(decode(out_path, tmp + ".chk.wav", sr))
    peak = max(abs(s) for s in final)
    print(f"\n{out_path}")
    print(f"  bed {BED_UNDER_SPEECH:.0f} dB under speech, {BED_IN_GAPS:.0f} dB in gaps")
    print(f"  final peak {20*math.log10(peak/32768):.1f} dBFS "
          f"({'clipping!' if peak >= 32767 else 'headroom ok'})")
    os.unlink(tmp + ".chk.wav")


if __name__ == "__main__":
    main()
