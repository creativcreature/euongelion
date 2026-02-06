#!/bin/bash
# Upload reference materials to Supabase Storage
# Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
#
# Usage: ./scripts/upload-reference.sh [folder]
#   folder: bibles, commentaries, dictionaries, lexicons, stepbible-data
#   If no folder specified, uploads all.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REFERENCE_DIR="$PROJECT_DIR/content/reference"
BUCKET="reference-library"

# Load env
if [ -f "$PROJECT_DIR/app/.env.local" ]; then
  export $(grep -E "NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" "$PROJECT_DIR/app/.env.local" | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
elif [ -f "$PROJECT_DIR/euongelion/.env.local" ]; then
  export $(grep -E "NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" "$PROJECT_DIR/euongelion/.env.local" | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  echo "  SUPABASE_URL=https://your-project.supabase.co"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
  exit 1
fi

STORAGE_URL="$SUPABASE_URL/storage/v1/object/$BUCKET"
FOLDERS="${1:-bibles commentaries dictionaries lexicons stepbible-data}"

uploaded=0
skipped=0
failed=0

for folder in $FOLDERS; do
  if [ ! -d "$REFERENCE_DIR/$folder" ]; then
    echo "Warning: $folder not found, skipping"
    continue
  fi

  echo ""
  echo "=== Uploading $folder ==="

  find "$REFERENCE_DIR/$folder" -type f | while read -r file; do
    # Get relative path from reference dir
    rel_path="${file#$REFERENCE_DIR/}"

    # Determine content type
    ext="${file##*.}"
    case "$ext" in
      json) ct="application/json" ;;
      html|htm) ct="text/html" ;;
      xml) ct="application/xml" ;;
      csv) ct="text/csv" ;;
      md) ct="text/markdown" ;;
      txt) ct="text/plain" ;;
      zip) ct="application/zip" ;;
      pdf) ct="application/pdf" ;;
      *) ct="application/octet-stream" ;;
    esac

    # Upload
    response=$(curl -s -w "%{http_code}" -o /dev/null \
      -X POST "$STORAGE_URL/$rel_path" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: $ct" \
      --data-binary "@$file" 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
      ((uploaded++)) || true
    elif [ "$response" = "409" ]; then
      ((skipped++)) || true  # Already exists
    else
      echo "  FAILED ($response): $rel_path"
      ((failed++)) || true
    fi
  done

  echo "  Done: $folder"
done

echo ""
echo "=== Upload Complete ==="
echo "  Uploaded: $uploaded"
echo "  Skipped (exists): $skipped"
echo "  Failed: $failed"
