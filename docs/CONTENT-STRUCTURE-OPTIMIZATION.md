# Content Structure Optimization

**Version:** 1.0
**Last Updated:** January 17, 2026
**Status:** REFERENCE DOCUMENT

---

## Purpose

This document defines the optimal structure for EUONGELION's ~1,070 planned devotionals. It serves as the authoritative guide for:

- Content creators writing devotionals
- Technical architects building the platform
- Designers creating the reading experience
- Operations managing content at scale

---

## Table of Contents

1. [Devotional Anatomy](#1-devotional-anatomy)
2. [Content Modules](#2-content-modules)
3. [Module Metadata](#3-module-metadata)
4. [JSON Schema Recommendations](#4-json-schema-recommendations)
5. [Content Relationships](#5-content-relationships)
6. [Shareability Annotations](#6-shareability-annotations)
7. [Localization Readiness](#7-localization-readiness)
8. [Content Versioning](#8-content-versioning)
9. [Search Optimization](#9-search-optimization)
10. [Content Migration Path](#10-content-migration-path)

---

## 1. Devotional Anatomy

### 1.1 The Two Content Formats

EUONGELION uses **two distinct formats** that must be understood separately:

#### Format A: Deep Dive Narrative Essay (~4,000 words)

The primary content format. A cohesive essay experience like the Genesis Substack post.

| Section                    | Position    | Word Count | Purpose                                                     |
| -------------------------- | ----------- | ---------- | ----------------------------------------------------------- |
| **Hook (A)**               | Opening     | 400-500    | Modern story, tension surfacing, meta-story placement       |
| **Text (B)**               | Development | 500-700    | Scripture introduction, historical context, plain meaning   |
| **Center (C)**             | Pivot       | 700-900    | Hebrew/Greek deep-dive, etymology, PaRDeS hints - THE HEART |
| **Christ Connection (B')** | Resolution  | 600-800    | NT fulfillment, Jesus as embodiment, application            |
| **Return (A')**            | Closing     | 400-600    | Modern life transformed, reflection, response invitation    |
| **Interactive**            | Embedded    | Variable   | Breath prayer, journaling, physical practice                |
| **Notes**                  | Footer      | Variable   | Endnote citations                                           |

**Total: 3,000-4,000 words**

#### Format B: Modular Structure (12 modules)

For platform rendering and progressive disclosure (1-min / 5-min / 15-min experiences).

| Module        | Required    | Typical Words | Purpose                      |
| ------------- | ----------- | ------------- | ---------------------------- |
| Scripture     | Yes         | 50-150        | Anchor verse(s)              |
| Vocab         | Yes         | 100-200       | Hebrew/Greek word study      |
| Teaching      | Yes         | 300-500       | Core theological content     |
| Story         | Recommended | 200-400       | Narrative illustration       |
| Insight       | Recommended | 100-200       | Historical context, facts    |
| Bridge        | Recommended | 100-150       | Ancient-to-modern connection |
| Reflection    | Yes         | 50-100        | Personal examination         |
| Prayer        | Yes         | 50-100        | Model prayer                 |
| Takeaway      | Recommended | 100-150       | Actionable commitment        |
| Comprehension | Optional    | 50-100        | Knowledge check              |
| Resource      | Optional    | Variable      | External links, deeper study |
| Profile       | Optional    | 150-300       | Character study              |

### 1.2 Required vs. Optional Elements

**Always Required:**

- Scripture passage (every devotional anchors in text)
- Vocab module (Hebrew OR Greek word study)
- Teaching content (theological exposition)
- Reflection question (at least one)
- Prayer (closing prayer)
- Meta-story placement (where are we in God's narrative?)
- Christ connection (explicit link to Jesus)
- Endnote citations (minimum 3 sources)

**Strongly Recommended:**

- Modern story (narrative illustration)
- Bridge (ancient-to-modern connection)
- Takeaway (actionable step)
- Interactive element (breath prayer, journaling, etc.)

**Contextually Optional:**

- Profile (when a biblical figure is central)
- Comprehension (for teaching-heavy content)
- Resource (when deeper study is warranted)

### 1.3 Section Order and Hierarchy

```
DEVOTIONAL
├── Header
│   ├── Series Title
│   ├── Day Number
│   ├── Day Title
│   └── Meta-story Timeline Placement
│
├── Body (Chiastic Flow)
│   ├── A: Hook / Modern Story
│   ├── B: Scripture + Context
│   ├── C: Word Study (THE CENTER)
│   ├── B': Christ Connection
│   └── A': Return / Application
│
├── Interactive Element
│   └── (Rotates: breath prayer, journaling, physical practice, etc.)
│
├── Reflection Questions
│   └── 2-3 questions
│
├── Footer
│   ├── Endnote Citations
│   ├── Related Content Links
│   └── Series Navigation
│
└── Metadata (Hidden)
    ├── Tags, Keywords
    ├── Shareability Annotations
    └── Technical Flags
```

### 1.4 Word Count Guidelines

| Content Type               | Minimum | Target | Maximum |
| -------------------------- | ------- | ------ | ------- |
| **Standard Devotional**    | 2,500   | 3,500  | 4,500   |
| **Onboarding Content**     | 1,500   | 2,000  | 2,500   |
| **Story of God (Weekly)**  | 4,500   | 5,500  | 6,500   |
| **Apologetics (Doctrine)** | 3,000   | 4,000  | 5,000   |

---

## 2. Content Modules

### 2.1 Scripture Module

**Purpose:** Present the anchor verse(s) for the day.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `reference` | string | Book chapter:verse (e.g., "Genesis 1:1-3") |
| `translation` | string | Bible version (ESV, NIV, WEB, etc.) |
| `text` | string | Full scripture text |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `emphasis` | array[string] | Key phrases to highlight |
| `hebrewOriginal` | string | Original Hebrew text |
| `greekOriginal` | string | Original Greek text |
| `literalTranslation` | string | Word-for-word rendering |
| `contextBefore` | string | Verses immediately before |
| `contextAfter` | string | Verses immediately after |

**Display Notes:**

- Scripture should be visually distinguished (blockquote, gold accent)
- Emphasis phrases rendered in bold or different color
- Original language text shown in authentic script

---

### 2.2 Vocab (Word Study) Module

**Purpose:** Hebrew or Greek word deep-dive.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `language` | enum | "hebrew" or "greek" |
| `word` | string | Original script (e.g., "הֶבֶל") |
| `transliteration` | string | Romanized spelling (e.g., "hevel") |
| `pronunciation` | string | Phonetic guide (e.g., "HEH-vel") |
| `definition` | string | Primary meaning(s) |
| `strongsNumber` | string | Strong's reference (e.g., "H1892") |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `rootMeaning` | string | Etymology and root explanation |
| `usageNote` | string | How the word is used in Scripture |
| `pictographicRoot` | string | Ancient pictographic origins |
| `relatedWords` | array[string] | Cognates and related terms |
| `occurrences` | number | Times word appears in Bible |
| `audioUrl` | string | Pronunciation audio file |
| `etymologyNarrative` | string | Extended etymology story |

**Display Notes:**

- Original script displayed prominently (larger font)
- Gold accent color for Hebrew/Greek text
- Pronunciation guide always visible
- Consider "card" layout for visual distinction

---

### 2.3 Teaching Module

**Purpose:** Core theological exposition.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Main teaching body (markdown supported) |
| `pardesLayer` | enum | "peshat", "remez", "derash", "sod" |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Section title |
| `keyInsight` | string | One-sentence takeaway |
| `theologicalFramework` | string | Doctrinal context |
| `pullQuote` | string | Quotable excerpt |

**PaRDeS Layer Definitions:**
| Layer | Hebrew | Focus | Depth |
|-------|--------|-------|-------|
| Peshat | פְּשַׁט | Plain, literal meaning | Surface |
| Remez | רֶמֶז | Hints, allusions, types | Symbolic |
| Derash | דְּרַשׁ | Search, inquiry, application | Practical |
| Sod | סוֹד | Secret, mystery, deeper revelation | Mystical |

---

### 2.4 Story Module

**Purpose:** Narrative illustration (modern or biblical parallel).

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `body` | string | Full story narrative |
| `connectionToTheme` | string | Explicit link to devotional theme |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Story title |
| `type` | enum | "modern", "biblical", "historical", "hypothetical" |
| `source` | string | Attribution if from external source |
| `characters` | array[string] | Key people in the story |
| `setting` | string | Time and place |
| `pullQuote` | string | Key quotable line |

**Story Guidelines:**

- Modern stories preferred for emotional resonance
- Historical figures (like Hiroo Onoda) ground abstract truths
- Hypothetical scenarios marked clearly ("Imagine...")
- All factual claims require citation

---

### 2.5 Insight Module

**Purpose:** Historical context, fascinating facts, background information.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Main insight content |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Insight title |
| `type` | enum | "historical", "cultural", "linguistic", "archaeological", "scientific" |
| `fascinatingFact` | string | "Did you know..." style fact |
| `source` | string | Citation |
| `imageUrl` | string | Supporting visual |

---

### 2.6 Bridge Module

**Purpose:** Connect ancient truth to modern life.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `ancient` | string | What the original audience understood |
| `modern` | string | What it means for us today |
| `connection` | string | The link between them |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Reflective question for the reader |
| `newTestamentEcho` | string | NT parallel or fulfillment |
| `culturalParallel` | string | Modern cultural equivalent |

---

### 2.7 Reflection Module

**Purpose:** Questions for personal examination.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Primary reflection question |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `additionalQuestions` | array[string] | More questions |
| `promptText` | string | Guidance for reflection |
| `invitationType` | enum | "honest-examination", "gratitude", "confession", "commitment" |
| `allowSave` | boolean | Whether user can save response |
| `journalPrompt` | string | If this doubles as journaling |

---

### 2.8 Prayer Module

**Purpose:** Model prayer for the day.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Full prayer text |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Prayer title (e.g., "Closing Prayer") |
| `type` | enum | "personal", "corporate", "liturgical", "breath" |
| `posture` | enum | "confession", "gratitude", "petition", "lament", "praise" |
| `scriptureEcho` | string | Related Scripture reference |

---

### 2.9 Takeaway Module

**Purpose:** Actionable commitment or summary.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Key takeaway statement |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Section title |
| `action` | string | Specific action step |
| `leavingAtCross` | array[string] | What to release |
| `receivingFromCross` | array[string] | What to receive |
| `weeklyChallenge` | string | Extended commitment |

---

### 2.10 Comprehension Module

**Purpose:** Knowledge check and discussion questions.

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Main comprehension question |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `options` | array[object] | Multiple choice options with `text` and `correct` fields |
| `explanation` | string | Why the answer matters |
| `forReflection` | array[string] | Personal questions |
| `forAccountabilityPartners` | array[string] | Group discussion questions |

---

### 2.11 Resource Module

**Purpose:** External links and deeper study materials.

**Optional Fields (all):**
| Field | Type | Description |
|-------|------|-------------|
| `relatedScriptures` | array[object] | Additional passages with `reference` and `text` |
| `forDeeperStudy` | array[object] | Resources with `type`, `title`, `url`, `note` |
| `commentaryExcerpts` | array[object] | Quotes from Matthew Henry, Calvin, etc. |
| `videoEmbed` | object | YouTube/Vimeo embed with `url` and `title` |

---

### 2.12 Profile Module

**Purpose:** Biblical character study.

**Required Fields (when used):**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Character name |
| `description` | string | Who they were |
| `lessonForUs` | string | What we learn from them |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Descriptor (e.g., "The Teacher") |
| `keyQuote` | string | Their defining words |
| `timelinePlacement` | string | Where in biblical history |
| `relatedFigures` | array[string] | Connected characters |

---

### 2.13 Interactive Element Module

**Purpose:** Experiential engagement beyond reading.

**Types of Interactive Elements:**

| Type                | Description                | Rotation Day |
| ------------------- | -------------------------- | ------------ |
| `breath-prayer`     | Inhale/exhale prayer       | Day 1        |
| `journaling`        | Extended writing prompt    | Day 2        |
| `physical-practice` | Posture, gesture, movement | Day 3        |
| `scripture-memory`  | Memory technique + verse   | Day 4        |
| `art-response`      | Find/create image response | Day 5        |
| `music-meditation`  | Song or hymn reflection    | Day 6        |
| `silence-review`    | Stillness + weekly review  | Day 7        |

**Required Fields (when used):**
| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | One of the types above |
| `instructions` | string | How to engage |

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `breathPhrase` | object | `inhale` and `exhale` strings |
| `repetitions` | number | How many times to repeat |
| `duration` | string | Suggested time (e.g., "5 minutes") |
| `musicUrl` | string | Spotify/YouTube link |
| `imagePrompt` | string | What to look for |

---

## 3. Module Metadata

### 3.1 Per-Module Metadata

Every module should carry metadata for filtering, search, and display logic.

| Field               | Type          | Description                            | Example                              |
| ------------------- | ------------- | -------------------------------------- | ------------------------------------ |
| `id`                | string        | Unique identifier                      | "ttb-gen-01-vocab-01"                |
| `moduleType`        | enum          | Module type name                       | "vocab"                              |
| `order`             | number        | Display sequence                       | 3                                    |
| `immersionLevel`    | enum          | "1min", "5min", "15min"                | "1min"                               |
| `shareable`         | boolean       | Can this be shared standalone?         | true                                 |
| `shareableAs`       | array[enum]   | "quote", "image", "snippet"            | ["quote", "image"]                   |
| `searchWeight`      | number        | Relevance boost (1-10)                 | 8                                    |
| `tags`              | array[string] | Content tags                           | ["hebrew", "creation", "word-study"] |
| `difficulty`        | enum          | "beginner", "intermediate", "advanced" | "intermediate"                       |
| `estimatedReadTime` | number        | Seconds to consume                     | 120                                  |

### 3.2 Devotional-Level Metadata

| Field                | Type        | Description                                               |
| -------------------- | ----------- | --------------------------------------------------------- |
| `id`                 | string      | Unique devotional ID                                      |
| `seriesId`           | string      | Parent series reference                                   |
| `dayNumber`          | number      | Position in series                                        |
| `title`              | string      | Day title                                                 |
| `subtitle`           | string      | Optional secondary title                                  |
| `slug`               | string      | URL-friendly identifier                                   |
| `publishedAt`        | datetime    | Publication date                                          |
| `updatedAt`          | datetime    | Last modification                                         |
| `version`            | string      | Content version                                           |
| `status`             | enum        | "draft", "in-review", "approved", "published", "archived" |
| `wordCount`          | number      | Total words                                               |
| `estimatedReadTime`  | number      | Minutes to read                                           |
| `chiasmPosition`     | enum        | "A", "B", "C", "B'", "A'"                                 |
| `metaStoryPlacement` | enum        | See meta-story taxonomy                                   |
| `pardesFocus`        | array[enum] | Which layers are emphasized                               |

### 3.3 Tags Taxonomy

**Theological Tags:**

- `creation`, `fall`, `promise`, `exodus`, `kingdom`, `exile`, `incarnation`, `passion`, `resurrection`, `church`, `consummation`
- `gospel`, `grace`, `faith`, `hope`, `love`, `justice`, `mercy`, `holiness`, `covenant`

**Content Type Tags:**

- `word-study`, `narrative`, `teaching`, `application`, `apologetics`, `doctrine`, `discipline`

**Emotional Tone Tags:**

- `comfort`, `challenge`, `lament`, `celebration`, `conviction`, `encouragement`

**Life Circumstance Tags:**

- `grief`, `doubt`, `joy`, `struggle`, `transition`, `leadership`, `new-believer`, `deconstruction`

**Language Tags:**

- `hebrew`, `greek`, `aramaic`

**Biblical Book Tags:**

- All 66 books of the Bible

### 3.4 Difficulty/Depth Indicators

| Level            | Description                                           | Audience                  |
| ---------------- | ----------------------------------------------------- | ------------------------- |
| **Beginner**     | Foundational concepts, accessible language            | New believers, seekers    |
| **Intermediate** | Deeper theological concepts, some technical terms     | Growing believers         |
| **Advanced**     | Scholarly depth, original languages, complex doctrine | Mature believers, leaders |

**Factors Determining Level:**

- Vocabulary complexity
- Theological prerequisite knowledge
- Length and density
- Number of Hebrew/Greek words
- Doctrinal nuance required

---

## 4. JSON Schema Recommendations

### 4.1 Devotional Content Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "seriesId", "dayNumber", "title", "modules", "metadata"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Unique devotional identifier"
    },
    "seriesId": {
      "type": "string",
      "description": "Reference to parent series"
    },
    "dayNumber": {
      "type": "integer",
      "minimum": 1
    },
    "title": {
      "type": "string",
      "maxLength": 100
    },
    "subtitle": {
      "type": "string",
      "maxLength": 200
    },
    "chiasmPosition": {
      "type": "string",
      "enum": ["A", "B", "C", "B'", "A'"]
    },
    "metaStoryPlacement": {
      "type": "string",
      "enum": [
        "creation",
        "fall",
        "promise",
        "exodus",
        "kingdom",
        "exile",
        "incarnation",
        "passion",
        "resurrection",
        "church",
        "consummation"
      ]
    },
    "modules": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/module"
      },
      "minItems": 4
    },
    "metadata": {
      "$ref": "#/$defs/devotionalMetadata"
    },
    "citations": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/citation"
      }
    },
    "shareableSnippets": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/shareableSnippet"
      }
    },
    "relatedContent": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/contentRelation"
      }
    }
  },
  "$defs": {
    "module": {
      "type": "object",
      "required": ["type", "data"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "scripture",
            "vocab",
            "teaching",
            "story",
            "insight",
            "bridge",
            "reflection",
            "prayer",
            "takeaway",
            "comprehension",
            "resource",
            "profile",
            "interactive"
          ]
        },
        "data": {
          "type": "object"
        },
        "metadata": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "order": { "type": "integer" },
            "immersionLevel": {
              "type": "string",
              "enum": ["1min", "5min", "15min"]
            },
            "shareable": { "type": "boolean" },
            "searchWeight": { "type": "integer", "minimum": 1, "maximum": 10 },
            "tags": { "type": "array", "items": { "type": "string" } },
            "difficulty": {
              "type": "string",
              "enum": ["beginner", "intermediate", "advanced"]
            }
          }
        }
      }
    },
    "devotionalMetadata": {
      "type": "object",
      "properties": {
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "status": {
          "type": "string",
          "enum": ["draft", "in-review", "approved", "published", "archived"]
        },
        "publishedAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" },
        "wordCount": { "type": "integer" },
        "estimatedReadTime": { "type": "integer" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "emotionalTones": { "type": "array", "items": { "type": "string" } },
        "difficulty": {
          "type": "string",
          "enum": ["beginner", "intermediate", "advanced"]
        },
        "soulAuditKeywords": { "type": "array", "items": { "type": "string" } },
        "author": { "type": "string" },
        "reviewer": { "type": "string" },
        "localizationStatus": {
          "type": "object",
          "additionalProperties": {
            "type": "string",
            "enum": ["not-started", "in-progress", "complete", "needs-review"]
          }
        }
      }
    },
    "citation": {
      "type": "object",
      "required": ["number", "text"],
      "properties": {
        "number": { "type": "integer" },
        "text": { "type": "string" },
        "type": {
          "type": "string",
          "enum": [
            "scripture",
            "book",
            "article",
            "commentary",
            "lexicon",
            "online"
          ]
        },
        "url": { "type": "string", "format": "uri" }
      }
    },
    "shareableSnippet": {
      "type": "object",
      "required": ["id", "content", "type"],
      "properties": {
        "id": { "type": "string" },
        "content": { "type": "string" },
        "type": {
          "type": "string",
          "enum": ["quote", "word-study", "prayer", "insight", "scripture"]
        },
        "platforms": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["twitter", "instagram", "facebook", "threads", "general"]
          }
        },
        "characterCount": { "type": "integer" },
        "imageAssociation": { "type": "string" }
      }
    },
    "contentRelation": {
      "type": "object",
      "required": ["type", "targetId"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "prerequisite",
            "sequel",
            "parallel",
            "deeper-dive",
            "related-topic",
            "same-word",
            "same-passage"
          ]
        },
        "targetId": { "type": "string" },
        "description": { "type": "string" }
      }
    }
  }
}
```

### 4.2 Series Metadata Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "title", "dayCount", "pathway"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "title": {
      "type": "string",
      "maxLength": 100
    },
    "subtitle": {
      "type": "string",
      "maxLength": 200
    },
    "pathway": {
      "type": "string",
      "enum": [
        "sleep",
        "anchor",
        "rise",
        "walk",
        "run",
        "fly",
        "onboarding",
        "doctrine",
        "discipline",
        "apologetics"
      ]
    },
    "dayCount": {
      "type": "integer",
      "minimum": 5,
      "multipleOf": 5
    },
    "description": {
      "type": "string"
    },
    "coreQuestion": {
      "type": "string",
      "description": "The central question this series addresses"
    },
    "booksOfFocus": {
      "type": "array",
      "items": { "type": "string" }
    },
    "heroImage": {
      "type": "string"
    },
    "thumbnailImage": {
      "type": "string"
    },
    "targetAudience": {
      "type": "array",
      "items": { "type": "string" }
    },
    "emotionalTones": {
      "type": "array",
      "items": { "type": "string" }
    },
    "lifeCircumstances": {
      "type": "array",
      "items": { "type": "string" }
    },
    "soulAuditKeywords": {
      "type": "array",
      "items": { "type": "string" }
    },
    "prerequisites": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Series IDs that should be completed first"
    },
    "relatedSeries": {
      "type": "array",
      "items": { "type": "string" }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "status": {
          "type": "string",
          "enum": ["draft", "in-review", "approved", "published", "archived"]
        },
        "publishedAt": { "type": "string", "format": "date-time" },
        "difficulty": {
          "type": "string",
          "enum": ["beginner", "intermediate", "advanced"]
        }
      }
    }
  }
}
```

