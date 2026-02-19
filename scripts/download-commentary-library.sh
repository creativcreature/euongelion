#!/usr/bin/env bash
# Download bulk public domain commentary texts for Euangelion reference library
# All works are fully public domain and cleared for commercial use
# Run from the project root: bash scripts/download-commentary-library.sh
#
# Sources:
#   Project Gutenberg: gutenberg.org (public domain)
#   CCEL: ccel.org (public domain)
#   SpurgeonGems: spurgeongems.org (public domain)
#   Internet Archive: archive.org (public domain)

set -e

BASE="$(cd "$(dirname "$0")/.." && pwd)/content/reference/commentaries"
echo "📚 Euangelion Commentary Library Downloader"
echo "Base directory: $BASE"
echo ""

mkdir -p "$BASE"

# ────────────────────────────────────────────
# ANDREW MURRAY (1828-1917) — Public Domain
# Already downloaded: abide-in-christ, with-christ-in-school-of-prayer,
#   absolute-surrender, the-true-vine, waiting-on-god, ministry-of-intercession
# ────────────────────────────────────────────
echo "📖 Andrew Murray..."
mkdir -p "$BASE/murray"

MURRAY_BOOKS=(
  "21505:humility"
  "21511:the-prayer-life"
  "21530:the-spirit-of-christ"
  "21532:working-for-god"
  "21533:help-for-those-who-suffer"
  "21534:key-to-the-missionary-problem"
  "21535:like-christ"
  "21536:lord-teach-us-to-pray"
  "21537:the-master-indwelling"
  "21539:the-two-covenants"
  "21540:the-holiest-of-all"
  "21543:be-perfect"
  "21544:the-power-of-the-blood-of-christ"
  "21548:the-believer-s-daily-renewal"
  "21549:the-prayer-life"
  "21550:day-by-day-with-andrew-murray"
  "21553:let-us-draw-nigh"
)

for entry in "${MURRAY_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/murray/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# SPURGEON (1834-1892) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 Charles Spurgeon..."
mkdir -p "$BASE/spurgeon"

# Additional Spurgeon PG works
SPURGEON_BOOKS=(
  "13552:around-the-wicket-gate"
  "13555:all-of-grace"
  "13553:faith"
  "13554:come-ye-children"
)

for entry in "${SPURGEON_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/spurgeon/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# JONATHAN EDWARDS (1703-1758) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 Jonathan Edwards..."
mkdir -p "$BASE/edwards"

EDWARDS_BOOKS=(
  "34634:the-nature-of-true-virtue"
  "14744:a-careful-and-strict-enquiry-into-freedom-of-will"
)

for entry in "${EDWARDS_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/edwards/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# JOHN CALVIN (1509-1564) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 John Calvin..."
mkdir -p "$BASE/calvin"

CALVIN_BOOKS=(
  "45001:institutes-of-the-christian-religion-vol1"
  "45002:institutes-of-the-christian-religion-vol2"
)

for entry in "${CALVIN_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/calvin/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# JOHN WESLEY (1703-1791) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 John Wesley..."
mkdir -p "$BASE/wesley"

WESLEY_BOOKS=(
  "10305:sermons-on-several-occasions-vol1"
  "10313:sermons-on-several-occasions-vol2"
  "10318:sermons-on-several-occasions-vol3"
  "10319:sermons-on-several-occasions-vol4"
)

for entry in "${WESLEY_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/wesley/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# MARTIN LUTHER (1483-1546) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 Martin Luther..."
mkdir -p "$BASE/luther"

LUTHER_BOOKS=(
  "1509:ninety-five-theses"
  "9104:table-talk"
  "7894:large-catechism"
)

for entry in "${LUTHER_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/luther/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# AUGUSTINE (354-430) — Public Domain
# ────────────────────────────────────────────
echo ""
echo "📖 Augustine..."
mkdir -p "$BASE/augustine"

AUGUSTINE_BOOKS=(
  "3296:confessions"
  "45304:city-of-god"
  "808:on-christian-doctrine"
  "8402:the-enchiridion"
)

for entry in "${AUGUSTINE_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/augustine/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# FREDERICK DOUGLASS (c. 1817-1895) — Public Domain
# Already downloaded: narrative-of-the-life-of-frederick-douglass.txt
# ────────────────────────────────────────────
echo ""
echo "📖 Frederick Douglass..."
mkdir -p "$BASE/douglass"

DOUGLASS_BOOKS=(
  "99:my-bondage-and-my-freedom"
  "202:life-and-times-of-frederick-douglass"
)

for entry in "${DOUGLASS_BOOKS[@]}"; do
  PG_ID="${entry%%:*}"
  SLUG="${entry##*:}"
  OUTFILE="$BASE/douglass/${SLUG}.txt"
  if [ ! -f "$OUTFILE" ] || [ ! -s "$OUTFILE" ]; then
    echo "  Downloading $SLUG (PG #$PG_ID)..."
    curl -s --max-time 30 "https://www.gutenberg.org/cache/epub/${PG_ID}/pg${PG_ID}.txt" -o "$OUTFILE" || echo "  ⚠️  Failed: $SLUG"
  else
    echo "  ✓ Already have $SLUG"
  fi
done

# ────────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────────
echo ""
echo "✅ Download complete. Summary:"
for dir in "$BASE"/*/; do
  AUTHOR=$(basename "$dir")
  COUNT=$(ls "$dir"*.txt 2>/dev/null | wc -l | tr -d ' ')
  SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
  echo "  $AUTHOR: $COUNT text files ($SIZE)"
done
echo ""
echo "NOTE: For the full Spurgeon Metropolitan Tabernacle Pulpit (63 vols),"
echo "visit: https://archive.org/details/spurgeon-metropolitan-tabernacle-pulpit"
echo "Those volumes are available as plain text on the Internet Archive."
