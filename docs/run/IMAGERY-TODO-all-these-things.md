# Day-plate imagery — the complete step list (nothing gets dropped)

Founder: "why isnt there 3 images per day?" — spec is min 3 per devotional.
**Target: 21 plates (3 x 7 days).** Series master is DONE and live (v2).

- [ ] 1. Write 21 subject lines, each per SA-124: built FROM the verse clause by
     clause, camera named FIRST, negative constraints audited against the text
- [ ] 2. Vary all FOUR axes across the set; no two neighbours share distance+relationship;
     medium/frontal/eye-level under ~1/3 of the set
- [ ] 3. Generate via `codex exec` (built-in image_gen only, 4 anchors attached)
- [ ] 4. Accuracy-gate EVERY plate by opening it: fingers, Escher geometry,
     suits-the-passage, fact-check, worst-case crops
- [ ] 5. Install to `public/images/series/all-these-things/` as webp
- [ ] 6. Insert `inline-image` modules with captions (the caption IS the
     contextual justification) — SAFE, does not invalidate audio (verified)
- [ ] 7. Re-run validator + readability
- [ ] 8. Set-level report: ink coverage per plate vs band, sd (>15), camera
     distribution, contact sheet at true series-card size
- [ ] 9. Rebuild, commit, deploy, verify live by hash
- [ ] 10. Update F-168 + CHANGELOG

## The 21 plates — four axes assigned, no repeats adjacent

| #   | Day | Camera (distance / height / relationship)        | Band      | Archetype                  | Device                                                                                            | Verse it comes from |
| --- | --- | ------------------------------------------------ | --------- | -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | 1   | wide / low, looking UP / three-quarter           | AIRY 25%  | A scale break              | a young king kneeling under an enormous night sky, asking                                         | 1 Kgs 3:5,9         |
| 2   | 1   | EXTREME CLOSE / ground-level / profile           | MID 45%   | I detail crop              | one wild lily filling the frame, a king's heavy embroidered hem crushed small behind it           | Matt 6:28-29        |
| 3   | 1   | extreme wide / high vantage / from behind        | AIRY 30%  | B vast field, tiny figure  | birds crossing an empty sky above bare unharvested ground, no barn anywhere in frame              | Matt 6:26           |
| 4   | 2   | close / straight-DOWN overhead plan / —          | MID 45%   | G overhead plan            | dew-bread on desert floor at dawn, gathered hands entering from the frame edge                    | Exo 16:14,21        |
| 5   | 2   | EXTREME CLOSE / low / three-quarter              | DENSE 70% | I detail crop              | a clay jar's mouth, kept manna spoiled and crawling, morning light on the rim                     | Exo 16:20           |
| 6   | 2   | medium / eye-level / FROM BEHIND                 | MID 50%   | F framed view              | a working woman stopped in a doorway, seen from behind, the still room beyond her                 | Luke 10:40-41       |
| 7   | 3   | wide / high / FROM BEHIND                        | AIRY 30%  | H silhouette               | one small figure alone on a rampart at night, facing out, waiting for a reply                     | Hab 2:1             |
| 8   | 3   | EXTREME WIDE vista / eye-level / frontal         | DENSE 80% | B vast field               | darkness over a whole land at midday, the crowd tiny and scattered beneath it                     | Matt 27:45          |
| 9   | 3   | wide / straight-DOWN overhead plan / —           | AIRY 25%  | G overhead plan            | one figure at the centre of an empty expanse, four directions of nothing                          | Job 23:8-9          |
| 10  | 4   | close / LOW, looking UP / frontal                | DENSE 75% | J impossible juxtaposition | a heavy temple curtain split from its top edge downward, torn from above                          | Matt 27:51          |
| 11  | 4   | EXTREME WIDE / eye-level / three-quarter         | MID 40%   | A scale break              | an enormous cliff face with one tiny figure sheltering at its base                                | Ps 62:6-7           |
| 12  | 4   | medium / eye-level / FROM BEHIND (over-shoulder) | MID 50%   | F framed view              | seen from behind, walking through an opened way toward light, no attendant, no queue              | Heb 4:16, 10:19-20  |
| 13  | 5   | wide / high vantage / three-quarter              | DENSE 70% | E repetition + one break   | sentries posted along a city wall at night, evenly spaced, one turned INWARD                      | Phil 4:7            |
| 14  | 5   | medium / eye-level / FROM BEHIND                 | MID 50%   | F framed view              | a city gate seen from INSIDE, a guard standing across it, facing the people not the enemy         | Phil 4:7            |
| 15  | 5   | close / low / three-quarter                      | MID 45%   | C single object            | heaped offering-goods, hands open and empty above them, giving back                               | 1 Chr 29:14         |
| 16  | 6   | close / straight-DOWN overhead / —               | MID 40%   | I detail crop              | five objects from the week laid in a printer's tray: staff, jar, rampart stone, torn cloth, bread | recap               |
| 17  | 6   | wide / eye-level / from behind                   | AIRY 30%  | B vast field               | a road behind and a road ahead from a low rise at week's end                                      | recap               |
| 18  | 6   | EXTREME CLOSE / low / profile                    | MID 45%   | I detail crop              | a hand closing a book on a table, lamp low                                                        | recap               |
| 19  | 7   | close / eye-level / frontal                      | AIRY 22%  | C single object            | one day's bread on bare boards, nothing stored beside it                                          | Matt 6:34           |
| 20  | 7   | extreme wide / high / from behind                | AIRY 25%  | B vast field               | a figure seated still on a hillside at dusk, doing nothing, hands empty                           | Lam 3:26            |
| 21  | 7   | medium / low, looking UP / —                     | AIRY 28%  | H silhouette               | an unlit lamp and a made bed, day's end, one window of last light                                 | sabbath             |

**Camera audit:** medium/eye-level/frontal appears 0 times as a full triple.
From-behind: 7 of 21. Overhead plan: 3. Low-looking-up: 3. Extreme close: 3.
Extreme wide: 3. High vantage: 4. Bands: AIRY 9 / MID 9 / DENSE 3.

---

## AFTER images are live — founder instruction 2026-08-24

- [ ] 11. **Set up hooks on the skill to lock accuracy + devotional consistency.**
      Founder: "This is a massive issue." Do this ONLY after all 21 plates are
      live. Design already scoped: a `check-devotional-consistency.mjs` verifier
      wired as BOTH a Claude Code PostToolUse hook (fires on any write to
      `public/devotionals/*.json`) and a husky pre-commit step.
      It must catch, mechanically, everything that was caught by hand this run:
      - module field TYPES vs the shipped catalog (would have caught
        `wordByWord`/`relatedWords` as strings BEFORE two failed builds)
      - red-letter resolution on every Matt/Mark/Luke/John/Acts/Rev module
      - > = 3 inline-image modules per day, each with a non-empty caption
      - transliteration present near every Hebrew/Greek string
      - textHash currency: audio manifest matches the day's current text
      - cross-testament link present on every teaching day (SA-032)