### 4.3 Shareable Snippet Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "sourceDevotionalId", "content", "type"],
  "properties": {
    "id": {
      "type": "string"
    },
    "sourceDevotionalId": {
      "type": "string"
    },
    "sourceModuleId": {
      "type": "string"
    },
    "content": {
      "type": "string",
      "maxLength": 500
    },
    "type": {
      "type": "string",
      "enum": [
        "quote",
        "word-study",
        "prayer",
        "insight",
        "scripture",
        "breath-prayer"
      ]
    },
    "platformVariants": {
      "type": "object",
      "properties": {
        "twitter": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "maxLength": 280 },
            "characterCount": { "type": "integer" }
          }
        },
        "instagram": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "maxLength": 2200 },
            "hashtags": { "type": "array", "items": { "type": "string" } }
          }
        },
        "threads": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "maxLength": 500 }
          }
        },
        "facebook": {
          "type": "object",
          "properties": {
            "text": { "type": "string" }
          }
        }
      }
    },
    "imageAssociation": {
      "type": "object",
      "properties": {
        "heroImageId": { "type": "string" },
        "socialCardId": { "type": "string" },
        "backgroundColor": { "type": "string" },
        "overlayText": { "type": "boolean" }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "generatedAt": { "type": "string", "format": "date-time" },
        "approvedForSharing": { "type": "boolean" },
        "shareCount": { "type": "integer" }
      }
    }
  }
}
```

### 4.4 Versioning Considerations

**Schema Versioning:**

- Use semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking changes to required fields
- MINOR: New optional fields added
- PATCH: Bug fixes, clarifications

**Content Versioning:**

- Every devotional carries a version number
- Changes tracked with changelog
- Previous versions accessible for audit

**Migration Strategy:**

- Schema changes require migration scripts
- Backward compatibility for at least 2 major versions
- Deprecation warnings before removal

---

## 5. Content Relationships

### 5.1 Relationship Types

| Type              | Description                  | Example                                                |
| ----------------- | ---------------------------- | ------------------------------------------------------ |
| **prerequisite**  | Should be read before        | "Welcome to EUONGELION" before "How to Read the Bible" |
| **sequel**        | Direct continuation          | Day 1 to Day 2 in a series                             |
| **parallel**      | Same theme, different angle  | Two devotionals on "rest" from different books         |
| **deeper-dive**   | More advanced treatment      | Basic prayer vs. advanced prayer disciplines           |
| **related-topic** | Thematically connected       | "Grief" and "Lament" series                            |
| **same-word**     | Same Hebrew/Greek word study | All devotionals featuring "hesed"                      |
| **same-passage**  | Same Scripture reference     | Multiple treatments of Psalm 23                        |
| **same-figure**   | Same biblical character      | All devotionals about David                            |
| **same-era**      | Same biblical time period    | Exile-era devotionals                                  |

### 5.2 Cross-Reference Implementation

**Explicit References:**

- Each devotional lists related content IDs
- Relationship type specified
- Bidirectional where appropriate

**Implicit References (Computed):**

- Same tags generate suggestions
- Same Scripture passages linked automatically
- Same Hebrew/Greek words create connection
- Word frequency analysis for thematic similarity

### 5.3 Thematic Linking

**Meta-Story Thread:**
Every devotional explicitly places itself in the biblical narrative:

- Creation, Fall, Promise, Exodus, Kingdom, Exile, Incarnation, Passion, Resurrection, Church, Consummation

**Thematic Clusters:**

- Devotionals grouped by dominant theme
- UI can surface "Explore more on [theme]"

### 5.4 Sequential Dependencies

**Series Dependencies:**

- Days within a series have strict sequence
- Series may have prerequisite series
- Onboarding series recommended for all new users

**Progressive Disclosure:**

- Some content unlocks after completing prerequisites
- Soul Audit can recommend starting points
- Day-gating respects user's timezone (7 AM release)

---

## 6. Shareability Annotations

### 6.1 Marking Content as Shareable

Not all content should be shared equally. Use these criteria:

**Highly Shareable:**

- Pull quotes from teaching
- Word study cards (Hebrew/Greek word + meaning)
- Breath prayers
- Scripture passages with emphasis
- Key insights

**Moderately Shareable:**

- Reflection questions
- Story excerpts (with context)
- Bridge connections

**Not Shareable:**

- Full teaching modules (too long)
- Comprehension questions (quiz format)
- Full prayer texts (too personal)
- Citations (not standalone value)

### 6.2 Platform-Specific Variants

| Platform      | Character Limit | Best Content Types                      | Image Format           |
| ------------- | --------------- | --------------------------------------- | ---------------------- |
| **Twitter/X** | 280             | Word studies, quotes, breath prayers    | 1200x675               |
| **Instagram** | 2,200           | Extended quotes, scripture + reflection | 1080x1080 or 1080x1350 |
| **Threads**   | 500             | Word studies, insights                  | 1080x1080              |
| **Facebook**  | 63,206          | Full excerpts, stories                  | 1200x630               |
| **Pinterest** | 500             | Scripture cards, word study pins        | 1000x1500              |

### 6.3 Character Count Considerations

**Pre-computed character counts:**

- Store character count for each shareable snippet
- Include variants for different platforms
- Account for attribution (e.g., "- EUONGELION")

**Auto-truncation rules:**

- If over limit, truncate at sentence boundary
- Add ellipsis + "Read more at..."
- Never truncate mid-word or mid-Scripture

### 6.4 Image Association

**Every shareable snippet should have:**

- Associated hero image ID (from devotional)
- Social card variant ID (pre-generated)
- Background color fallback
- Text overlay preference (yes/no)

**Image Generation Metadata:**

```json
{
  "shareableId": "ttb-gen-01-quote-03",
  "imageVariants": {
    "twitter": "img/social/ttb-gen-01-twitter.png",
    "instagram-square": "img/social/ttb-gen-01-ig-square.png",
    "instagram-portrait": "img/social/ttb-gen-01-ig-portrait.png",
    "pinterest": "img/social/ttb-gen-01-pin.png"
  },
  "textOverlay": {
    "enabled": true,
    "position": "center",
    "maxLines": 4
  }
}
```

---

## 7. Localization Readiness

### 7.1 Structure for Future Translation

**Language-Agnostic Field Names:**

- Use English field names in schema
- Content values are translatable
- Metadata keys remain in English

**Translatable vs. Non-Translatable:**

| Translatable            | Non-Translatable          |
| ----------------------- | ------------------------- |
| title                   | id                        |
| subtitle                | seriesId                  |
| content                 | slug                      |
| question                | dayNumber                 |
| answer                  | order                     |
| definition              | type                      |
| body                    | timestamp                 |
| All user-facing strings | All technical identifiers |

### 7.2 Multi-Language Schema Extension

```json
{
  "id": "ttb-gen-01",
  "dayNumber": 1,
  "localizations": {
    "en": {
      "title": "In the Beginning",
      "modules": [...]
    },
    "es": {
      "title": "En el Principio",
      "modules": [...],
      "translationStatus": "complete",
      "translator": "translator-id",
      "reviewedBy": "reviewer-id"
    },
    "ar": {
      "title": "في البدء",
      "modules": [...],
      "textDirection": "rtl"
    }
  }
}
```

### 7.3 Cultural Adaptation Considerations

**Stories:**

- Modern stories may need cultural adaptation
- Hiroo Onoda story universally understood
- Local equivalents may be more impactful

**Examples and Metaphors:**

- Agricultural metaphors may need urban alternatives
- Sports references need localization
- Currency and measurement references

**Scripture Translations:**

- Support multiple translations per language
- ESV (English), RVR (Spanish), etc.
- Allow user preference

### 7.4 Right-to-Left Language Support

**Technical Requirements:**

- `textDirection: "rtl"` field
- CSS supports dir="rtl"
- Hebrew/Greek word studies remain LTR within RTL context
- Chiastic structure notation adapts

**Arabic/Hebrew/Farsi Considerations:**

- Original Hebrew text displays naturally
- Transliteration remains in Latin script
- UI elements mirror appropriately

### 7.5 Localization Workflow

```
1. Content created in English (primary)
2. Mark content ready for translation
3. Export to translation management system
4. Translate + cultural review
5. Back-import with status tracking
6. Theological review in target language
7. Publish localized version
```

---

## 8. Content Versioning

### 8.1 Version States

| State         | Description             | Visibility         | Editable         |
| ------------- | ----------------------- | ------------------ | ---------------- |
| **draft**     | Initial creation        | Author only        | Yes              |
| **in-review** | Awaiting founder review | Author + Reviewers | Yes              |
| **approved**  | Passed review           | Team               | Limited          |
| **published** | Live to users           | Public             | No (new version) |
| **archived**  | Removed from active use | Admin only         | No               |

### 8.2 Handling Updates

**Minor Updates (same version):**

- Typo fixes
- Citation corrections
- Formatting improvements
- No theological content change

**Major Updates (new version):**

- Theological content change
- Structural reorganization
- New modules added
- Significant rewrites

**Version Numbering:**

```
1.0.0 - Initial publication
1.0.1 - Typo fix
1.1.0 - Added new insight module
2.0.0 - Major theological revision
```

### 8.3 Draft vs. Published States

**Draft Management:**

- Multiple drafts can exist simultaneously
- Only one published version at a time
- Previous published versions archived (not deleted)

**Publishing Workflow:**

```
draft → in-review → approved → published
                ↓
            needs-revision → draft (iterate)
