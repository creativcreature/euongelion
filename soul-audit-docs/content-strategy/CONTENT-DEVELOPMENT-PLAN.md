# Content Development & Launch Plan

**Version:** 1.0
**Last Updated:** January 16, 2026
**Status:** ACTIVE

---

## Overview

This document defines:

1. Content pipeline and folder structure
2. Review workflow (draft → review → final)
3. Launch phases and priorities
4. Complete content inventory

---

## Folder Structure

```
/content/
├── /drafts/                    # AI-generated, awaiting review
│   ├── /apologetics/
│   ├── /doctrine/
│   ├── /disciplines/
│   ├── /through-the-bible/
│   ├── /audience-branches/
│   ├── /onboarding/
│   └── /story-of-god/
│
├── /in-review/                 # Founder reviewing
│   └── (same subfolders)
│
├── /approved/                  # Founder approved, ready for final polish
│   └── (same subfolders)
│
├── /final/                     # Ready for production use
│   ├── /series-json/           # Existing converted content
│   └── /new-series/            # New generated content
│
├── /reference/                 # Existing reference materials
│   ├── /bibles/
│   ├── /commentaries/
│   └── /lexicons/
│
├── DEVOTIONAL-STRATEGY.md
├── THEOLOGICAL-RESOURCES.md
├── APOLOGETICS-FRAMEWORK.md
├── CONTENT-PITCHES.md
└── CONTENT-DEVELOPMENT-PLAN.md  # This document
```

---

## Review Workflow

### Stage 1: DRAFT

**Location:** `/content/drafts/[category]/`
**Status:** AI-generated, needs founder review

- AI generates devotional following template
- Includes all citations
- Named: `[series-slug]-day-[##].md`
- Example: `why-believe-day-01.md`

### Stage 2: IN-REVIEW

**Location:** `/content/in-review/[category]/`
**Status:** Founder actively reviewing

**Founder Review Checklist:**

- [ ] Theological accuracy
- [ ] Tone matches EUONGELION voice
- [ ] Citations verified
- [ ] Hebrew/Greek accurate
- [ ] Story resonates
- [ ] Christ connection clear
- [ ] Reflection questions meaningful
- [ ] No over-the-top claims
- [ ] Honest about hard things

**Founder can:**

- Approve → moves to `/approved/`
- Request revision → notes added, stays in `/in-review/`
- Reject → deleted or archived

### Stage 3: APPROVED

**Location:** `/content/approved/[category]/`
**Status:** Approved, awaiting final formatting

- Content verified
- May need minor polish
- Ready for JSON conversion

### Stage 4: FINAL

**Location:** `/content/final/[category]/`
**Status:** Production-ready

- Converted to JSON format
- All metadata complete
- Ready to load into database

---

## Content Structure Rule

**ALL CONTENT MUST BE IN 5-DAY SEGMENTS.**

No one-off devotionals. Every series is a multiple of 5 days:

- 5 days (minimum)
- 10 days
- 15 days
- 20 days
- etc.

This creates:

- Consistent user expectations
- Natural weekly rhythms (5 days on, 2 days Sabbath optional)
- Cohesive narrative arcs

---

## Content Categories & Priorities

### PRIORITY 1: Onboarding & Orientation (Launch Critical)

_Users need these before engaging with anything else_

| Series                            | Days | Purpose                                   | Status |
| --------------------------------- | ---- | ----------------------------------------- | ------ |
| **Welcome to EUONGELION**         | 5    | Platform intro, how to use, first steps   | NEW    |
| **How to Approach This Material** | 5    | Setting expectations, posture for reading | NEW    |
| **How to Read the Bible**         | 15   | Literary genres, interpretation, PaRDeS   | NEW    |
| **Common Misconceptions**         | 10   | Breaking false assumptions about faith    | NEW    |
| **Questions Everyone Asks**       | 15   | FAQ-style foundational answers            | NEW    |

**Total: 50 days of onboarding content**

---

### PRIORITY 2: Doctrinal Foundation (Launch Critical)

_Core beliefs that ground everything else_

| Series              | Days | Purpose                           | Status |
| ------------------- | ---- | --------------------------------- | ------ |
| **What We Believe** | 30   | Systematic doctrine               | NEW    |
| **Hard Doctrines**  | 10   | Controversial topics handled well | NEW    |

**Total: 40 days**

---

### PRIORITY 3: Spiritual Disciplines (Launch Critical)

_How to practice faith, not just know it_

