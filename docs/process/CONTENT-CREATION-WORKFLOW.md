# Content Creation Workflow

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** ACTIVE

---

## Overview

This document defines the complete workflow for creating EUONGELION devotional content from initial concept through publication. Every devotional follows this 6-stage pipeline to ensure theological accuracy, brand consistency, and production quality.

---

## Workflow Summary

```
IDEA --> PLANNING --> DRAFTING --> REVIEW --> APPROVAL --> FINALIZATION --> PUBLISHING
```

| Stage        | Location              | Owner            | Duration             |
| ------------ | --------------------- | ---------------- | -------------------- |
| Planning     | Notion / Google Docs  | Founder + Writer | 1-2 days             |
| Drafting     | `/content/drafts/`    | Writer (AI)      | 1-2 hours/devotional |
| Review       | `/content/in-review/` | Founder          | 15-30 min/devotional |
| Approval     | `/content/approved/`  | Founder          | 5 min/devotional     |
| Finalization | `/content/final/`     | Writer           | 30 min/devotional    |
| Publishing   | Database              | Architect        | Batch upload         |

---

## Stage 1: PLANNING

### Purpose

Define the series concept, structure, and daily outline before any content generation begins.

### Inputs

- Content gap analysis
- Audience needs (from Soul Audit data or feedback)
- CONTENT-DEVELOPMENT-PLAN.md priorities

### Activities

#### 1.1 Series Concept Development

- [ ] Define series theme and purpose
- [ ] Identify target audience segment
- [ ] Determine series length (must be 5-day multiple)
- [ ] Write 2-3 sentence series description
- [ ] Define the transformation goal (what should reader become/understand?)

#### 1.2 Day-by-Day Outline

- [ ] Map out each day's core theme
- [ ] Ensure narrative arc across series (beginning, middle, climax, resolution)
- [ ] Identify chiastic structure opportunities (A-B-C-B'-A')
- [ ] Note any cross-references to other series

#### 1.3 Scripture Selection

- [ ] Select primary scripture passage for each day
- [ ] Identify supporting verses
- [ ] Note Hebrew/Greek terms to explore
- [ ] Ensure PaRDeS layers are achievable:
  - **Peshat** (literal) - What does it say?
  - **Remez** (hint) - What does it point to?
  - **Drash** (seek) - What wisdom can we draw?
  - **Sod** (secret) - What is the mystical/Christ connection?

#### 1.4 Resource Identification