```

### 8.4 Review Workflow Integration

**Founder Review Checklist:**

1. Theological accuracy
2. PaRDeS depth appropriate
3. Christ connection explicit
4. Meta-story placement correct
5. Voice/tone consistent
6. Citations adequate
7. Shareability quality

**Review States:**

- `pending-review`: Awaiting first look
- `in-review`: Actively being reviewed
- `needs-revision`: Changes requested
- `approved`: Ready to publish
- `approved-with-notes`: Publishable, minor suggestions

### 8.5 Audit Trail

Every content change tracked:

```json
{
  "devotionalId": "ttb-gen-01",
  "version": "1.1.0",
  "changes": [
    {
      "timestamp": "2026-01-17T10:30:00Z",
      "author": "writer-agent",
      "changeType": "module-added",
      "description": "Added insight module for archaeological context",
      "modulesAffected": ["insight-02"]
    }
  ],
  "previousVersion": "1.0.0",
  "changeNote": "Enhanced historical context based on reviewer feedback"
}
```

---

## 9. Search Optimization

### 9.1 Searchable Fields

| Field                   | Search Weight | Index Type      |
| ----------------------- | ------------- | --------------- |
| `title`                 | 10            | Full-text       |
| `subtitle`              | 8             | Full-text       |
| `scripture.reference`   | 9             | Exact + partial |
| `scripture.text`        | 7             | Full-text       |
| `vocab.word`            | 9             | Exact           |
| `vocab.transliteration` | 9             | Exact + fuzzy   |
| `vocab.definition`      | 7             | Full-text       |
| `teaching.content`      | 6             | Full-text       |
| `teaching.keyInsight`   | 8             | Full-text       |
| `story.body`            | 5             | Full-text       |
| `insight.text`          | 6             | Full-text       |
| `reflection.question`   | 7             | Full-text       |
| `tags`                  | 8             | Exact           |
| `soulAuditKeywords`     | 9             | Exact + fuzzy   |
| `profile.name`          | 9             | Exact + fuzzy   |

### 9.2 Tagging Taxonomy

**Primary Categories:**

| Category           | Examples                          |
| ------------------ | --------------------------------- |
| **Biblical Book**  | genesis, psalms, matthew, romans  |
| **Meta-Story Era** | creation, exile, incarnation      |
| **Theme**          | grace, covenant, redemption, rest |
| **Emotional Tone** | comfort, challenge, lament        |
| **Life Stage**     | new-believer, doubting, grieving  |
| **Content Type**   | word-study, narrative, doctrine   |
| **Language**       | hebrew, greek                     |
| **Discipline**     | prayer, fasting, sabbath          |
| **Apologetics**    | atheism, islam, science           |

**Tag Hierarchy:**

```
themes/
├── salvation/
│   ├── grace
│   ├── faith
│   └── justification
├── sanctification/
│   ├── holiness
│   ├── discipline
│   └── growth
└── eschatology/
    ├── hope
    ├── resurrection
    └── consummation
