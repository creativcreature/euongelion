#!/usr/bin/env python3
"""Derive OG-safe lead images from the site's artwork.

    npm run build:og-leads

Why this exists: Satori (which next/og renders through) decodes PNG and JPEG
only. Practically all of our artwork is stored as webp, so handing a page's own
hero straight to an OG card renders an empty band. This writes a JPEG twin of
each lead into public/images/og-lead/, sized to the exact band the card paints
so nothing is scaled twice.

Idempotent and cheap. Re-run whenever series artwork changes.
"""

import re
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / 'public' / 'images' / 'og-lead'

# The band the landscape card paints. Match it exactly.
BAND = (1200, 348)
# 74 holds up fine at the size link previews are actually shown, and keeps the
# whole set under ~2MB. These are fetched server-side per OG render, never by a
# reader's browser, but they still live in the repo.
QUALITY = 74

# Pages whose lead is a specific file rather than series artwork.
NAMED = {
    'seeking-help-georgia': 'public/images/site/seeking-help/hero.webp',
    'home': 'public/images/site/homepage/hero/header-v2.webp',
}


def series_leads() -> dict[str, str]:
    """Pair each series key with its heroImage, by reading the TS source."""
    src = (REPO / 'src' / 'data' / 'series.ts').read_text()
    keys = [(m.group(1), m.start()) for m in re.finditer(r"^\s{2}'?([a-z0-9-]+)'?:\s*\{", src, re.M)]
    out: dict[str, str] = {}
    for i, (key, at) in enumerate(keys):
        end = keys[i + 1][1] if i + 1 < len(keys) else len(src)
        hero = re.search(r"heroImage:\s*'([^']+)'", src[at:end])
        if hero:
            out[f'series-{key}'] = 'public' + hero.group(1)
    return out


def convert(name: str, rel: str) -> tuple[bool, str]:
    src = REPO / rel
    if not src.exists():
        return False, 'source missing'
    try:
        im = Image.open(src).convert('RGB')
    except Exception as exc:                      # unreadable / corrupt source
        return False, f'{type(exc).__name__}'
    # Cover-crop to the band rather than squashing: scale to fill, centre-crop.
    tw, th = BAND
    scale = max(tw / im.width, th / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = (im.width - tw) // 2
    top = (im.height - th) // 2
    im = im.crop((left, top, left + tw, top + th))
    dest = OUT / f'{name}.jpg'
    im.save(dest, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    return True, f'{dest.stat().st_size // 1024}KB'


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    mapping = {**NAMED, **series_leads()}
    ok, bad, total = 0, [], 0
    for name, rel in mapping.items():
        good, info = convert(name, rel)
        if good:
            ok += 1
            total += int(info.rstrip('KB'))
        else:
            bad.append((name, info))
    print(f'✓ {ok} OG leads written to public/images/og-lead ({total}KB total)')
    if bad:
        # Loud, not silent: a missing lead means that page falls back to a text
        # card, which is the exact thing this work set out to fix.
        print(f'! {len(bad)} skipped:')
        for n, why in bad:
            print(f'    {n} — {why}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