- [ ] List commentaries to reference (Matthew Henry, Calvin, Spurgeon, etc.)
- [ ] Identify relevant lexicon entries (BDB, Thayer, Strong's)
- [ ] Note potential modern stories/illustrations
- [ ] Flag any sensitive topics requiring extra care

### Outputs

- Series outline document
- Day-by-day breakdown with scriptures
- Resource list

### Planning Checklist

```
SERIES PLANNING CHECKLIST
========================

Series Name: ______________________
Category: [ ] Onboarding [ ] Doctrine [ ] Disciplines [ ] Apologetics
          [ ] Through-Bible [ ] Audience Branch [ ] Story of God
Length: _____ days (must be 5-day multiple)
Target Audience: ______________________

CONCEPT
[ ] Theme clearly defined
[ ] Purpose statement written
[ ] Transformation goal identified
[ ] Fits within content priorities

STRUCTURE
[ ] Day-by-day outline complete
[ ] Narrative arc mapped (beginning --> climax --> resolution)
[ ] Chiastic opportunities noted
[ ] Cross-series references identified

SCRIPTURE
[ ] Primary passage selected for each day
[ ] Supporting verses identified
[ ] Hebrew/Greek terms listed
[ ] PaRDeS layers achievable

RESOURCES
[ ] Commentaries identified
[ ] Lexicon entries noted
[ ] Modern stories/illustrations brainstormed
[ ] Sensitive topics flagged

Ready for drafting: [ ] YES [ ] NO
```

---

## Stage 2: DRAFTING

### Purpose

Generate initial devotional content following the EUONGELION template and style guide.

### Inputs

- Completed series planning document
- DEVOTIONAL-STRATEGY.md (template structure)
- PUBLIC-FACING-LANGUAGE.md (voice/tone)
- THEOLOGICAL-RESOURCES.md (citation sources)

### Location

`/content/drafts/[category]/`

### File Naming

`[series-slug]-day-[##].md`
Example: `welcome-to-euongelion-day-01.md`

### Activities

#### 2.1 Content Generation

- [ ] Follow PaRDeS structure:
  1. Opening hook (story, question, or observation)
  2. Peshat: Literal reading of the text
  3. Remez: Symbolic hints and connections
  4. Drash: Practical wisdom and application
  5. Sod: Christological/mystical connection
- [ ] Apply chiastic structure where appropriate
- [ ] Target ~3,500-4,500 words

#### 2.2 Use Content Banks

- [ ] Pull from Hebrew word study banks
- [ ] Reference Greek term databases
- [ ] Draw from story/illustration library
- [ ] Use historical context resources

#### 2.3 Follow Style Guide

- [ ] Match EUONGELION voice (intelligent but accessible)
- [ ] Avoid churchy cliches
- [ ] Be honest about hard things
- [ ] Respect reader's intelligence
- [ ] Include interactive elements:
  - Breath prayer
  - Reflection questions (3)
  - Journaling prompt (optional)
  - Physical practice (optional)

#### 2.4 Add Citations

- [ ] Cite all factual claims
- [ ] Use endnote format (not footnotes)
- [ ] Include full citation at end
- [ ] Sources: commentaries, lexicons, academic works

### Outputs

- Draft markdown file in `/content/drafts/[category]/`
- All citations included
- Interactive elements present

### Drafting Checklist

```
DRAFTING CHECKLIST
==================

File: ______________________
Series: ______________________
Day: _____ of _____

STRUCTURE
[ ] Opening hook engages immediately
[ ] Peshat layer present (literal meaning)
[ ] Remez layer present (symbolic hints)
[ ] Drash layer present (practical wisdom)
[ ] Sod layer present (Christ connection)
[ ] Chiastic structure applied (where appropriate)
[ ] Word count: ~3,500-4,500

CONTENT BANKS USED
[ ] Hebrew word studies referenced
[ ] Greek terms explored
[ ] Story/illustration included
[ ] Historical context provided

STYLE GUIDE
[ ] Voice matches brand (intelligent, accessible, warm)
[ ] No churchy cliches
[ ] Honest about difficulties
[ ] Respects reader's intelligence

INTERACTIVE ELEMENTS
[ ] Breath prayer included
[ ] 3 reflection questions included
[ ] Journaling prompt (if applicable)
[ ] Physical practice (if applicable)

CITATIONS
[ ] All claims cited
[ ] Endnote format used
[ ] Full citations at end
[ ] Sources are reputable

File saved to: /content/drafts/______/
Ready for review: [ ] YES [ ] NO
```

---

## Stage 3: REVIEW

### Purpose

Founder reviews draft for theological accuracy, voice consistency, and overall quality.

### Inputs

- Draft file from `/content/drafts/`
- FOUNDER-REVIEW-CHECKLIST.md

### Location

`/content/in-review/[category]/`

### Activities

#### 3.1 Theological Accuracy Check

- [ ] Orthodox Christian teaching maintained
- [ ] No heretical content
- [ ] Controversial topics handled with nuance
- [ ] Claims are defensible

#### 3.2 Voice/Tone Check

- [ ] Matches EUONGELION brand voice
- [ ] Intelligent but not academic
- [ ] Warm but not saccharine
- [ ] Honest but not harsh

#### 3.3 Citation Verification

- [ ] All citations accurate
- [ ] Quotes are verbatim
- [ ] Sources are reputable
- [ ] Hebrew/Greek is correct

#### 3.4 Shareability Check

- [ ] Contains pull-quote-worthy passages
- [ ] Scripture cards extractable
- [ ] Word studies are shareable
- [ ] Has "aha moment" content

### Review Outcomes

| Outcome            | Action                                   |
| ------------------ | ---------------------------------------- |
| **Approved**       | Move to `/content/approved/`             |
| **Needs Revision** | Add notes, keep in `/content/in-review/` |
| **Rejected**       | Archive or delete with reason            |

### Review Checklist

```
REVIEW CHECKLIST
================

File: ______________________
Reviewer: ______________________
Date: ______________________

THEOLOGICAL ACCURACY
[ ] Orthodox Christian teaching
[ ] No heretical content
[ ] Controversial topics handled well
[ ] Claims are defensible
Notes: ______________________

VOICE/TONE
[ ] Matches brand voice
[ ] Intelligent but accessible
[ ] Warm but not saccharine
[ ] Honest but not harsh
Notes: ______________________

CITATION VERIFICATION
[ ] Citations accurate
[ ] Quotes verbatim
[ ] Sources reputable
[ ] Hebrew/Greek correct
Notes: ______________________

CONTENT QUALITY
[ ] Story resonates
[ ] Christ connection clear
[ ] Reflection questions meaningful
[ ] Interactive elements work
Notes: ______________________

SHAREABILITY
[ ] Pull quotes present
[ ] Scripture cards extractable
[ ] Word studies shareable
[ ] "Aha moment" content exists
Notes: ______________________

DECISION
[ ] APPROVED - Move to /approved/
[ ] NEEDS REVISION - Notes added above
[ ] REJECTED - Reason: ______________________

Reviewer Signature: ______________________
```

---

## Stage 4: APPROVAL

### Purpose

Founder gives final approval for content to proceed to production formatting.

### Inputs

- Reviewed file from `/content/in-review/`
- Any revision requests addressed

### Location

`/content/approved/[category]/`

### Activities

#### 4.1 Final Founder Sign-off

- [ ] All revision requests addressed
- [ ] Content meets quality bar
- [ ] Ready for production use

#### 4.2 Move to Approved

- [ ] Transfer file to `/content/approved/[category]/`
- [ ] Update content tracking spreadsheet
- [ ] Note any special formatting requirements

### Approval Checklist

```
APPROVAL CHECKLIST
==================

File: ______________________
Original Draft Date: ______________________
Review Rounds: _____
Approval Date: ______________________

VERIFICATION
[ ] All review notes addressed
[ ] Theological concerns resolved
[ ] Voice/tone adjusted as needed
[ ] Citations verified and corrected

FINAL SIGN-OFF
[ ] Content meets EUONGELION quality bar
[ ] Approved for production formatting
[ ] No outstanding concerns

Moved to: /content/approved/______/

Founder Signature: ______________________
Date: ______________________
```

---

## Stage 5: FINALIZATION

### Purpose

Convert approved markdown to production-ready JSON format with all metadata.

### Inputs

- Approved file from `/content/approved/`
- JSON schema from CONTENT-STRUCTURE-OPTIMIZATION.md

### Location

`/content/final/[category]/`

### Activities

#### 5.1 Format to JSON

- [ ] Convert markdown to JSON structure
- [ ] Parse sections into modules
- [ ] Extract interactive elements
- [ ] Format citations properly

#### 5.2 Add Metadata

- [ ] Series ID
- [ ] Day number
- [ ] Title and subtitle
- [ ] Scripture references
- [ ] Tags and categories
- [ ] Estimated read time
- [ ] Difficulty level
- [ ] Related series
- [ ] Shareable content IDs

#### 5.3 Quality Check

- [ ] JSON validates
- [ ] All fields populated
- [ ] No broken references
- [ ] Character encoding correct

### Output JSON Structure

```json
{
  "id": "welcome-to-euongelion-day-01",
  "series_id": "welcome-to-euongelion",
  "day_number": 1,
  "title": "What Is This Place?",
  "subtitle": "An introduction to EUONGELION",
  "scripture_primary": {
    "reference": "Zephaniah 3:17",
    "text": "The Lord your God is in your midst...",
    "translation": "ESV"
  },
  "estimated_read_time": 15,
  "difficulty": "beginner",
  "tags": ["onboarding", "introduction", "welcome"],
  "content": {
    "sections": [...],
    "interactive": {
      "breath_prayer": {...},
      "reflection_questions": [...],
      "journaling_prompt": {...}
    }
  },
  "shareable_content": [...],
  "citations": [...],
  "metadata": {
    "created_at": "2026-01-17",
    "approved_at": "2026-01-17",
    "version": "1.0"
  }
}
```

### Finalization Checklist

```
FINALIZATION CHECKLIST
======================

Source File: /content/approved/______
Output File: /content/final/______

JSON CONVERSION
[ ] Markdown converted to JSON
[ ] Sections parsed into modules
[ ] Interactive elements extracted
[ ] Citations formatted

METADATA
[ ] Series ID added
[ ] Day number correct
[ ] Title and subtitle present
[ ] Scripture references linked
[ ] Tags applied
[ ] Read time calculated
[ ] Difficulty level set
[ ] Related series linked

QUALITY CHECK
[ ] JSON validates (no syntax errors)
[ ] All required fields populated
[ ] No broken references
[ ] Character encoding correct (UTF-8)
[ ] Hebrew/Greek characters render properly

Saved to: /content/final/______/
Ready for publishing: [ ] YES [ ] NO
```

---

## Stage 6: PUBLISHING

### Purpose

Upload finalized content to production database and verify it displays correctly.

### Inputs

- Finalized JSON from `/content/final/`
- Database credentials
- Publishing schedule

### Activities

#### 6.1 Database Upload

- [ ] Connect to Supabase production
- [ ] Run insert/upsert script
- [ ] Verify row counts match expected
- [ ] Check foreign key relationships

#### 6.2 Cache Clear

- [ ] Clear CDN cache for affected routes
- [ ] Purge any server-side caches
- [ ] Invalidate API response caches

#### 6.3 Verification

- [ ] Load devotional in browser
- [ ] Check all sections render
- [ ] Verify interactive elements work
- [ ] Test share functionality
- [ ] Check mobile responsiveness
- [ ] Verify dark mode appearance

### Publishing Checklist

```
PUBLISHING CHECKLIST
====================

Content: ______________________
Environment: [ ] Staging [ ] Production
Publish Date: ______________________

DATABASE UPLOAD
[ ] Connected to correct environment
[ ] Upload script executed
[ ] Row counts verified
[ ] Foreign keys intact
[ ] No duplicate records

CACHE OPERATIONS
[ ] CDN cache cleared
[ ] Server cache purged
[ ] API cache invalidated

VERIFICATION
[ ] Content loads in browser
[ ] All sections render correctly
[ ] Interactive elements functional
[ ] Share buttons work
[ ] Mobile responsive
[ ] Dark mode displays correctly
[ ] Print/download works

POST-PUBLISH
[ ] Update content tracking
[ ] Notify team of new content
[ ] Monitor for errors (1 hour)

Published by: ______________________
Verified by: ______________________
Date/Time: ______________________
```

---

## Workflow Automation Opportunities

### Current State: Manual

All stages currently require manual execution.

### Future Automation

| Stage        | Automation Potential                |
| ------------ | ----------------------------------- |
| Planning     | Low - Requires creative decisions   |
| Drafting     | High - AI generation with templates |
| Review       | Low - Requires human judgment       |
| Approval     | None - Must be founder decision     |
| Finalization | High - Script conversion            |
| Publishing   | High - CI/CD pipeline               |

### Recommended Automation

1. **Drafting Script**
   - Input: Series outline + day number
   - Output: Draft markdown file
   - Uses Claude API with standard prompts

2. **JSON Conversion Script**
   - Input: Approved markdown
   - Output: Production JSON
   - Validates against schema

3. **Publishing Pipeline**
   - Triggered by merge to `main`
   - Runs database migrations
   - Clears caches automatically

---

## Metrics & Quality Targets

### Throughput Targets

| Metric                          | Target | Current |
| ------------------------------- | ------ | ------- |
| Drafts generated per day        | 10-15  | TBD     |
| Reviews completed per day       | 5-10   | TBD     |
| Days to publish (draft to live) | 3-5    | TBD     |

### Quality Targets

| Metric                   | Target |
| ------------------------ | ------ |
| First-pass approval rate | >70%   |
| Revision rounds average  | <1.5   |
| Production errors        | 0      |

---

## Escalation Paths

### Theological Concerns

1. Flag in review notes
2. Escalate to founder
3. Consult external theologian if needed

### Technical Issues

1. Document in GitHub issue
2. Escalate to architect
3. Rollback if production impacted

### Timeline Delays

1. Identify bottleneck
2. Reallocate resources
3. Adjust launch schedule if critical

---

## Document Control

| Version | Date       | Author       | Changes          |
| ------- | ---------- | ------------ | ---------------- |
| 1.0     | 2026-01-17 | Process Team | Initial creation |

---

_"Excellence is not a destination. It's a continuous journey that never ends."_
