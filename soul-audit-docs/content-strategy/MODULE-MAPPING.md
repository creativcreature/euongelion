# Substack → MVP Module Mapping

**Version:** 1.0
**Last Updated:** January 16, 2026

---

## Overview

Your existing Substack devotional structure maps cleanly to the 12 MVP modules. This document shows how to convert existing content.

---

## The Three Immersion Levels

Your Substack uses a 1/5/15 minute structure. Here's how the content maps:

### 1-Minute Immersion

| Substack Element | MVP Module     | Notes                                         |
| ---------------- | -------------- | --------------------------------------------- |
| Hebrew Word      | **Vocab**      | Word, transliteration, pronunciation, meaning |
| Verse            | **Scripture**  | Reference, text, emphasis                     |
| Question         | **Reflection** | Quick prompt for the day                      |
| Prayer           | **Prayer**     | Short, focused prayer                         |

### 5-Minute Immersion

| Substack Element    | MVP Module     | Notes                                     |
| ------------------- | -------------- | ----------------------------------------- |
| Modern Story        | **Story**      | Contemporary narrative illustrating theme |
| Ancient Wisdom      | **Teaching**   | Core theological content                  |
| Reflection Question | **Reflection** | Deeper prompt                             |
| Today's Commitment  | **Takeaway**   | Actionable commitment                     |

### 15-Minute Immersion

| Substack Element     | MVP Module                    | Notes                                   |
| -------------------- | ----------------------------- | --------------------------------------- |
| Hebrew Deep Dive     | **Vocab** (expanded)          | Word-by-word breakdown, Strong's number |
| Greek Parallel       | **Vocab** or **Insight**      | Cross-language connection               |
| Contemporary Story   | **Story**                     | Extended modern narrative               |
| Biblical Parallel    | **Teaching** or **Scripture** | Related Scripture                       |
| Historical Context   | **Insight**                   | Old/New Testament background            |
| Fascinating Factoid  | **Insight**                   | Memorable fact                          |
| Cross Commitment     | **Takeaway**                  | What to leave/receive at the cross      |
| Community Discussion | **Comprehension**             | Reflection + accountability questions   |

---

## The 12 MVP Modules

### 1. Scripture

**Purpose:** Present the anchor verse(s) for the day
**From Substack:** The verse in 1-Minute Immersion
**JSON Structure:**

```json
{
  "type": "scripture",
  "content": {
    "reference": "Ecclesiastes 1:2",
    "translation": "ESV",
    "text": "Vanity of vanities...",
    "emphasis": ["key phrases"],
    "hebrewOriginal": "optional"
  }
}
```

### 2. Teaching

**Purpose:** Core theological content explaining the passage
**From Substack:** "Ancient Wisdom" section
**JSON Structure:**

```json
{
  "type": "teaching",
  "content": {
    "title": "The Ancient Preacher's Wisdom",
    "body": "Main teaching content...",
    "keyInsight": "One-sentence takeaway"
  }
}
```

### 3. Vocab

**Purpose:** Hebrew or Greek word study
**From Substack:** Hebrew Word + Deep Dive sections
**JSON Structure:**

```json
{
  "type": "vocab",
  "content": {
    "language": "hebrew",
    "word": "הֶבֶל",
    "transliteration": "hevel",
    "pronunciation": "HEH-vel",
    "meaning": "vanity, vapor",
    "rootMeaning": "Extended explanation",
    "strongsNumber": "H1892"
  }
}
```

### 4. Story

**Purpose:** Narrative illustration (modern or biblical)
**From Substack:** Modern Story sections
**JSON Structure:**

```json
{
  "type": "story",
  "content": {
    "title": "The Modern Preacher's Lament",
    "body": "Sarah refreshed her email...",
    "connectionToTheme": "How this illustrates the day's point"
  }
}
```

### 5. Insight

**Purpose:** Historical context, fascinating facts, background
**From Substack:** Historical Context + Fascinating Factoid
**JSON Structure:**

```json
{
  "type": "insight",
  "content": {
    "title": "Motion vs. Progress",
    "body": "Main insight content",
    "historicalContext": "Background info",
    "fascinatingFact": "Did you know..."
  }
}
```

### 6. Prayer

**Purpose:** Model prayer for the day
**From Substack:** Prayer in 1-Minute Immersion
**JSON Structure:**

```json
{
  "type": "prayer",
  "content": {
    "text": "God, show me what is hevel...",
    "type": "personal|corporate|liturgical",
    "posture": "confession|gratitude|petition|lament"
  }
}
```

### 7. Takeaway

