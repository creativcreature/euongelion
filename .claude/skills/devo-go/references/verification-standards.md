# Verification Standards — what VERIFIED means per source type

Everything reader-facing traces to a verified source recorded in the source pack. Launch these as parallel background general-purpose agents; require structured findings with explicit VERIFIED / DISPUTED verdicts and source URLs. The source pack carries the verdicts AND the caveats — honesty notes ship to the reader when a claim is softer than the popular version.

## 1. Scripture (do this yourself — never delegate, never trust memory)

- ONLY source: `public/bibles/<TRANSLATION>/<BOOK>.json` (BSB/WEB/KJV/ASV/YLT/DARBY/BBE all present, keyed `[chapter][verse]`).
- Copy text EXACTLY, including divine-name casing: this repo's KJV prints "the Lord"; BSB prints "the LORD". Partial quotes with ellipses are fine; silent wording changes are not.
- YLT contains `<FI>…<Fi>` italics markers — strip or avoid block-quoting YLT.
- Blocked translations (NIV/ESV/NASB/NRSV/CSB/NLT/MSG/TLB/AMP/NCV) fail the validator.
- Translation choice per passage is intentional and documented in the brief's rationale table (KJV for liturgical/poetic register, ASV/YLT beside vocab modules, BSB default).

## 2. Hebrew / Greek (agent brief)

- Verify every lexical claim against BibleHub interlinear + Strong's pages: exact pointed spelling, transliteration, Strong's number, morphology (stem/form), gloss.
- Demand precision that can DOWNGRADE claims — reference-build examples that became reader-facing honesty notes: "keep me from harm" has no Hebrew "keep" (verb is asah, H6213); the Jabez name-pun is consonant metathesis, never "the name means pain"; noun vs verb of the same root have different Strong's numbers (H6090 vs H6087).
- Every Hebrew/Greek string in a day file needs transliteration within ~80 chars (validator-audited). Scripture-module `hebrewOriginal` needs a `transliteration` field.

## 3. Stories (agent brief)

- One real story per teaching day. Sources allowed: autobiography, published memoir, documented interviews/talks, dated journals. The agent must FETCH the primary text (Gutenberg, archive.org) and grep it — not trust retellings.
- Require: name + dates, 150-250 word retelling using only verified details, primary citation (work/year/chapter-page), URLs, VERIFIED or DISPUTED verdict per element.
- Folklore is hunted, named, and REJECTED in the source pack — precedents: Müller's breakfast-table tableau (secondhand, Abigail Townsend Luffe, absent from his Narrative — replaced with the verbatim Sept 18, 1838 journal entry) and Paton's shining-garments angel guard (absent from the 1889 autobiography; traceable only to Billy Graham's 1975 _Angels_ — replaced with the verbatim "Jehovah's rain" night). When a beloved story dies under verification, the primary sources usually hold a better one.
- Self-reported testimony (e.g., David Ring) is allowed with the caveat stated in the day's Sources module. Apocryphal quotes are never placed in a person's mouth in quotation marks (LeTourneau's "bigger shovel" is a customer's reported remark).

## 4. External quotes (agent brief)

- Verbatim means verbatim: character-checked against the original text (spurgeongems, CCEL, Gutenberg, archive.org). Record edition variances (spurgeongems modernizes "thou"→"You").
- Full citation: author, work, year, location (sermon number / letter number / book+chapter — prefer locators stable across editions).
- Each quote ships with one sentence of context for why this voice is here (AUTHORING-SPEC §4).
- Flag apocrypha loudly: "Prayer doesn't change God, it changes me" is the _Shadowlands_ screenplay, not Lewis. When engaging a controversy, verify BOTH directions — the critiques AND the target's own defenses/caveats (the Wilkinson dossier is the template: engage charitably, confront directly).
- Quote-frequency targets bend to founder rulings (confront-head-on days run hot); note the deviation in the brief.

## 5. Videos (agent brief)

- Official channels only. Vetted default: BibleProject; Gospel in Life (Keller) for sermon-length go-deepers. Founder may extend the list.
- Verify each candidate by fetching `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json` — confirms the ID is live and returns the exact current title + channel. BibleProject retitled its catalog (2022-24); never trust remembered titles.
- Then check embeddability: fetch `https://www.youtube.com/embed/<ID>` and grep for `UNPLAYABLE` / "Playback on other websites has been disabled". Founder rule: never embed a video that blocks off-YouTube playback.
- Reject third-party mirrors even with identical content (precedents: 6HjlGvl8ljM, iVwauTiyFjM).
- Each video brief states what the video must TEACH in its slot, not just its topic. 1-2 inline per teaching day; the recap collects the full study set as resource links.

## 6. Historical / cultural context (agent brief)

- Dating and audience claims per scholarly consensus with sources cited (encyclopedias, seminary resources, standard introductions); phrase ranges honestly ("most likely the 400s-300s BC"), distinguish tradition from history (rabbinic identifications are cited as tradition, never fact).
- Uncertainty language per AI-CONTENT-CONSTRAINTS §4.5: verified fact stated directly; debate flagged; speculation labeled.

## Red letter — the words of Christ (SA-051, mandatory)

Every scripture module whose reference falls in Matthew, Mark, Luke, John, Acts
or Revelation MUST carry attribution for Christ's direct speech. You do not
author this by hand and you do not eyeball it:

```ts
import { withRedLetter } from '@/lib/red-letter-resolve'
const module = withRedLetter({ type: 'scripture', reference, passage })
```

`resolveRedLetter` looks the reference up in `src/data/red-letter-bsb.json`
(built from the KJV OSIS `<q who="Jesus">` milestones, mapped onto BSB wording)
and returns only spans that appear VERBATIM in this passage. A passage in a
translation we cannot map returns nothing and stays black. That is correct
behaviour, not a gap to paper over.

**Never infer attribution from quotation marks.** Luke 10:33-37 in BSB has three
quoted spans and the middle one is the expert in the law, not Jesus. A
quotation-mark pass puts Christ's colour on another man's words. KJV does not
punctuate speech at all.

**A parable is red in full.** Where Jesus tells a story, the narration inside it
is His speech — Luke 10:30-35 is red throughout. The dataset already reflects
this; do not "correct" it.

**If the pipeline declines a verse, leave it black.** 27 verses are deliberately
unmarked because the alignment is ambiguous. A missing red word is a
typographic omission; a wrongly red word is a false attribution. If you are
certain of the attribution for one of those, set `redLetter` by hand on that
module — a hand-marked value always wins over the resolver.

Colour is fixed and measured, not chosen: `#7a1c12`, the deepest red clearing
WCAG AA against every highlight ground. Do not restyle `.wj`.