| Series                     | Days | Purpose                            | Status |
| -------------------------- | ---- | ---------------------------------- | ------ |
| **The Way of Jesus**       | 30   | Comprehensive disciplines overview | NEW    |
| **Learn to Pray**          | 10   | Practical prayer instruction       | NEW    |
| **Fasting: Body and Soul** | 5    | Fasting basics and practice        | NEW    |
| **The Sabbath Gift**       | 5    | Rest as spiritual practice         | NEW    |
| **The Listening Life**     | 15   | Hearing God, silence, discernment  | NEW    |
| **Digital Sabbath**        | 5    | Faith in the attention economy     | NEW    |

**Total: 70 days**

---

### PRIORITY 4: Apologetics (Launch Essential)

_Reaches audiences others can't_

| Series                           | Days | Purpose                                                 | Status |
| -------------------------------- | ---- | ------------------------------------------------------- | ------ |
| **Why Believe?**                 | 20   | vs. Atheism, existence of God, problem of evil          | NEW    |
| **Jesus: Islam & Christianity**  | 15   | vs. Islam, comparing claims about Christ                | NEW    |
| **Jewish Roots of Christianity** | 20   | vs. Judaism, why Jews don't believe, rabbinic tradition | NEW    |
| **One Way, Many Questions**      | 15   | vs. Spirituality, "all paths," universalism             | NEW    |
| **Can We Trust the Bible?**      | 15   | Historicity, manuscripts, reliability                   | NEW    |
| **Faith and Science**            | 15   | Evolution, miracles, compatibility                      | NEW    |

**Total: 100 days**

---

### PRIORITY 5: Existing Content (Already Complete)

_Converted Substack content_

| Series                   | Days | Pathway | Status  |
| ------------------------ | ---- | ------- | ------- |
| Too Busy for God         | 6    | Sleep   | ✅ DONE |
| Hearing God in the Noise | 6    | Sleep   | ✅ DONE |
| Abiding in His Presence  | 6    | Sleep   | ✅ DONE |
| Surrender to God's Will  | 6    | Sleep   | ✅ DONE |
| Genesis: Two Stories     | 5    | Awake   | ✅ DONE |
| (14 more series)         | ~80  | Various | ✅ DONE |

**Total: ~110 days already complete**

---

### PRIORITY 6: Through-the-Bible (Post-Launch Phase 1)

_The core 365-day journey_

| Section             | Days | Status |
| ------------------- | ---- | ------ |
| Genesis-Deuteronomy | ~60  | NEW    |
| Joshua-Esther       | ~40  | NEW    |
| Job-Song of Solomon | ~30  | NEW    |
| Prophets            | ~50  | NEW    |
| Gospels             | ~100 | NEW    |
| Acts-Revelation     | ~85  | NEW    |

**Total: 365 days**

---

### PRIORITY 7: Audience Branches (Post-Launch Phase 2)

_Soul Audit matched series_

| Series                     | Days | Audience                          | Status |
| -------------------------- | ---- | --------------------------------- | ------ |
| Walking Through Wilderness | 40   | Hard seasons, suffering           | NEW    |
| The Grieving Heart         | 30   | Loss, death, lament               | NEW    |
| Joy While Others Suffer    | 20   | Blessing amid others' pain        | NEW    |
| Ministry of Presence       | 30   | Holy Spirit, spiritual gifts      | NEW    |
| Leading Like Jesus         | 30   | Ministry leaders, servants        | NEW    |
| Deconstructing Believer    | 20   | Doubt, questioning, rebuilding    | NEW    |
| Anger at God               | 20   | Wrestling with God, Jonah, lament | NEW    |
| New Believer Foundations   | 15   | Just starting, first steps        | NEW    |

**Total: 205 days**

---

### PRIORITY 8: Story of God (Post-Launch Phase 2)

_Meta-narrative teaching — the Bible as ONE story_

| Series                   | Days | Focus                           | Status |
| ------------------------ | ---- | ------------------------------- | ------ |
| Creation and Fall        | 10   | Genesis 1-11, the setup         | NEW    |
| The Promise              | 15   | Abraham through Joseph          | NEW    |
| Exodus and Wilderness    | 15   | Deliverance and wandering       | NEW    |
| Kingdom Rise and Fall    | 15   | David, Solomon, division, exile | NEW    |
| Prophets and Exile       | 15   | Major/minor prophets, Babylon   | NEW    |
| The Incarnation          | 15   | Birth through baptism           | NEW    |
| Ministry and Passion     | 20   | Teaching, miracles, cross       | NEW    |
| Resurrection and Church  | 15   | Easter through Acts             | NEW    |
| Letters and Consummation | 10   | Epistles through Revelation     | NEW    |

**Total: 130 days** (replaces 52 weekly — this is more immersive)

---

## Launch Phases

### PHASE 0: Foundation (Before Any Launch)