```

### 9.3 Related Content Algorithms

**Algorithm Inputs:**

1. Shared tags (weighted by specificity)
2. Same Scripture reference
3. Same Hebrew/Greek word
4. Same biblical book
5. Same meta-story era
6. Same emotional tone
7. Same target audience
8. Series relationship

**Scoring Formula:**

```
relevance_score =
  (shared_tags * tag_weight) +
  (same_passage * 10) +
  (same_word * 8) +
  (same_book * 3) +
  (same_era * 4) +
  (same_tone * 2) +
  (audience_overlap * 3) +
  (series_proximity * 5)
```

### 9.4 Search UI Considerations

**Search Modes:**

- Quick search (title, reference, word)
- Advanced search (all fields, filters)
- Browse by tag
- Browse by series
- Browse by meta-story timeline

**Filter Options:**

- Series/Collection
- Biblical book
- Testament (OT/NT)
- Theme
- Difficulty level
- Word study language
- Read/Unread status

---

## 10. Content Migration Path

### 10.1 Existing Content Inventory

**Current State:**

- 19 series in JSON format
- ~110 days of devotionals
- 12-module structure per day
- Located in `/content/series-json/` and `/euongelion/content/series-json/`

**Sample Analyzed: "Too Busy for God"**

- 5 days
- Modules: scripture, vocab, teaching, bridge, reflection, prayer, insight, comprehension, takeaway, interactive
- Chiastic structure (A-B-C-B'-A')
- PaRDeS layers present

### 10.2 Gap Analysis

| Required Element     | Current Coverage | Gap               |
| -------------------- | ---------------- | ----------------- |
| Scripture module     | 100%             | None              |
| Vocab (Hebrew/Greek) | ~80%             | Some days missing |
| Teaching             | 100%             | None              |
| Story (narrative)    | ~50%             | Needs addition    |
| Insight              | ~70%             | Partial           |
| Bridge               | ~90%             | Good              |
| Reflection           | 100%             | None              |
| Prayer               | 100%             | None              |
| Takeaway             | ~80%             | Partial           |
| Comprehension        | ~60%             | Optional          |
| Resource             | ~20%             | Needs work        |
| Profile              | ~30%             | Contextual        |
| Interactive          | ~40%             | Needs addition    |
| Citations/Endnotes   | ~30%             | MAJOR GAP         |
| Meta-story placement | ~20%             | MAJOR GAP         |
| Shareable snippets   | 0%               | NEW REQUIREMENT   |

### 10.3 Conversion Priorities

**Phase 1: Critical Gaps (Immediate)**

1. Add endnote citations to all existing content
2. Add meta-story placement to all devotionals
3. Ensure every day has at least one word study

**Phase 2: Enhancement (Week 1-2)** 4. Add missing story modules 5. Add interactive elements (rotating by day) 6. Complete resource modules

**Phase 3: Optimization (Week 2-4)** 7. Generate shareable snippets 8. Add difficulty ratings 9. Complete tagging 10. Add content relationships

### 10.4 Migration Workflow

```
For each existing devotional:

