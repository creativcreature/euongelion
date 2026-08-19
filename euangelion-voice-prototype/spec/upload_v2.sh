#!/bin/zsh
# Upload the verified plan to R2 under content-versioned keys.
# Idempotent: a key already logged ok is skipped, so this resumes freely.
cd /Users/jamesparker/Documents/app-projects/external/euangelion
LOG=euangelion-voice-prototype/upload-v2.log
CACHE="public, max-age=31536000, immutable"
while IFS='|' read -r slug src key sha; do
  [ -z "$key" ] && continue
  grep -q "^ok ${key}$" $LOG 2>/dev/null && continue
  ok=0
  for attempt in 1 2 3; do
    err=$(npx wrangler r2 object put "euangelion-audio/${key}" --file "$src" \
            --content-type audio/mp4 --cache-control "$CACHE" --remote 2>&1)
    echo "$err" | grep -q "Upload complete" && { ok=1; break; }
    sleep $((attempt * 4))
  done
  [ "$ok" = "1" ] && echo "ok ${key}" >> $LOG \
    || echo "FAIL ${key} :: $(echo "$err" | grep -iE 'error|failed' | head -1 | cut -c1-100)" >> $LOG
done < euangelion-voice-prototype/upload-plan.txt
echo "PASS DONE $(date +%H:%M)" >> $LOG
