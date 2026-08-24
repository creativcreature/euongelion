#!/bin/bash
# SA-124 — devotional accuracy gate as a Claude Code PostToolUse hook.
#
# The husky gate catches these at COMMIT time. This catches them at WRITE time,
# which is the difference between a two-second correction and a failed
# production build forty minutes later.
#
# Reads the hook payload on stdin, does nothing unless a devotional JSON was
# just written, and never blocks the session — it reports, loudly.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 0
PAYLOAD=$(cat 2>/dev/null || true)
[ -z "$PAYLOAD" ] && exit 0
FILE=$(printf '%s' "$PAYLOAD" | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
ti=d.get("tool_input") or {}
print(ti.get("file_path") or ti.get("filePath") or "")
' 2>/dev/null)
case "$FILE" in
  *public/devotionals/*.json) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0
if ! OUT=$(node scripts/check-devotional-consistency.mjs "$FILE" 2>&1); then
  {
    echo "⚠️  devotional-consistency found problems in $(basename "$FILE"):"
    echo "$OUT"
    echo ""
    echo "These break the render or the contract. Fix before building."
  } >&2
fi
exit 0