1. AUDIT
   ├── Check module completeness
   ├── Verify Scripture accuracy
   ├── Count word studies
   └── Note missing elements

2. ENHANCE
   ├── Add citations (minimum 3)
   ├── Add meta-story placement
   ├── Add missing required modules
   └── Expand word studies if needed

3. ANNOTATE
   ├── Add tags from taxonomy
   ├── Set difficulty level
   ├── Mark shareable content
   └── Define content relationships

4. VALIDATE
   ├── Schema validation
   ├── Citation verification
   ├── Link checking
   └── Word count confirmation

5. APPROVE
   ├── Founder review
   ├── Theological check
   └── Voice/tone consistency

6. PUBLISH
   ├── Assign version 1.0.0
   ├── Set status to "published"
   └── Generate shareable snippets
```

### 10.5 New Content Creation Template

All new content should use this checklist:

```
[ ] Series metadata complete
[ ] Day number and title
[ ] Chiasm position (A/B/C/B'/A')
[ ] Meta-story placement

MODULES (check when complete):
[ ] Scripture (required)
[ ] Vocab - Hebrew or Greek (required)
[ ] Teaching with PaRDeS layer (required)
[ ] Story (recommended)
[ ] Insight (recommended)
[ ] Bridge (recommended)
[ ] Reflection (required)
[ ] Prayer (required)
[ ] Takeaway (recommended)
[ ] Comprehension (optional)
[ ] Resource (optional)
[ ] Profile (if applicable)
[ ] Interactive element (rotating)

