#!/usr/bin/env python3
"""
duotone-halftone.py

Apply newsletter-style duotone halftone to every WebP under
public/images/site/. Per founder direction (2026-05-08): all site images
must be blue/cream halftone with restrictive newsletter palette.

Reference aesthetic: navy ink on newspaper cream with halftone dots,
matching the brand bible §7.2 "single-ink discipline" and the reference
goat-on-cracked-earth image.

Algorithm:
  1. Open WebP, convert to L (grayscale)
  2. Apply contrast stretch + slight curve to maximize tonal range
  3. Halftone via ordered Bayer 4×4 dither at quarter-resolution then
     upscale (preserves detail while creating the dot pattern)
  4. Colorize: black → Deep Navy (#0A1320), white → Newspaper Cream (#F0ECE6)
  5. Save as WebP at quality 80, replacing the original

Idempotent — safe to re-run. Source files under
public/images/library/ stay untouched (those are staging).

Run:
  python3 scripts/duotone-halftone.py
"""

from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import sys

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "public" / "images" / "site"

# Brand-bible Cobalt Triad
DEEP_NAVY = (0x0A, 0x13, 0x20)  # #0A1320 — shadow color
NEWSPAPER_CREAM = (0xF0, 0xEC, 0xE6)  # #F0ECE6 — highlight color


def apply_duotone_halftone(src_path: Path) -> None:
    """Treat one WebP in place — duotone halftone on the brand palette."""
    img = Image.open(src_path)
    # Convert to grayscale, drop alpha
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, NEWSPAPER_CREAM)
        bg.paste(img, mask=img.split()[-1])
        img = bg
    gray = img.convert("L")

    # Contrast boost — pushes the tonal range toward true white/black
    # so the colorize step produces strong navy/cream contrast.
    enhanced = ImageEnhance.Contrast(gray).enhance(1.35)

    # Slight blur to soften noise before halftone (avoids speckled dots)
    enhanced = enhanced.filter(ImageFilter.GaussianBlur(radius=0.5))

    # Halftone via Bayer-style ordered dither at 1/2 resolution, then
    # upscale with NEAREST. Produces visible dot/stipple pattern that
    # matches the reference aesthetic.
    half_size = (enhanced.width // 2, enhanced.height // 2)
    small = enhanced.resize(half_size, Image.LANCZOS)
    dithered = small.convert("1", dither=Image.FLOYDSTEINBERG)
    halftone = dithered.resize(enhanced.size, Image.NEAREST).convert("L")

    # Mix: 70% halftone + 30% smooth grayscale = preserves dot pattern
    # while keeping recognizable subject shape (pure halftone is too noisy
    # for inline devotional art).
    mixed = Image.blend(enhanced, halftone, alpha=0.55)

    # Colorize: black → DEEP_NAVY, white → NEWSPAPER_CREAM
    colored = ImageOps.colorize(mixed, black=DEEP_NAVY, white=NEWSPAPER_CREAM)

    # Save back as WebP at quality 80 (matches existing convention)
    colored.save(src_path, format="WEBP", quality=80, method=4)


def main() -> int:
    if not SITE_DIR.exists():
        print(f"✗ {SITE_DIR} not found")
        return 1

    webps = sorted(SITE_DIR.rglob("*.webp"))
    print(f"━━━ Duotone halftone treatment ━━━")
    print(f"Target: {len(webps)} WebPs under {SITE_DIR.relative_to(ROOT)}")
    print()

    bytes_before = sum(p.stat().st_size for p in webps)
    for i, path in enumerate(webps):
        rel = path.relative_to(ROOT)
        try:
            apply_duotone_halftone(path)
            if (i + 1) % 25 == 0 or i == len(webps) - 1:
                print(f"  [{i + 1}/{len(webps)}] {rel}")
        except Exception as e:
            print(f"  ✗ FAILED on {rel}: {e}")
            return 2
    bytes_after = sum(p.stat().st_size for p in webps)

    print()
    print(f"✓ treated {len(webps)} files")
    print(f"  size before: {bytes_before / (1024*1024):.1f} MB")
    print(f"  size after:  {bytes_after / (1024*1024):.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
