#!/bin/zsh
# Score the back catalog into a staging directory that is OUTSIDE git and
# OUTSIDE the deploy, so the live site keeps serving what it serves now while
# these are produced. They upload to R2 from here once it is enabled.
#
# produce.py holds whole tracks in memory as float arrays (a 25-minute
# devotional is 66M samples), so worker count is deliberately conservative —
# swapping cost this project most of a day already.
WORKER=$1; TOTAL=$2
cd /Users/jamesparker/Documents/app-projects/external/euangelion
LOG="euangelion-voice-prototype/score-w${WORKER}.log"
python3 - "$WORKER" "$TOTAL" <<'PY' | while read slug; do
import json, sys
w, t = int(sys.argv[1]), int(sys.argv[2])
m = json.load(open('src/data/audio-manifest.json'))
todo = sorted(k for k, v in m.items() if not v.get('mix'))
for s in todo[w::t]:
    print(s)
PY
  out="euangelion-voice-prototype/scored/${slug}.m4a"
  [ -s "$out" ] && continue          # already scored — resume free
  python3 euangelion-voice-prototype/spec/produce.py "$slug" "$out" \
    --from-audio "public/audio/${slug}.m4a" >> "$LOG" 2>&1 \
    && echo "ok ${slug}" >> "$LOG" || echo "FAIL ${slug}" >> "$LOG"
done
echo "WORKER ${WORKER} DONE" >> "$LOG"
