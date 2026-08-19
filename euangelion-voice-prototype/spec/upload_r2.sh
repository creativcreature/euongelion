#!/bin/zsh
# Upload the audio catalog to R2, resumably.
#
# Source of truth per track:
#   - founder-voice tracks (engine=elevenlabs) come from public/audio/
#   - everything else comes from euangelion-voice-prototype/scored/ once scored,
#     and is SKIPPED until then — an unscored track is not ready to ship.
#
# Cache-Control is set at upload time. R2 serves no cache header by default,
# which would make browsers re-fetch tracks they already hold — worse for the
# listener and it burns read operations for nothing. A track's URL only changes
# when its content changes, so immutable is correct.
#
# Idempotent: a track already uploaded at its current size is skipped, so this
# can be re-run as scoring produces more files without re-sending gigabytes.
cd /Users/jamesparker/Documents/app-projects/external/euangelion
BUCKET=euangelion-audio
LOG=euangelion-voice-prototype/upload-r2.log
LIST=euangelion-voice-prototype/upload-queue.txt
CACHE="public, max-age=31536000, immutable"

# Build the verified queue FIRST, to a file. Generating it inside a pipeline
# hid every failure behind shell buffering; a file can be inspected.
python3 euangelion-voice-prototype/spec/upload_queue.py > "$LIST" || exit 1
echo "[upload] queue: $(wc -l < $LIST | tr -d ' ') verified tracks" >> $LOG

while IFS='|' read -r slug src; do
  [ -z "$slug" ] && continue
  size=$(stat -f%z "$src" 2>/dev/null) || continue
  grep -q "^ok ${slug} ${size}$" $LOG 2>/dev/null && continue
  # Retry: back-to-back uploads hit transient failures (28 of 154 on the first
  # pass, every one of which succeeded on an immediate manual retry). Keep
  # wrangler's own error for the final attempt rather than discarding it.
  ok=0
  for attempt in 1 2 3; do
    err=$(npx wrangler r2 object put "${BUCKET}/${slug}.m4a" --file "$src" \
            --content-type audio/mp4 --cache-control "$CACHE" --remote 2>&1)
    if echo "$err" | grep -q "Upload complete"; then ok=1; break; fi
    sleep $((attempt * 4))
  done
  if [ "$ok" = "1" ]; then
    echo "ok ${slug} ${size}" >> $LOG
  else
    echo "FAIL ${slug} :: $(echo "$err" | grep -iE 'error|failed' | head -1 | cut -c1-110)" >> $LOG
  fi
done < "$LIST"
echo "[upload] pass done $(date +%H:%M)" >> $LOG
