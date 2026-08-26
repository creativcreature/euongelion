# Content Structure

**Version:** 1.0

---

## OVERVIEW

Every devotional follows consistent structures:

1. **Chiastic** (A-B-C-B'-A') - Mirrors beginning and end
2. **PaRDeS** - Four layers of interpretation
3. **Modules** - 21 building blocks

---

## CHIASTIC STRUCTURE

### Weekly Pattern (Days 1-5)

```
Day 1 (A):  INTRODUCTION
            Hook the reader, establish theme

Day 2 (B):  BUILDING
            Context, background, growing tension

Day 3 (C):  THE PIVOT ⭐
            Core theological revelation
            The "aha moment"
            What everything points to

Day 4 (B'): APPLICATION
            Living it out, practical response
            Mirrors Day 2's concepts

Day 5 (A'): RESOLUTION
            Send off, commitment, hope
            Echoes Day 1's opening
```

### Daily Pattern (Within Each Day)

```
Opening (A):   Scripture + Hook
Building (B):  Context + Teaching
Center (C):    KEY INSIGHT ⭐
Response (B'): Reflection + Application
Closing (A'):  Prayer + Takeaway
```

### Example: "Too Busy for God"

```
Day 1 (A):  "The Vanity of Busyness"
            Opens with: Ecclesiastes 1:2 - "Meaningless!"

Day 2 (B):  "The Tyranny of the Urgent"
            Builds: How busyness becomes idolatry

Day 3 (C):  "Sacred Rest" ⭐
            PIVOT: Sabbath isn't laziness—it's trust
            Jesus says "Come to me, all who are weary"

Day 4 (B'): "Reordering Priorities"
            Application: Practical steps to create margin

Day 5 (A'): "Entering the Rest"
            Resolution: Commitment to rhythms of rest
            Echoes opening: Meaningless → Meaningful
```

---

## PaRDeS FRAMEWORK

Four layers of interpretation (from Jewish hermeneutics):

| Level | Hebrew | Meaning       | In Practice                                          |
| ----- | ------ | ------------- | ---------------------------------------------------- |
| **P** | Peshat | Plain/Surface | "What does the text literally say?"                  |
| **R** | Remez  | Hint          | "What does this point to? (typology, foreshadowing)" |
| **D** | Derash | Search        | "What does this teach? (theology, doctrine)"         |
| **S** | Sod    | Secret        | "What's the deeper mystery? (hidden wisdom)"         |

### Example: Genesis 22 (Abraham & Isaac)

```
P (Peshat):  Abraham is asked to sacrifice Isaac
             He obeys, God provides a ram

R (Remez):   Points forward to Jesus
             Father sacrificing Son
             "God will provide the lamb"

D (Derash):  Teaches about faith and obedience
             Trust even when you don't understand

S (Sod):     The mountain is Moriah (future Temple site)
             "On the mountain of the LORD it will be provided"
             2000 years later, Jesus dies there
```

### Implementation

PaRDeS is woven throughout, not labeled explicitly:

```json
{
  "type": "teaching",
  "data": {
    "content": "...",
    "pardes_layer": "derash", // Internal tracking only
    "pardes_connection": "Connects to remez in Day 2"
  }
}
```

---

## MODULE SYSTEM (21 Types)

### Content Modules (18)

#### 1. Scripture

Primary Bible passage.

```json
{
  "type": "scripture",
  "data": {
    "reference": "Ecclesiastes 1:2-3",
    "translation": "NIV",
    "text": "\"Meaningless! Meaningless!\" says the Teacher...",
    "emphasis": ["Meaningless"],
    "display": "block" // "block" | "inline"
  }
}
```

#### 2. Teaching

Main theological content.

```json
{
  "type": "teaching",
  "data": {
    "content": "Markdown content here...",
    "pardes_layer": "derash"
  }
}
```

#### 3. Vocab

Hebrew/Greek word study.

```json
{
  "type": "vocab",
  "data": {
    "language": "hebrew",
    "word": "הֶבֶל",
    "transliteration": "hevel",
    "pronunciation": "HEH-vel",
    "strongs": "H1892",
    "definition": "Vapor, breath, vanity",
    "root_meaning": "Something that disappears quickly",
    "usage_note": "Used 38 times in Ecclesiastes",
    "related_verses": ["Ecclesiastes 1:2", "Psalm 39:5"]
  }
}
```

#### 4. Story

Real-world narrative illustration.

