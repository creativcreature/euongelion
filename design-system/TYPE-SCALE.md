# The unified type scale — SA-092 (2026-08-19)

Founder ruling: _"Site wide, typographic hiearchy is allover the place. I need
a unified system that works across the board, is according to best
standindards, and is beautiful."_

## The ladder — ten rungs, one system

| Token                  | Value                           | Job                                                     |
| ---------------------- | ------------------------------- | ------------------------------------------------------- |
| `--type-micro`         | 0.56rem                         | Tiny furniture: folio numbers, crossword cell numbers   |
| `--type-label`         | 0.64rem                         | Kickers, bylines, buttons, uppercase UI labels          |
| `--type-meta`          | 0.72rem                         | Compartment section heads, citations, notes, timestamps |
| `--type-body-s`        | 0.9rem                          | Secondary prose: briefs, captions, list bodies          |
| `--mock-type-0`        | clamp(0.98rem, .84vw, 1.12rem)  | Body                                                    |
| `--mock-type-1`        | clamp(1.08rem, .98vw, 1.24rem)  | Lead body, standfirsts, dense-grid card titles          |
| `--mock-type-2`        | clamp(1.26rem, 1.2vw, 1.58rem)  | Section-front / primary card titles                     |
| `--mock-type-3`        | clamp(2.28rem, 2.48vw, 3.45rem) | Page + feature headlines; display glyphs                |
| `--mock-type-4`        | clamp(3.05rem, 3.68vw, 5.05rem) | Display                                                 |
| `--mock-type-masthead` | clamp(2.72rem, 12.1vw, 13.8rem) | The wordmark. Nothing else.                             |

## Rules

1. **Every `font-size` is a token.** A hard-coded rem in a stylesheet is a
   defect. When a design wants a size "between rungs," the design is wrong —
   pick the rung.
2. **One rung per semantic level, everywhere.** All compartment heads sit at
   `--type-meta`; all feature headlines at `--mock-type-3`. Two elements doing
   the same job at different sizes is the "all over the place" the ruling
   names.
3. **The ramp above body is fluid; the label family below is fixed.** Labels
   and metadata must not shrink on mobile — they are already at the floor of
   legibility.
4. **Migration state:** the Daily Bread region (edition-\*, paper-\*,
   puzzle-\*, today-\*) is fully migrated (66 declarations + 11 rung
   assignments). ~80 stray sizes remain on other surfaces; migrate them to
   this ladder as those surfaces are touched — never add new strays.
