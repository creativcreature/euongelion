# Tagline Candidates — for Founder Review

**Date:** 2026-05-11
**Audit ref:** `docs/audits/HOMEPAGE-AUDIT-2026-05-11.md` §6.1
**Status:** Pending founder decision. **No production change has been made.**

## Founder, please pick one

The current masthead tagline is **"Daily Devotionals for the Hungry Soul"**. Two of the four audit lenses agreed it underperforms — Lens B (newspaper) called it "too modest, describes the product instead of the mission," Lens C (conversion) called it "too poetic to be immediately actionable." Both right; competing rewrite registers.

Below are five candidates. Each is paired with a "mode" (declarative vs concrete vs editorial) and a one-line tradeoff. Reply with a number or a tweak and I'll ship it in the next pass.

| #   | Candidate                                        | Mode        | Tradeoff                                                                                                               |
| --- | ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **The Good News. Every day.**                    | Declarative | Newspaper-pure. Plays the etymology straight. Risk: a touch generic.                                                   |
| 2   | **The oldest story. Today's edition.**           | Declarative | Doubles down on the newspaper framing. Strong. Risk: "today's edition" promises rotation.                              |
| 3   | **Daily bread for the cluttered, hungry soul.**  | Descriptive | The existing approved line. Keep as homepage H2 / About-page subhead — too good to lose, not the masthead declaration. |
| 4   | **Anchored in scripture. Read in five minutes.** | Concrete    | Conversion-lens preferred — concrete, time-bounded. Risk: reads more like a feature list.                              |
| 5   | **A daily newspaper of the Gospel.**             | Declarative | Most literal. Strongest if you fully commit to the newspaper framing. Risk: high commitment.                           |

## Recommendation

**#5 ("A daily newspaper of the Gospel.")** as the new masthead tagline. Keep #3 ("Daily bread for the cluttered, hungry soul.") as the homepage H2 visible inside the page body and as the About-page lead.

This is the recommendation, not the decision. Confirm or override.

## Where the tagline currently lives in code

- Masthead top bar: `src/components/EuangelionShellHeader.tsx` (the small text above the wordmark — see the `topbar` section)
- Page metadata description: `src/app/layout.tsx:13-15` (`description: 'Daily bread for the cluttered, hungry soul. Ancient wisdom, modern design.'`)
- OG/Twitter description: same `src/app/layout.tsx`
- PWA manifest: `public/manifest.json` (`description: 'Daily bread for the cluttered, hungry soul.'`)

When you pick a candidate, all four locations should change together. The next overnight pass (or the morning supervised pass) can execute that in a single commit once the choice is locked.
