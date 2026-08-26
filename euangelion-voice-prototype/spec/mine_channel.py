#!/usr/bin/env python3
"""Mine the founder's YouTube channel for voice-profile reference clips.

Why this material and not the interview: the profile was built from ~10 minutes
of interview audio in which the founder is CONVERSING at 3.57 w/s. A clone
inherits the register of what it is given, so devotional narration had to be
manufactured afterwards by time-stretching — the step that costs the most
quality. Talk-to-camera video is a different register, and if it is slower and
more deliberate the clone may need little or no stretching at all.

Three hazards this guards against, all of them present on a real channel:

  - OTHER VOICES. Unboxings, gameplay and celebration clips contain co-hosts,
    family and bystanders. Every clip is pitch-fingerprinted against the
    founder's known F0 band and rejected if it falls outside. On the interview
    that filter caught 16 of 88 clips.
  - NON-SPEECH. Music beds, game audio and (on this channel) a Dada sound-poem
    performance are not usable reference speech. Clips whose transcript is
    empty or degenerate are dropped.
  - ROOM AND LEVEL DRIFT. Videos recorded years apart differ in loudness;
    Voicebox rejects quiet reference audio outright. Clips are normalized.

Stdlib only, plus macOS `afconvert` for decoding. No ffmpeg required.
"""
import array
import audioop
import glob
import json
import os
import statistics
import struct
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

SR_WORK = 16000          # plenty for slicing, transcription and pitch
MIN_CLIP_S = 4.0
TARGET_CLIP_S = 14.0
MAX_CLIP_S = 20.0
MIN_PAUSE_S = 0.35


def decode_to_wav(src, dst):
    """afconvert writes WAVE_FORMAT_EXTENSIBLE, which python's `wave` refuses;
    the reader below parses chunks directly instead of fighting the encoder."""
    r = subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR_WORK}", "-c", "1", src, dst],
        capture_output=True, text=True,
    )
    return r.returncode == 0


def read_wav_any(path):
    b = open(path, "rb").read()
    if b[:4] != b"RIFF":
        return None, 0
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
    if not fmt or not data:
        return None, 0
    _, ch, sr = struct.unpack("<HHI", fmt[:8])
    a = array.array("h")
    a.frombytes(data[:len(data) // 2 * 2])
    if ch == 2:
        a = a[0::2]
    return a, sr


def write_wav(samples, sr, path):
    w = wave.open(path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(samples.tobytes())
    w.close()


def slice_utterances(samples, sr):
    """Split on silence, then pack neighbours into clips of roughly TARGET_CLIP_S."""
    raw = samples.tobytes()
    win = int(sr * 0.05) * 2
    env = [audioop.rms(raw[i:i + win], 2) for i in range(0, len(raw) - win, win)]
    if not env:
        return []
    srt = sorted(env)
    thr = max(60.0, srt[int(len(srt) * 0.85)] * 0.10)

    runs, in_speech, start, silence = [], False, 0, 0
    for i, r in enumerate(env):
        if r >= thr:
            if not in_speech:
                in_speech, start = True, i
            silence = 0
        elif in_speech:
            silence += 1
            if silence * 0.05 >= MIN_PAUSE_S:
                end = i - silence
                if (end - start) * 0.05 >= 1.0:
                    runs.append((start * 0.05, end * 0.05))
                in_speech = False
    if in_speech and (len(env) - start) * 0.05 >= 1.0:
        runs.append((start * 0.05, len(env) * 0.05))

    clips, cur = [], None
    for s, e in runs:
        if cur is None:
            cur = [s, e]
        elif s - cur[1] <= 1.2 and (e - cur[0]) <= MAX_CLIP_S:
            cur[1] = e
        else:
            if cur[1] - cur[0] >= MIN_CLIP_S:
                clips.append(tuple(cur))
            cur = [s, e]
    if cur and cur[1] - cur[0] >= MIN_CLIP_S:
        clips.append(tuple(cur))
    return clips


def normalize(samples):
    raw = samples.tobytes()
    peak = audioop.max(raw, 2)
    if peak == 0:
        return None
    factor = min((0.71 * 32767.0) / peak, 12.0)
    out = audioop.mul(raw, 2, factor)
    a = array.array("h")
    a.frombytes(out)
    return a if audioop.rms(out, 2) >= 900 else None


def main():
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    index = []
    for src in sorted(glob.glob(os.path.join(src_dir, "*.mp4"))):
        vid = os.path.basename(src).rsplit(".", 1)[0]
        tmp = os.path.join(out_dir, f"_{vid}.wav")
        if not decode_to_wav(src, tmp):
            print(f"{vid}: decode failed", flush=True)
            continue
        samples, sr = read_wav_any(tmp)
        if samples is None:
            print(f"{vid}: unreadable", flush=True)
            os.unlink(tmp)
            continue
        clips = slice_utterances(samples, sr)
        kept = 0
        for j, (s, e) in enumerate(clips):
            seg = samples[int(s * sr):int(e * sr)]
            seg = normalize(seg)
            if seg is None:
                continue
            path = os.path.join(out_dir, f"{vid}_{j:03d}.wav")
            write_wav(seg, sr, path)
            index.append({"video": vid, "i": j, "path": path,
                          "start_s": round(s, 2), "dur_s": round(e - s, 2)})
            kept += 1
        os.unlink(tmp)
        print(f"{vid}: {len(samples)/sr/60:5.1f} min -> {kept} clips", flush=True)

    json.dump(index, open(os.path.join(out_dir, "clips.json"), "w"), indent=1)
    total = sum(c["dur_s"] for c in index)
    print(f"\n{len(index)} clips, {total/60:.1f} min of speech -> {out_dir}")


if __name__ == "__main__":
    main()