```json
{
  "type": "story",
  "data": {
    "title": "The Executive's Breakdown",
    "content": "Story text here...",
    "source": "Based on true events",
    "connection": "Shows how busyness can mask emptiness"
  }
}
```

#### 5. Insight

Quick "aha" moment.

```json
{
  "type": "insight",
  "data": {
    "text": "Sabbath isn't about what you stop doing—it's about Who you start trusting.",
    "attribution": null
  }
}
```

#### 6. Chronology

Timeline context.

```json
{
  "type": "chronology",
  "data": {
    "title": "When Did Solomon Write Ecclesiastes?",
    "events": [
      { "date": "970 BC", "event": "Solomon becomes king" },
      { "date": "930 BC", "event": "Ecclesiastes likely written (late reign)" }
    ],
    "note": "Written after experiencing 'everything under the sun'"
  }
}
```

#### 7. Geography

Location context.

```json
{
  "type": "geography",
  "data": {
    "title": "Jerusalem in Solomon's Day",
    "location": "Jerusalem, Israel",
    "significance": "Center of worship, commerce, and royal power",
    "map_url": null,
    "description": "Solomon's Jerusalem was the wealthiest city in the ancient Near East..."
  }
}
```

#### 8. Profile

Person/character study.

```json
{
  "type": "profile",
  "data": {
    "name": "Qoheleth (The Teacher)",
    "title": "The Preacher",
    "era": "10th century BC",
    "key_trait": "Searcher who found emptiness in everything except God",
    "summary": "Traditionally identified as Solomon..."
  }
}
```

#### 9. Bridge

Ancient↔Modern connection.

```json
{
  "type": "bridge",
  "data": {
    "ancient": "Solomon had 700 wives, untold wealth, and every pleasure",
    "modern": "Today we chase followers, promotions, and experiences",
    "connection": "Both lead to the same conclusion: 'Meaningless!'",
    "question": "What are you chasing that can't satisfy?"
  }
}
```

#### 10. Visual

Diagram or infographic.

```json
{
  "type": "visual",
  "data": {
    "title": "The Chiastic Structure of Day 1",
    "type": "diagram",
    "image_url": "/images/diagrams/chiasm-day1.svg",
    "alt_text": "Diagram showing A-B-C-B'-A' structure",
    "caption": "Notice how the ending mirrors the beginning"
  }
}
```

#### 11. Art

Photography or fine art.

```json
{
  "type": "art",
  "data": {
    "image_url": "/images/art/morning-light.jpg",
    "alt_text": "Morning light streaming through window",
    "caption": "Even in the mundane, glory breaks through",
    "credit": "Photo by [artist]"
  }
}
```

#### 12. Voice

Audio content.

```json
{
  "type": "voice",
  "data": {
    "audio_url": "/audio/prayer-day1.mp3",
    "title": "Closing Prayer (Audio)",
    "duration": "2:30",
    "transcript": "Father, we confess that we've made busyness our idol..."
  }
}
```

#### 13. Comprehension

Understanding check.

```json
{
  "type": "comprehension",
  "data": {
    "question": "What does 'hevel' literally mean?",
    "options": [
      { "text": "Sin", "correct": false },
      { "text": "Vapor/Breath", "correct": true },
      { "text": "Money", "correct": false }
    ],
    "explanation": "Hevel means vapor or breath—something that disappears quickly."
  }
}
```

#### 14. Reflection

Personal application question.

```json
{
  "type": "reflection",
  "data": {
    "question": "What activity fills your schedule but leaves you empty?",
    "prompt_text": "Take a moment to journal your thoughts...",
    "allow_save": true
  }
}
```

#### 15. Interactive

User engagement element.

```json
{
  "type": "interactive",
  "data": {
    "interaction_type": "slider",
    "prompt": "How often do you feel 'too busy' for God?",
    "options": ["Never", "Rarely", "Sometimes", "Often", "Always"],
    "follow_up": "Most people answer 'Often' or 'Always'. You're not alone."
  }
}
```

#### 16. Takeaway

Summary point.

```json
{
  "type": "takeaway",
  "data": {
    "title": "Today's Key Point",
    "text": "Busyness is the modern form of idolatry. When your schedule rules your heart, you've crowned the wrong king.",
    "action": "This week, block 30 minutes of 'unscheduled' time each day."
  }
}
```

#### 17. Resource

Further reading.