METADATA:
[ ] Tags assigned
[ ] Difficulty level set
[ ] Soul Audit keywords
[ ] Emotional tones
[ ] Word count recorded
[ ] Estimated read time

CITATIONS:
[ ] Minimum 3 citations
[ ] All claims sourced
[ ] Scripture references formatted

SHAREABILITY:
[ ] 2-3 shareable snippets identified
[ ] Character counts verified
[ ] Platform variants noted

RELATIONSHIPS:
[ ] Previous day linked
[ ] Next day linked
[ ] Related content identified
```

---

## Appendix A: Module Order Reference

**Standard Devotional Module Order:**

| Position | Module            | Notes                             |
| -------- | ----------------- | --------------------------------- |
| 1        | Scripture         | Anchor passage                    |
| 2        | Vocab             | Primary word study                |
| 3        | Teaching (Part 1) | Context, plain meaning            |
| 4        | Story             | Narrative illustration            |
| 5        | Vocab (2nd)       | Secondary word study (optional)   |
| 6        | Teaching (Part 2) | Deeper meaning, Christ connection |
| 7        | Bridge            | Ancient to modern                 |
| 8        | Insight           | Historical/cultural context       |
| 9        | Interactive       | Breath prayer, journaling, etc.   |
| 10       | Reflection        | 2-3 questions                     |
| 11       | Prayer            | Closing prayer                    |
| 12       | Takeaway          | Commitment/action                 |
| 13       | Resource          | Further study (optional)          |
| 14       | Comprehension     | Quiz (optional)                   |
| 15       | Profile           | Character study (optional)        |

---

## Appendix B: Citation Format Reference

**Scripture:**

```
Book Chapter:Verse (Translation).
Example: John 3:16 (ESV).
```

**Lexicon:**

```
Author(s). Title. Place: Publisher, Year. Entry [Strong's number].
Example: Brown, Francis, S.R. Driver, and Charles A. Briggs. The Brown-Driver-Briggs Hebrew and English Lexicon. Peabody, MA: Hendrickson Publishers, 1906. Entry H1892.
```

**Commentary:**

```
Author. "Chapter/Section Title." In Commentary Title, edited by Editor, pages. Place: Publisher, Year.
Example: Henry, Matthew. "Genesis 1." In Matthew Henry's Commentary on the Whole Bible, vol. 1. Peabody, MA: Hendrickson Publishers, 1991.
```

**Book:**

```
Author. Title. Place: Publisher, Year.
Example: Onoda, Hiroo. No Surrender: My Thirty-Year War. Translated by Charles S. Terry. New York: Kodansha International, 1974.
```

**Online Resource:**

```
Author/Organization. "Article Title." Website Name. Accessed [Date]. URL.
Example: Piper, John. "What Is the Meaning of Life?" Desiring God. Accessed January 17, 2026. https://www.desiringgod.org/...
```

---

## Appendix C: Soul Audit Keyword Guidelines

Keywords that trigger content matching:

**Emotional State Keywords:**

- overwhelmed, anxious, depressed, angry, confused
- hopeful, grateful, joyful, peaceful, excited
- doubting, questioning, wrestling, searching

**Life Circumstance Keywords:**

- grieving, loss, death, divorce, job loss
- new believer, returning, deconstructing
- leading, parenting, single, married
- busy, stressed, burned out, exhausted

**Spiritual State Keywords:**

- dry, distant, growing, stuck, thriving
- seeking, found, lost, returning

---

## Appendix D: Immersion Level Module Mapping

**1-Minute Experience (4 modules):**

- Scripture
- Vocab
- Reflection
- Prayer

**5-Minute Experience (7 modules):**

- Scripture
- Vocab
- Teaching
- Story
- Reflection
- Prayer
- Takeaway

**15-Minute Experience (all modules):**

- All 12+ modules
- Full narrative essay flow

---

_This document is the authoritative reference for EUONGELION content structure. All content creation, technical implementation, and design decisions should align with these specifications._

_Last reviewed: January 17, 2026_
_Next review: Before Phase 1 launch_
