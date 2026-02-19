#!/usr/bin/env bash
# Download the Berean Standard Bible (BSB) — CC0 Public Domain (2023)
# Source: https://bible.helloao.org/api/BSB/ (official public API)
# Commercial use: ✅ Fully free — CC0 means no restrictions whatsoever
# Attribution: Not required (CC0), but credit appreciated
#
# Usage: bash scripts/download-bsb.sh
# Output: content/reference/bibles/BSB/BSB.json (single-file, full Bible)

set -e

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/content/reference/bibles/BSB"
mkdir -p "$OUT_DIR"

BASE_URL="https://bible.helloao.org/api/BSB"

echo "📖 Downloading Berean Standard Bible (CC0 Public Domain)"
echo "Output: $OUT_DIR/BSB.json"
echo ""

# Book codes in canonical order (66 books)
BOOKS=(
  GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB
  PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAH HAB ZEP
  HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI
  2TI TIT PHM HEB JAS 1PE 2PE 1JO 2JO 3JO JUD REV
)

# Chapter counts per book
CHAPTERS=(
  50 40 27 36 34 24 21 4 31 24 22 25 29 36 10 13 10 42
  150 31 12 8 66 52 5 48 12 14 3 9 1 4 7 3 3 3 2 14 4
  28 16 24 21 28 16 16 13 6 6 4 4 5 3 6 4 3 1 13 5 5 3 5 1 1 1 22
)

# Build full Bible as JSON
echo "[" > "$OUT_DIR/BSB.json"
FIRST_BOOK=true

for i in "${!BOOKS[@]}"; do
  BOOK="${BOOKS[$i]}"
  CHAP_COUNT="${CHAPTERS[$i]}"

  echo -n "  $BOOK ($CHAP_COUNT chapters)..."

  if [ "$FIRST_BOOK" = "false" ]; then
    echo "," >> "$OUT_DIR/BSB.json"
  fi
  FIRST_BOOK=false

  echo "{\"book\":\"$BOOK\",\"chapters\":[" >> "$OUT_DIR/BSB.json"
  FIRST_CHAP=true

  for c in $(seq 1 "$CHAP_COUNT"); do
    CHAPTER_DATA=$(curl -s --max-time 15 "$BASE_URL/$BOOK/$c.json" 2>/dev/null)
    if [ -n "$CHAPTER_DATA" ]; then
      if [ "$FIRST_CHAP" = "false" ]; then
        echo "," >> "$OUT_DIR/BSB.json"
      fi
      FIRST_CHAP=false
      echo "$CHAPTER_DATA" >> "$OUT_DIR/BSB.json"
    fi
  done

  echo "]}" >> "$OUT_DIR/BSB.json"
  echo " ✓"
done

echo "]" >> "$OUT_DIR/BSB.json"

echo ""
echo "✅ BSB download complete."
echo "File size: $(du -sh "$OUT_DIR/BSB.json" | cut -f1)"
echo "Location: $OUT_DIR/BSB.json"
