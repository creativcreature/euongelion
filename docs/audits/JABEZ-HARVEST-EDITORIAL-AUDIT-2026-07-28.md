# Editorial Audit — Prayer of Jabez & The Harvest (2026-07-28)

Founder ask: _"look at the Harvest and Jabez devotionals and look at redundancies and inconsistencies and bad formatting. Everything should flow in a full beautiful presentation and shouldn't feel like it's modular — should feel like reading a magazine editorial."_

Founder constraint: **"No rewriting old devotionals."** Jabez is shipped and old. Therefore only objective formatting defects were fixed; everything else below is **report-only** and awaits a ruling.

Harvest was repaired separately this session (vocab presentation + placement, duplicate opening scripture on days 2-3, angle rebalance on days 1-2) — see CHANGELOG 2026-07-28.

## Mechanical health

Jabez is in good shape mechanically. Across all 7 files: no curly-quote drift, no stray markdown, no doubled spaces, no malformed ellipses, no missing images, no missing trailing newlines, and **all 47 `emphasis` strings are verbatim substrings of their passages**. All 7 PASS `validate-devotional.mjs`.

## FIXED (formatting only — nothing rewritten)

| File                         | Module                                   | Fix                                                                                                                                                                                            |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prayer-of-jabez-day-6.json` | 1 (`vocab.usageNote`)                    | stray leading space removed                                                                                                                                                                    |
| `prayer-of-jabez-day-5.json` | 21 (`resource.resources[0].description`) | citation ended mid-clause on a dangling `", and "` — visible broken text in the Sources block. Truncated to its last complete clause (`"…paraphrased here on that basis."`). Nothing invented. |

Both verified: JSON parses, validator PASS, module type sequence byte-identical to HEAD.

## HIGH — needs a founder ruling

1. **`vayyave` is taught five times in one day** (`day-4`, modules 0, 1×2, 4, 19). Modules 1 and 4 deliver the _same rhetorical move_ ("Hebrew could have said God heard/accepted; it chose a verb of transport") twice, ~8 modules apart, with no acknowledgement. Same defect class as Harvest's. **Proposed:** let the vocab card own the morphology; cut mod 4 back to its payoff sentence.
2. **The metathesis study is taught four times in one day** (`day-2`, modules 1×2, 9×2, 19). Mod 9 opens "Stay with the letters a moment longer" — acknowledging continuity — then re-teaches the identical letter breakdown _and_ repeats the Ya'tsev counterfactual. **Proposed:** mod 9 assumes the vocab card and goes straight to its own contribution.
3. **Day 6 contradicts Day 2 on the series' central word study.** Day 2: had his mother used the straight grammar of grief "he would have been Ya'tsev… 'he will cause pain.' **She did not.**" Day 6 then refers to "a man named He-will-cause-pain." A reader doing both days hits a flat contradiction. **Proposed:** Day 6 → "a man whose name carried that verb's letters."

## MEDIUM

4. Spurgeon's "indeed" passage delivered three times in `day-3` (mod 4 quote, mod 20 `keyQuote` reprint, mod 20 `lessonForUs` third pass).
5. Days 2 and 4 duplicate the same genealogical observation ("no father listed, in a document whose whole purpose is fathers").
6. **Days 4 and 5 open with byte-identical scripture** (full BSB 1 Chr 4:10) — verified equal. Days 3 and 6 deliberately vary the translation to avoid exactly this. Same defect Harvest had on days 2-3.
7. Scripture reprinted across and within days: Gen 12:2-3 (d3 + d5), 2 Sam 7:10 (d5 + d6), Ps 127:1 **twice inside d6**, Ps 16:6 (d5 mod 4 then reprinted as a full module at mod 13), and Gal 3:14 quoted in d5 mod 6 then reprinted three modules later as mod 8's `newTestamentEcho` — the Harvest "the card reprints the prose's own verse" pattern. **Highest-value single fix:** repoint d5 mod 8's echo to a verse the day hasn't used.
8. **Every body day ends with the same rhetorical move** — the A-prime teaching opens by narrating its own callback ("We opened with…", "We began with…") on all five body days. This is the strongest "modular" tell in the series. **Proposed:** vary at least two; land the callback inside the paragraph.
9. **Every B-prime teaching announces a numbered practice count** ("Four disciplines", "Three exercises", "Three practices"). Drop the count from two.
10. **Prose that names itself as an artifact**, breaking the magazine spell: "the business of this reading" (d6), "belongs in this reading" (d5), "this series confronts the episode" (d3), "Halfway through this series" (d4), "the season this series was written inside" (d2). All five convert cleanly.
11. Bridge placement is internally inconsistent: before teaching C on days 2 and 4, after it on days 3, 5, 6. Harvest is invariant (always before). On days 3/5/6 the card interrupts after the day's emotional peak.
12. Spurgeon's sermon cited three different ways; Paton's autobiography two ways. Pick one canonical string per source.
13. **Unsourced biographical detail in the finale** (`day-7` mod 2): "Spurgeon from his sickbed." Nothing earlier establishes it, and the Day 3 resource block is otherwise scrupulous (it explicitly disowns the Müller breakfast-table story and the LeTourneau shovel line). Verify or change to "from his pulpit."
14. **Sales figure converted into a behavioral claim**: d3 says the book "sold roughly eight million copies"; d4's teaser says "**Ten million people have prayed** Jabez's words." Proposed: "Ten million copies sold on the promise that the words would work."

## LOW

15. `day-5` title is plural ("Enlarge My Borders") while every translation the series quotes is singular and the Hebrew `gevul` is singular; the day's own `framework` says "territory."
16. `day-6` mod 11 `historicalContext` opens lowercase; siblings capitalize.
17. `day-2` profile heading is "The Man Himself"; days 3-6 (and all Harvest) use "A Voice From the Story." Defensible — Day 2 profiles Jabez himself.
18. `day-2` glosses Ya'tsev two ways ("he causes pain" / "he will cause pain").
19. `day-7` mod 7: the David Ring entry is the only one of six without a `url` (Harvest day 6 has the same gap on 3 of 9 — shared convention hole).
20. `day-2` is the only day with an `inline-image` between vocab and the first teaching.

## Cross-series divergence (Jabez vs Harvest)

| Convention            | Jabez                                 | Harvest                                      | Note                                                                                                                                                |
| --------------------- | ------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sabbath day**       | Day **1**                             | Day **7**                                    | **Needs a ruling.** SA-029 records "sabbath-first Sunday weeks" for all future prefab builds; Jabez is the reference build, Harvest is the outlier. |
| **Two-Minute Open**   | none                                  | days 1-6                                     | Largest structural gap. Retrofit Jabez, or declare it Harvest-specific?                                                                             |
| `format` key          | absent                                | `"two-minute-open"` on 1-5, absent 6-7       | inconsistent _inside_ Harvest                                                                                                                       |
| Vocab per day         | 1                                     | 2                                            |                                                                                                                                                     |
| `strongsNumber`       | all present                           | **missing** on harvest d1 mod 8 and d5 mod 8 | Harvest-side gap                                                                                                                                    |
| Bridge position       | mixed                                 | always pre-C                                 | see #11                                                                                                                                             |
| Scripture translation | deliberately varied, self-documenting | BSB throughout                               | Jabez's is a feature                                                                                                                                |
| `framework` wording   | mixes KJV/BSB across days             | BSB                                          | Jabez internally inconsistent                                                                                                                       |
| Quote punctuation     | straight quotes, `…`, spaced em-dash  | identical                                    | **aligned, verified char-by-char across all 14 files**                                                                                              |

**Top three cross-series actions:** (1) settle sabbath-first vs sabbath-last — it is a locked ruling one series ignores; (2) decide whether Jabez gets a Two-Minute Open or Harvest's is series-specific; (3) normalize bridge placement.