**Goal:** Onboarding + Doctrinal + Disciplines ready

| Content     | Days    | Est. Generation | Review Time  |
| ----------- | ------- | --------------- | ------------ |
| Onboarding  | 50      | 1-2 days        | 1 week       |
| Doctrine    | 40      | 1 day           | 1 week       |
| Disciplines | 70      | 1-2 days        | 1 week       |
| **TOTAL**   | **160** | **~4 days**     | **~3 weeks** |

**Milestone:** User can arrive, learn how to engage, understand core beliefs, and begin practicing.

---

### PHASE 1: Soft Launch

**Goal:** Add apologetics + leverage existing content

| Content                 | Days    | Est. Generation | Review Time  |
| ----------------------- | ------- | --------------- | ------------ |
| Apologetics             | 100     | 2-3 days        | 2 weeks      |
| Existing (already done) | 110     | 0               | 0            |
| **TOTAL**               | **210** | **~3 days**     | **~2 weeks** |

**Running Total: 370 days of content**

**Milestone:** Soul Audit can match skeptics to apologetics, believers to existing series.

---

### PHASE 2: Full Launch

**Goal:** Through-the-Bible complete

| Content           | Days | Est. Generation | Review Time |
| ----------------- | ---- | --------------- | ----------- |
| Through-the-Bible | 365  | 5-7 days        | 4-6 weeks   |

**Running Total: 735 days of content**

**Milestone:** Users can do a full year Bible journey.

---

### PHASE 3: Expansion

**Goal:** Audience branches + Story of God

| Content           | Days | Est. Generation | Review Time |
| ----------------- | ---- | --------------- | ----------- |
| Audience Branches | 205  | 3-4 days        | 3 weeks     |
| Story of God      | 130  | 2-3 days        | 2 weeks     |

**Running Total: ~1,070 days of content**

**Milestone:** Full platform with specialized paths.

---

## Content Totals Summary

| Phase                 | New Content    | Cumulative | Est. Cost |
| --------------------- | -------------- | ---------- | --------- |
| Phase 0 (Foundation)  | 160 days       | 160        | ~$15      |
| Phase 1 (Soft Launch) | 210 days       | 370        | ~$20      |
| Phase 2 (Full Launch) | 365 days       | 735        | ~$35      |
| Phase 3 (Expansion)   | 335 days       | 1,070      | ~$30      |
| **TOTAL**             | **1,070 days** |            | **~$100** |

_Note: Costs assume ~$0.09 per devotional at current Claude API rates. Actual costs may vary based on revisions needed._

---

## Cost Breakdown Explained

### What the Cost Is

**Claude API usage fees** for generating devotional content.

### How It's Calculated

| Component                          | Per Devotional |
| ---------------------------------- | -------------- |
| Input tokens (prompt/instructions) | ~$0.006        |
| Output tokens (~4,000 words)       | ~$0.08         |
| **Total per devotional**           | **~$0.09**     |

### At Scale

| Devotionals | Base Cost | With Revisions (~1.5x) |
| ----------- | --------- | ---------------------- |
| 1,070       | ~$96      | ~$145                  |

### How It's Paid

**Option A: Your Claude Code API key**

- If Claude Code is configured with an API key, charges go to that Anthropic account
- Check: `claude config` or your `.claude` settings

**Option B: Anthropic Console (Pay-as-you-go)**

- Create account: console.anthropic.com
- Add credit card
- $5 minimum to start
- Pay only for what you use

**Option C: Anthropic Credits**

- Pre-purchase credits for discount
- Good for large batch generation

### Cost Control Tips

1. **Generate in batches** — Review quality before scaling
2. **Refine prompts first** — Better prompts = fewer revisions
3. **Use haiku for drafts** — Cheaper model for initial versions, sonnet for final

---

## Generation Workflow

### Step 1: Prepare Prompt

Each content category has a master prompt that includes:

- Template structure (PaRDeS + Chiasm)
- Tone guidelines
- Citation requirements
- Category-specific instructions

### Step 2: Generate Batch

- Generate 5-10 devotionals at a time
- Save to `/drafts/[category]/`
- Include metadata (series, day, theme)

### Step 3: Founder Review

- Move to `/in-review/`
- Founder reviews using checklist
- Provide feedback or approve

### Step 4: Revise if Needed

- AI incorporates feedback
- Re-submit for review

### Step 5: Approve

- Move to `/approved/`
- Ready for final formatting

### Step 6: Finalize

- Convert to JSON format
- Add to `/final/`
- Ready for database load

---

## Review Cadence Recommendation

**Daily:** Review 5-10 devotionals (30-60 min)
**Weekly:** 35-70 devotionals reviewed
**Monthly:** 150-300 devotionals reviewed

