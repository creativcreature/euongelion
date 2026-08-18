# Polish backlog — founder decisions (2026-08-17)

Source: the Mobbin scan + measured-audit backlog published as an artifact and
reviewed item by item. **52 approved, 1 declined, 14 left undecided.**

Undecided items are NOT to be built. They are recorded here so nobody reads
silence as approval.

## Declined

| #   | Item                                             | Note                                                                                                                       |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 01  | Move header/footer outside `<main>` on ~30 pages | Declined. The skip link and the `banner`/`contentinfo` landmarks stay as they are. Do not re-propose without a new ruling. |

## Founder amendments to the brief

| #   | Amendment                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 60  | **The artist is "Christopher James Parker + AI".** Not "Generated", and not decorative. The original proposal (treat generated artwork as `alt=""`) is superseded: the work is credited, and the alt text must describe the image rather than echo a filename. |

## Standing constraints for this work

1. **Do not change content.** No devotional copy, no scripture, no series text.
2. **The audio must line up with the content as it stands.** Any read-along or
   narration work adapts to the existing text — the text is never edited to fit
   the audio.
3. Do not break the site. Verify in the Workers runtime before every deploy.

## Approved (52)

### Now — correctness

02, 03, 04, 05, 06, 07

### Reading experience

15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26

### Return loop

30, 31, 32, 33, 34, 35, 36, 39

### Soul Audit, search, library

41, 42, 43, 44, 45, 46, 47, 48, 49, 50

### Craft — type and layout

51, 52, 53, 54, 55, 56, 57, 58, 59, 60

### Money and platform

63, 64, 65, 66, 67

## Undecided — do not build (14)

08, 09, 10, 11, 12, 13, 14 (remaining measured defects in the "Now" tier),
27, 28, 29 (reader position, scroll-rule contrast, reading measure),
37, 38 (auth-wall marking, "READ TODAY'S EDITION" label),
40 (match percentages on Soul Audit results),
61, 62 (duplicate masthead heading, wordmark heading level)

## Delivery log

Each shipped item is recorded here with its commit as it lands.

| #   | Item                          | Decision id    | Commit  | Status  |
| --- | ----------------------------- | -------------- | ------- | ------- |
| 02  | Reader heading ladder         | SA-080 (F-125) | batch 1 | shipped |
| 03  | Series titles are headings    | SA-080 (F-125) | batch 1 | shipped |
| 07  | 988 + delete-account contrast | SA-080 (F-125) | batch 1 | shipped |
| 50  | Relabel BROWSE ALL SERIES     | SA-080 (F-125) | batch 1 | shipped |
| 57  | Delete dead mobile-nav CSS    | SA-080 (F-125) | batch 1 | shipped |
| 58  | Apply the is-open class       | SA-080 (F-125) | batch 1 | shipped |
| 60  | Artwork credit + alt text     | SA-080 (F-125) | batch 1 | shipped |
| 64  | Pricing track visible         | SA-080 (F-125) | batch 1 | shipped |
| 65  | 44px homepage CTA             | SA-080 (F-125) | batch 1 | shipped |