```json
{
  "type": "resource",
  "data": {
    "title": "Go Deeper",
    "items": [
      {
        "type": "book",
        "title": "The Ruthless Elimination of Hurry",
        "author": "John Mark Comer"
      },
      {
        "type": "video",
        "title": "Sabbath Overview",
        "source": "BibleProject",
        "url": "https://bibleproject.com/explore/video/sabbath/"
      }
    ]
  }
}
```

#### 18. Prayer

Closing prayer.

```json
{
  "type": "prayer",
  "data": {
    "title": "Closing Prayer",
    "text": "Father, forgive us for filling our lives with noise...",
    "scripture_echo": "Psalm 46:10"
  }
}
```

---

### Game Modules (3)

#### 19. Match

Pairing exercise.

```json
{
  "type": "match",
  "data": {
    "title": "Connect the Concepts",
    "pairs": [
      { "left": "Hevel", "right": "Vapor" },
      { "left": "Sabbath", "right": "Rest" },
      { "left": "Solomon", "right": "Ecclesiastes" }
    ]
  }
}
```

#### 20. Order

Sequencing exercise.

```json
{
  "type": "order",
  "data": {
    "title": "Put in Order",
    "items": [
      "Solomon becomes king",
      "Builds the Temple",
      "Accumulates wealth",
      "Writes Ecclesiastes"
    ],
    "correct_order": [0, 1, 2, 3]
  }
}
```

#### 21. Reveal

Progressive disclosure.

```json
{
  "type": "reveal",
  "data": {
    "title": "Uncover the Meaning",
    "layers": [
      { "label": "Peshat", "content": "Text says Abraham offered Isaac" },
      { "label": "Remez", "content": "Points to God offering Jesus" },
      { "label": "Derash", "content": "Teaches radical obedience" },
      { "label": "Sod", "content": "Location is where Jesus would die" }
    ]
  }
}
```

---

## MODULE RENDERING

### Dynamic Loader

```typescript
// components/ModuleRenderer.tsx
import { Scripture, Teaching, Vocab, Story, Insight, ... } from './modules';

const MODULE_MAP: Record<string, React.ComponentType<any>> = {
  scripture: Scripture,
  teaching: Teaching,
  vocab: Vocab,
  story: Story,
  insight: Insight,
  chronology: Chronology,
  geography: Geography,
  profile: Profile,
  bridge: Bridge,
  visual: Visual,
  art: Art,
  voice: Voice,
  comprehension: Comprehension,
  reflection: Reflection,
  interactive: Interactive,
  takeaway: Takeaway,
  resource: Resource,
  prayer: Prayer,
  match: Match,
  order: Order,
  reveal: Reveal,
};

export function ModuleRenderer({ module }: { module: Module }) {
  const Component = MODULE_MAP[module.type];

  if (!Component) {
    console.warn(`Unknown module type: ${module.type}`);
    return null;
  }

  return <Component {...module.data} />;
}
```

### Usage

```tsx
// In DailyBreadFeed.tsx
{
  day.modules.map((module, index) => (
    <section key={index} className="module-section">
      <ModuleRenderer module={module} />
    </section>
  ))
}
```

---

## SERIES JSON FORMAT

Complete series file structure:

```json
{
  "slug": "too-busy-for-god",
  "title": "Too Busy for God",
  "subtitle": "When Your Schedule Becomes Your Savior",
  "pathway": "sleep",
  "day_count": 5,
  "ecclesiastes_connection": "strong",
  "gospel_presentation": "moderate",
  "core_theme": "Recognizing busyness as idolatry and finding rest in God",
  "emotional_tones": ["overwhelmed", "anxious", "restless", "empty"],
  "life_circumstances": ["career stress", "overcommitment", "burnout"],
  "target_audience": ["professionals", "entrepreneurs", "busy parents"],
  "soul_audit_keywords": [
    "too busy", "no time", "exhausted", "overwhelmed",
    "hustle", "schedule", "stressed", "burned out"
  ],
  "days": [
    {
      "day_number": 1,
      "title": "The Vanity of Busyness",
      "chiasm_position": "A",
      "modules": [
        { "type": "scripture", "data": { ... } },
        { "type": "vocab", "data": { ... } },
        { "type": "teaching", "data": { ... } },
        { "type": "bridge", "data": { ... } },
        { "type": "reflection", "data": { ... } },
        { "type": "prayer", "data": { ... } }
      ]
    },
    { "day_number": 2, ... },
    { "day_number": 3, ... },
    { "day_number": 4, ... },
    { "day_number": 5, ... }
  ]
}
```