At this pace:

- Phase 0 (157 days) = ~3 weeks of review
- Phase 1 (98 days) = ~2 weeks of review
- Total launch-ready content in ~5 weeks

---

## Quality Gates

### Gate 1: Theological Accuracy

- Does it align with orthodox Christian teaching?
- Are controversial topics handled with nuance?
- Are citations from reputable sources?

### Gate 2: EUONGELION Voice

- Is it honest without being harsh?
- Is it intelligent without being academic?
- Is it warm without being saccharine?
- Does it respect the reader's intelligence?

### Gate 3: Structural Integrity

- Does it follow PaRDeS structure?
- Does the chiasm work (A-B-C-B'-A')?
- Is there a clear Christ connection?
- Are interactive elements included?

### Gate 4: Citation Compliance

- Are all claims cited?
- Are citations formatted correctly (endnotes)?
- Are sources reputable?

---

## Onboarding Content Detail

### Series: "Welcome to EUONGELION" (5 days)

**Day 1: What Is This Place?**

- What EUONGELION means (good news)
- The vision: People seeking God daily
- Not an app, not a program—a path home

**Day 2: How This Is Different**

- Not shallow, not preachy
- Hebrew roots, deep theology, accessible language
- The PaRDeS method (preview)

**Day 3: How This Works**

- The daily rhythm
- Soul Audit: What it is and isn't
- Series and pathways

**Day 4: No Pressure, No Guilt**

- This isn't about streaks
- Come as you are
- Grace for the journey

**Day 5: Your First Steps**

- Starting where you are
- The three depths (quick, medium, deep)
- Interactive elements explained
- Invitation to begin

---

### Series: "How to Approach This Material" (5 days)

**Day 1: Come As You Are**

- No prerequisites
- Permission to doubt
- This is a conversation, not a lecture

**Day 2: Read Slowly, Think Deeply**

- Against skimming culture
- The value of meditation
- Quality over quantity

**Day 3: Expect to Be Challenged**

- We don't water down
- Honest about hard things
- Growth requires discomfort

**Day 4: Make It Personal**

- Reflection is the goal
- Journaling, prayer, silence
- The interactive elements

**Day 5: Return Tomorrow**

- Consistency over intensity
- Day-by-day rhythm
- The compound effect of daily bread

---

### Series: "Common Misconceptions" (10 days)

**Day 1: "The Bible is a rulebook"**

- Actually: It's a story of God pursuing humanity

**Day 2: "Christianity is about being good"**

- Actually: It's about being rescued by the Good One

**Day 3: "God is angry and distant"**

- Actually: He's pursuing you relentlessly

**Day 4: "Faith means not asking questions"**

- Actually: God invites honest wrestling

**Day 5: "The Old Testament is irrelevant"**

- Actually: It's the foundation of everything

**Day 6: "Christians have it all figured out"**

- Actually: We're all works in progress

**Day 7: "You have to clean up before coming to God"**

- Actually: Come as you are; He does the cleaning

**Day 8: "The Bible contradicts itself"**

- Actually: It's one unified story with many voices

**Day 9: "Christianity is anti-intellectual"**

- Actually: It gave birth to universities and science

**Day 10: "Religion is the opiate of the masses"**

- Actually: It's been the fuel of freedom movements

---

### Series: "Questions Everyone Asks" (15 days)

**Day 1:** Why does God allow suffering?
**Day 2:** How do I know God is real?
**Day 3:** Why is Jesus the only way?
**Day 4:** What happens when we die?
**Day 5:** How do I hear God's voice?
**Day 6:** Why pray if God knows everything?
**Day 7:** What about people who never heard?
**Day 8:** Is the Bible really reliable?
**Day 9:** Why does the church have so many problems?
**Day 10:** What is the Holy Spirit?
**Day 11:** How do I know I'm saved?
**Day 12:** What is my purpose?
**Day 13:** Why is life so hard?
**Day 14:** Can I lose my salvation?
**Day 15:** Where do I go from here?

---

## File Naming Convention

```
[series-slug]-day-[##].md

Examples:
welcome-to-euongelion-day-01.md
how-to-read-the-bible-day-07.md
why-believe-day-15.md
genesis-two-stories-day-03.md
```

For review status, use folder location (not filename).

---

## Next Steps

1. **Create folder structure** in `/content/`
2. **Generate first batch:** Welcome to EUONGELION (3 days)
3. **Founder reviews** and provides feedback
4. **Iterate** on voice/tone until dialed in
5. **Scale** to remaining onboarding content
6. **Continue** through priority phases

---

_"The content is not the end. The content is the path. The end is people seeking God daily."_