**Purpose:** Actionable commitment
**From Substack:** Today's Commitment + Cross Commitment
**JSON Structure:**

```json
{
  "type": "takeaway",
  "content": {
    "commitment": "I will identify one vapor activity...",
    "leavingAtCross": ["list of things to release"],
    "receivingFromCross": ["list of things to receive"]
  }
}
```

### 8. Reflection

**Purpose:** Questions for personal examination
**From Substack:** Question prompts throughout
**JSON Structure:**

```json
{
  "type": "reflection",
  "content": {
    "prompt": "Main reflection question",
    "additionalQuestions": ["More questions"],
    "invitationType": "honest-examination|gratitude|confession"
  }
}
```

### 9. Bridge

**Purpose:** Connect ancient truth to modern life
**From Substack:** Implicit in the structure, can be made explicit
**JSON Structure:**

```json
{
  "type": "bridge",
  "content": {
    "ancientTruth": "What Solomon said",
    "modernApplication": "What it means today",
    "connectionPoint": "The link between them",
    "newTestamentEcho": "How NT expands this"
  }
}
```

### 10. Comprehension

**Purpose:** Discussion and accountability questions
**From Substack:** Community Discussion section
**JSON Structure:**

```json
{
  "type": "comprehension",
  "content": {
    "forReflection": ["Personal questions"],
    "forAccountabilityPartners": ["Partner questions"]
  }
}
```

### 11. Resource

**Purpose:** External links, books, deeper study
**From Substack:** Can be extracted from references
**JSON Structure:**

```json
{
  "type": "resource",
  "content": {
    "relatedScriptures": [{ "reference": "", "text": "" }],
    "forDeeperStudy": [
      { "type": "book|article|video", "title": "", "note": "" }
    ]
  }
}
```

### 12. Profile

**Purpose:** Character study (biblical figure)
**From Substack:** Can be extracted from teaching about figures
**JSON Structure:**

```json
{
  "type": "profile",
  "content": {
    "name": "Solomon",
    "title": "The Teacher",
    "description": "Who they were...",
    "keyQuote": "Their defining words",
    "lessonForUs": "What we learn from them"
  }
}
```

---

## Module Usage by Day

Not every day needs all 12 modules. Recommended patterns:

### Minimum (1-Minute Experience)

- Scripture
- Vocab
- Reflection
- Prayer

### Standard (5-Minute Experience)

- Scripture
- Vocab
- Teaching
- Story
- Reflection
- Prayer
- Takeaway

### Full (15-Minute Experience)

- All 12 modules

---

## Conversion Workflow

### Step 1: Extract from HTML

Parse the Substack HTML to identify each section.

### Step 2: Map to Modules

Use this document to assign content to the correct module type.

### Step 3: Structure as JSON

Format according to the JSON schemas above.

### Step 4: Add Metadata

Include series info, day number, keywords, etc.

### Step 5: Validate

Ensure all required fields are present.

---

## Example: Day 1 Conversion

**Original Substack sections:**

- 1-Minute: Hebrew word, verse, question, prayer
- 5-Minute: Modern story, ancient wisdom, reflection, commitment
- 15-Minute: Deep dive, Greek parallel, story, biblical parallel, historical context, factoid, cross commitment, discussion

**Converted to 12 modules:**

1. Scripture → Ecclesiastes 1:2
2. Vocab → hevel (vapor)
3. Teaching → Solomon's wisdom
4. Story → Sarah's email refresh
5. Insight → Historical context + factoid
6. Bridge → Ancient to modern connection
7. Reflection → "What fills your time but empties your soul?"
8. Prayer → "God, show me what is hevel..."
9. Takeaway → Commitment + cross
10. Comprehension → Discussion questions
11. Resource → Related scriptures
12. Profile → Solomon

---

## Series Metadata Structure

```json
{
  "series": {
    "id": "too-busy-for-god",
    "title": "Too Busy for God",
    "subtitle": "When Your Schedule Becomes Your Savior",
    "pathway": "Sleep",
    "coreQuestion": "What are you so busy doing...",
    "booksOfFocus": ["Ecclesiastes", "Proverbs"],
    "totalDays": 5,
    "heroImage": "path/to/image.png",
    "soulAuditKeywords": ["busy", "overwhelmed", "exhausted"]
  }
}
```

---

## Next Steps

1. **Automate conversion** — Build a script to parse HTML → JSON
2. **Validate existing content** — Ensure all series have all required elements
3. **Fill gaps** — Add Bridge, Resource, Profile modules where missing
4. **Generate metadata** — Add soul audit keywords, pathway alignment

---

_The Word was already structured well. Now we're giving it a shape the platform can render._
