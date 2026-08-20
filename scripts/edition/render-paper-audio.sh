#!/usr/bin/env bash
# The whole paper, read aloud (SA-114 / F-158) — LOCAL pipeline.
#
# Voicebox is the ruled voice for The Daily Bread and runs only on this Mac
# (127.0.0.1:17493), so this renders locally: assemble the day's written
# sections -> render_v2.py -> m4a -> Supabase Storage -> manifest. The page
# picks the track up within 5 minutes (ISR) — no deploy.
#
# Usage: ./scripts/edition/render-paper-audio.sh [YYYY-MM-DD]
set -euo pipefail
cd "$(dirname "$0")/../.."
DATE="${1:-$(date -u -v+1d +%Y-%m-%d 2>/dev/null || date -u -d tomorrow +%Y-%m-%d)}"
set -a; source .env.local; set +a

command -v curl >/dev/null
curl -sf --max-time 5 http://127.0.0.1:17493/health >/dev/null \
  || { echo "Voicebox is not running (127.0.0.1:17493) — open Voicebox.app first"; exit 1; }

WORK=$(mktemp -d)
JSON="$WORK/paper-$DATE.json"
WAV="$WORK/paper-$DATE.wav"
M4A="$WORK/paper-$DATE.m4a"

npx tsx scripts/edition/assemble-paper-narration.mts "$DATE" "$JSON"
( cd euangelion-voice-prototype && python3 spec/render_v2.py "$JSON" "$WAV" )
ffmpeg -y -i "$WAV" -c:a aac -b:a 96k "$M4A" 2>/dev/null

DURATION=$(python3 - "$WAV" <<'PY'
import sys, wave
w = wave.open(sys.argv[1])
print(round(w.getnframes() / w.getframerate()))
PY
)
WORDS=$(python3 - "$JSON" <<'PY'
import sys, json
d = json.load(open(sys.argv[1]))
print(sum(len(p["content"].split()) for p in d["panels"]))
PY
)

KEY="paper-audio/daily-bread-$DATE.m4a"
curl -sf -X POST "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/edition-assets/$KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: audio/mp4" -H "x-upsert: true" --data-binary "@$M4A" >/dev/null

MANIFEST_URL="$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/edition-assets/pipeline/paper-audio.json"
EXISTING=$(curl -sf -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$MANIFEST_URL" || echo '{}')
python3 - "$DATE" "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/edition-assets/$KEY" "$DURATION" "$WORDS" <<PY > "$WORK/manifest.json"
import sys, json
m = json.loads('''$EXISTING''')
m[sys.argv[1]] = {"src": sys.argv[2], "duration": int(sys.argv[3]), "words": int(sys.argv[4])}
print(json.dumps(m, indent=1))
PY
curl -sf -X POST "$MANIFEST_URL" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -H "x-upsert: true" --data-binary "@$WORK/manifest.json" >/dev/null

echo "[paper-audio] $DATE installed: ${DURATION}s, $WORDS words → $KEY"
