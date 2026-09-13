#!/usr/bin/env python3
"""Prove the voice said every word, request by request, from a transcript.

The founder's complaint this answers: phrases and sentence endings cut short.
A loudness, duration or hash check cannot see that — a clipped request still
decodes, still measures, and still matches the page's fingerprint, because the
fingerprint is of the TEXT sent, not the audio returned. Only listening, or a
transcript, can.

For every request of a rendered devotional, the returned audio is taken from
the chunk cache (so this spends nothing), transcribed locally with Whisper, and
aligned word by word against the exact text that was sent. It fails a request
that:
  - drops a run of 3 or more consecutive words anywhere, or
  - loses any of its last 4 words (the cut-off ending), or
  - speaks at an implausible rate for its word count.

Transliterations (qadosh, Peniel) come back from Whisper spelled a dozen ways,
so a one- or two-word substitution is tolerated and listed, never failed.

Needs torch + transformers and a local Whisper model. Run with the Python that
has them, e.g. a scratch venv:
  <venv>/bin/python verify_transcript.py <slug> [<slug> ...]
      [--model openai/whisper-large-v3-turbo] [--report FILE]
"""
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import narration_extract as ne                      # noqa: E402
import render_el_catalog as rc                      # noqa: E402

DROP_RUN = 3
TAIL_WORDS = 4
WPM_BAND = (95, 230)


def words(text):
    """Comparable word list: lowercase, digits spelled out, punctuation gone."""
    text = text.lower().replace("’", "'").replace("—", " ").replace("–", " ")
    text = re.sub(r"(\d+):(\d+)", r"\1 \2", text)
    text = re.sub(r"(\d)-(\d)", r"\1 to \2", text)
    out = []
    for tok in re.findall(r"[a-z0-9']+", text):
        if tok.isdigit():
            out.extend(ne.num_to_words(int(tok)).replace("-", " ").split())
        else:
            out.extend(tok.replace("-", " ").split())
    return [w.strip("'") for w in out if w.strip("'")]


def decode16k(src, dst):
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1",
                    src, dst], check=True, capture_output=True)
    import numpy as np
    import soundfile as sf
    audio, sr = sf.read(dst, dtype="float32")
    return np.asarray(audio), sr


def load_asr(model_id):
    import torch
    from transformers import pipeline
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    # float32 even on MPS: in float16 Whisper returns "!" and then generates to
    # the token limit, which turned a 2-minute check into 17 minutes of nothing.
    return pipeline("automatic-speech-recognition", model=model_id,
                    dtype=torch.float32, device=device)


# Whisper leaves out spoken scripture references ("Daniel, chapter one, verse
# nine") inconsistently, even in short slices, while the same words are audible
# in another pass. A missing run made only of citation words is listed as
# unconfirmed, never failed; missing prose always fails.
_BOOKS = ("genesis exodus leviticus numbers deuteronomy joshua judges ruth samuel kings chronicles ezra "
          "nehemiah esther job psalm psalms proverbs ecclesiastes song songs isaiah jeremiah lamentations ezekiel "
          "daniel hosea joel amos obadiah jonah micah nahum habakkuk zephaniah haggai zechariah malachi matthew "
          "mark luke john acts romans corinthians galatians ephesians philippians colossians thessalonians "
          "timothy titus philemon hebrews james peter jude revelation first second third")
CITATION_WORDS = set(_BOOKS.split()) | {"chapter", "chapters", "verse", "verses", "to", "and"} | {
    w for n in range(0, 200) for w in ne.num_to_words(n).replace("-", " ").split()}

SLICE_S = 10
STEP_S = 5


def transcribe_slices(asr, audio, sr):
    """Whisper over short overlapping slices. Over a whole request (up to a
    minute) it silently skips parenthetical citations and list lines that are
    plainly in the audio: on By the Heel it reported 59 words missing from a
    reading list that 10-second slices heard in full. Slices do not skip."""
    texts = []
    for st in range(0, len(audio), STEP_S * sr):
        seg = audio[st:st + SLICE_S * sr]
        if len(seg) < sr // 2:
            break
        texts.append(asr({"raw": seg, "sampling_rate": sr},
                         generate_kwargs={"language": "en", "task": "transcribe"})["text"])
    return texts


