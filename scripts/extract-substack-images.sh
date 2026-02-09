#!/bin/bash
# Extract topImage URLs from Substack HTML files and download them
# Maps HTML filenames to devotional slugs

set -e

HTML_DIR="content/series-html"
OUT_DIR="public/images/devotionals"
MAPPING_FILE="public/images/devotionals/image-map.json"

mkdir -p "$OUT_DIR"

echo "{"  > "$MAPPING_FILE"
FIRST=true

for html_file in "$HTML_DIR"/*.html; do
  filename=$(basename "$html_file" .html)

  # Skip non-devotional files
  if echo "$filename" | grep -q "how-to-use-the-substack-editor"; then
    continue
  fi

  # Extract the first direct S3 image URL (topImage)
  image_url=$(cat "$html_file" | tr '"' '\n' | grep '^https://substack-post-media.s3.amazonaws.com/public/images/' | head -1)

  if [ -z "$image_url" ]; then
    echo "SKIP (no image): $filename"
    continue
  fi

  # Determine file extension
  ext="${image_url##*.}"
  if [ "$ext" != "jpeg" ] && [ "$ext" != "jpg" ] && [ "$ext" != "png" ] && [ "$ext" != "webp" ]; then
    ext="jpeg"
  fi

  # Convert HTML filename to a devotional-friendly slug
  # Remove the numeric prefix (e.g., "173050460.")
  slug_part=$(echo "$filename" | sed 's/^[0-9]*\.//')

  # Normalize slug patterns:
  # "too-busy-for-god" (no day suffix) -> series intro
  # "too-busy-for-god-16" -> day 1 of 6
  # "too-busy-for-god-26" -> day 2 of 6
  # "why-jesus-day-16-week-18" -> day 1 of 6
  # Handle various patterns

  # Download the image
  out_file="$OUT_DIR/${slug_part}.${ext}"

  if [ -f "$out_file" ]; then
    echo "EXISTS: $slug_part"
  else
    echo "DOWNLOADING: $slug_part -> $image_url"
    curl -sL -o "$out_file" "$image_url"
  fi

  # Add to mapping JSON
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$MAPPING_FILE"
  fi
  printf '  "%s": "/images/devotionals/%s.%s"' "$slug_part" "$slug_part" "$ext" >> "$MAPPING_FILE"
done

echo "" >> "$MAPPING_FILE"
echo "}" >> "$MAPPING_FILE"

echo ""
echo "Done! Downloaded images to $OUT_DIR"
echo "Mapping written to $MAPPING_FILE"
ls -lh "$OUT_DIR" | tail -5
echo "Total files: $(ls -1 "$OUT_DIR" | grep -v image-map | wc -l)"
