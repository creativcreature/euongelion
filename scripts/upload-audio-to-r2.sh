#!/usr/bin/env bash
#
# Push public/audio/*.m4a to the R2 bucket that serves narration.
#
# Two reasons this exists, and both matter:
#
#   1. SEEKING. Cloudflare's static-asset layer does not implement 206 Partial
#      Content, so a Range request returns the whole file — every scrub in a
#      20-minute reading refetches all of it. R2 reads byte ranges natively.
#   2. DURABILITY. 380 of the 550 tracks are gitignored, so they exist only on
#      one machine plus whatever is deployed. A rebuild from a fresh clone would
#      ship a catalogue that genuinely 404s, and the audio could not be
#      reconstructed without re-rendering it.
#
# `--remote` IS NOT OPTIONAL. `wrangler r2 object put` defaults to the LOCAL
# miniflare store, so without it every upload lands in .wrangler/state and the
# deployed Worker sees nothing. That mistake shipped once: 550 files "uploaded"
# successfully, round-tripped byte-identical through `r2 object get`, and
# production still 404'd — because both sides of the check were talking to the
# local store. Verify against the deployed Worker, never against the CLI alone.
#
# Idempotent via a local ledger: wrangler 4.110 has no `r2 object list`, so the
# script records name+size after each successful put and skips anything
# unchanged. Delete the ledger (or pass --force) to re-upload everything. Run it
# after any re-render.
#
#   ./scripts/upload-audio-to-r2.sh          # upload what is missing or changed
#   ./scripts/upload-audio-to-r2.sh --force  # re-upload everything
set -uo pipefail

BUCKET="euangelion-audio"
SRC="public/audio"
LEDGER=".r2-upload-ledger.txt"
CONCURRENCY="${R2_CONCURRENCY:-6}"
FORCE="${1:-}"

[ -d "$SRC" ] || { echo "ERROR: $SRC not found. Run from the repo root." >&2; exit 1; }
[ "$FORCE" = "--force" ] && rm -f "$LEDGER"
touch "$LEDGER"

TOTAL=$(find "$SRC" -name '*.m4a' | wc -l | tr -d ' ')
echo "[r2] $TOTAL tracks -> r2://$BUCKET (concurrency $CONCURRENCY)"
echo "[r2] ledger has $(wc -l < "$LEDGER" | tr -d ' ') entries"

upload_one() {
  local path="$1" name size
  name=$(basename "$path")
  size=$(stat -f%z "$path" 2>/dev/null || stat -c%s "$path")
  if grep -qxF "$name $size" "$LEDGER" 2>/dev/null; then
    echo "[skip] $name"
    return 0
  fi
  if npx wrangler r2 object put "$BUCKET/$name" --file "$path" \
       --content-type "audio/mp4" --remote >/dev/null 2>&1 \
     || npx wrangler r2 object put "$BUCKET/$name" --file "$path" \
       --content-type "audio/mp4" --remote >/dev/null 2>&1; then
    # Append is atomic enough for short lines under xargs -P on macOS/Linux.
    echo "$name $size" >> "$LEDGER"
    echo "[ok]   $name"
  else
    echo "[FAIL] $name"
  fi
}
export -f upload_one
export BUCKET LEDGER

find "$SRC" -name '*.m4a' -print0 \
  | xargs -0 -P "$CONCURRENCY" -I{} bash -c 'upload_one "$@"' _ {}

# Count UNIQUE tracks, not lines. The ledger appends, so a re-rendered
# track leaves its old size behind and a line count exceeds the file
# count from then on — reporting INCOMPLETE forever on a complete upload.
UPLOADED=$(awk '{print $1}' "$LEDGER" | sort -u | wc -l | tr -d ' ')
echo "[r2] ledger now $UPLOADED / $TOTAL"
[ "$UPLOADED" -eq "$TOTAL" ] || { echo "[r2] INCOMPLETE — re-run to finish"; exit 1; }
echo "[r2] done"