def check_request(asr, n, sent, mp3, tmp):
    audio, sr = decode16k(mp3, tmp)
    seconds = len(audio) / sr
    slices = transcribe_slices(asr, audio, sr)
    heard_words = [w for t in slices for w in words(t)]
    a = words(sent)
    # Coverage by trigram: overlapping slices repeat words, so an alignment
    # would count repeats as insertions. Every sent trigram must occur in what
    # was heard; a run of consecutive missing trigrams is a dropped phrase.
    heard_tri = {tuple(heard_words[i:i + 3]) for i in range(len(heard_words) - 2)}
    miss = [tuple(a[i:i + 3]) not in heard_tri for i in range(max(0, len(a) - 2))]
    problems, soft, run, start = [], [], 0, 0
    for i, m in enumerate(miss + [False]):
        if m:
            if run == 0:
                start = i
            run += 1
        else:
            # a single substituted word breaks 3 trigrams; 3+ words gone breaks 5+
            if run >= 2 + DROP_RUN:
                phrase = a[start:start + run + 2]
                core = phrase[2:-2] or phrase
                if sum(1 for w in core if w in CITATION_WORDS) >= 0.8 * len(core):
                    soft.append(" ".join(phrase))
                else:
                    problems.append(f"not heard ({run + 2 - 4}+ words): “{' '.join(phrase)}”")
            run = 0
    covered = sum(1 for m in miss if not m)
    tail = a[-TAIL_WORDS:]
    last = words(slices[-1]) + (words(slices[-2]) if len(slices) > 1 else [])
    if len(a) >= TAIL_WORDS and sum(1 for w in tail if w in last) < TAIL_WORDS - 1:
        problems.append(f"ending not heard: sent “…{' '.join(tail)}”")
    wpm = len(a) / seconds * 60 if seconds else 0
    if len(a) >= 25 and not (WPM_BAND[0] <= wpm <= WPM_BAND[1]):
        problems.append(f"rate {wpm:.0f} wpm outside {WPM_BAND}")
    matched = round(len(a) * covered / max(1, len(miss)))
    return {"request": n, "words": len(a), "matched": matched,
            "coverage": covered / max(1, len(miss)), "seconds": round(seconds, 1),
            "problems": problems, "citations_unconfirmed": soft,
            "heard": " | ".join(t.strip() for t in slices)}


def main():
    slugs = [x for x in sys.argv[1:] if not x.startswith("--")]
    model = (sys.argv[sys.argv.index("--model") + 1]
             if "--model" in sys.argv else "openai/whisper-large-v3-turbo")
    report = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else None
    for opt in (model, report):
        if opt in slugs:
            slugs.remove(opt)
    manifest = json.load(open(rc.MANIFEST))
    vid = open(rc.VOICE_FILE).read().strip()
    asr = load_asr(model)
    results, failed = {}, 0
    with tempfile.TemporaryDirectory() as td:
        for slug in slugs:
            dev = json.load(open(os.path.join(rc.DEVOTIONALS, f"{slug}.json")))
            contract = manifest.get(slug, {}).get("contract", 1)
            groups = rc.chunks(ne.extract(dev, contract), contract)
            rows = []
            for n, g in enumerate(groups, 1):
                sent = " ".join(s["text"] for s in g)
                mp3 = os.path.join(rc.CACHE, rc.cache_key(sent, vid) + ".mp3")
                if not os.path.exists(mp3):
                    rows.append({"request": n, "problems": ["NOT RENDERED (no cached audio)"],
                                 "words": len(words(sent)), "matched": 0, "coverage": 0})
                    continue
                rows.append(check_request(asr, n, sent, mp3, os.path.join(td, "r.wav")))
            bad = [r for r in rows if r["problems"]]
            total = sum(r["words"] for r in rows)
            got = sum(r["matched"] for r in rows)
            print(f"{'PASS' if not bad else 'FAIL'} {slug} | contract {contract} | "
                  f"{len(rows)} requests | {got}/{total} words heard "
                  f"({got / max(1, total):.1%})")
            for r in bad:
                for p in r["problems"]:
                    print(f"     request {r['request']}: {p}")
            failed += len(bad)
            results[slug] = rows
    if report:
        json.dump(results, open(report, "w"), indent=1)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
