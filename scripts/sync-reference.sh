#!/bin/bash
# Download reference materials from Supabase Storage to local
# Use this on a fresh clone or new machine to get the reference data
#
# Usage: ./scripts/sync-reference.sh [folder]
#   folder: bibles, commentaries, dictionaries, lexicons, stepbible-data
#   If no folder specified, syncs all.

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
  exit 1
fi

STORAGE_URL="$SUPABASE_URL/storage/v1/object"
FOLDERS="${1:-bibles commentaries dictionaries lexicons stepbible-data}"

echo "Syncing reference materials from Supabase Storage..."
echo "Target: $REFERENCE_DIR"
echo ""

for folder in $FOLDERS; do
  echo "=== Listing $folder ==="

  mkdir -p "$REFERENCE_DIR/$folder"

  # List files in the bucket folder
  files=$(curl -s \
    "$SUPABASE_URL/storage/v1/object/list/$BUCKET" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prefix\": \"$folder/\", \"limit\": 10000}" 2>/dev/null)

  # Parse and download each file
  echo "$files" | python3 -c "
import json, sys, subprocess, os

data = json.load(sys.stdin)
ref_dir = '$REFERENCE_DIR'
bucket = '$BUCKET'
url = '$SUPABASE_URL/storage/v1/object/$BUCKET'
key = '$SUPABASE_SERVICE_ROLE_KEY'
count = 0

for item in data:
    if item.get('id') and not item.get('metadata', {}).get('mimetype', '').startswith('folder'):
        name = item['name']
        path = '$folder/' + name
        local_path = os.path.join(ref_dir, path)

        # Skip if already exists locally
        if os.path.exists(local_path):
            continue

        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        # Download
        result = subprocess.run([
            'curl', '-s', '-o', local_path,
            f'{url}/{path}',
            '-H', f'Authorization: Bearer {key}'
        ], capture_output=True)

        if result.returncode == 0:
            count += 1
            if count % 50 == 0:
                print(f'  Downloaded {count} files...')

print(f'  Synced {count} new files for $folder')
" 2>/dev/null || echo "  Warning: Could not parse file list for $folder"

done

echo ""
echo "=== Sync Complete ==="
echo "Reference materials are in: $REFERENCE_DIR"
