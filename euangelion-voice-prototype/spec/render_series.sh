#!/bin/bash
# Render + publish a whole devotional series.
#
# Usage: ./render_series.sh <slug-prefix> [voice] [day ...]
#   ./render_series.sh he-cannot-deny-himself am_michael 3 2 4 5 6 7
#
# Days may be listed in priority order — whatever the reader needs first gets
# rendered first, so it is usable before the rest of the series finishes.
# Each day is encoded to AAC and registered in public/audio/manifest.json.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC="$REPO/euangelion-voice-prototype/spec"
OUT="$REPO/euangelion-voice-prototype/renders"
mkdir -p "$OUT"

PREFIX="${1:?slug prefix required}"
VOICE="${2:-am_michael}"
shift 2 || true
DAYS=("$@")

if [ ${#DAYS[@]} -eq 0 ]; then
  for f in "$REPO"/public/devotionals/"$PREFIX"-day-*.json; do
    DAYS+=("$(basename "$f" .json | sed "s/.*-day-//")")
  done
fi

echo "series: $PREFIX | voice: $VOICE | days: ${DAYS[*]}"
FAILED=()
for d in "${DAYS[@]}"; do
  SLUG="$PREFIX-day-$d"
  SRC="$REPO/public/devotionals/$SLUG.json"
  if [ ! -f "$SRC" ]; then
    echo "!! missing $SRC"; FAILED+=("$d"); continue
  fi
  echo ""
  echo "=============== day $d ==============="
  if python3 "$SPEC/render_kokoro.py" "$SRC" "$OUT/$SLUG.wav" \
        --voice "$VOICE" --publish 2>&1 | tail -12; then
    :
  else
    echo "!! render failed for day $d"; FAILED+=("$d")
  fi
done

echo ""
echo "================ DONE ================"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "FAILED days: ${FAILED[*]}"
else
  echo "all days rendered"
fi
python3 - "$REPO" <<'PY'
import json, os, sys
repo = sys.argv[1]
p = os.path.join(repo, "public", "audio", "manifest.json")
m = json.load(open(p))
total = sum(v["duration"] for v in m.values())
size = sum(v["bytes"] for v in m.values()) / 1024 / 1024
print(f"manifest: {len(m)} tracks, {total/60:.0f} min audio, {size:.1f} MB")
for k, v in m.items():
    print(f"  {k:44} {v['duration']/60:5.1f} min  {v['bytes']/1024/1024:5.1f} MB")
PY
