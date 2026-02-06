# wokeGod Brand Skill

**Version:** 1.0  
**Last Updated:** January 16, 2026

---

## PURPOSE

This skill enables Claude to automatically apply wokeGod brand guidelines to any content - generating illustrations, styling text, processing images, and creating cohesive visual experiences.

---

## QUICK START

### For Illustrations:

```bash
cd .claude/skills/brand-illustrator
python scripts/brand_illustrator.py "Devotional about finding rest in God"
```

### For Content Styling:

Claude will automatically read references and apply brand specs to any content you provide.

---

## SKILL STRUCTURE

```
brand-illustrator/
├── SKILL.md (this file)
├── references/
│   ├── colors.md ✅
│   ├── typography.md ✅
│   ├── photography.md ✅
│   ├── scroll-experience.md ✅
│   ├── spacing.md ✅
│   ├── external-assets.md ✅
│   ├── visual-world.md (user-provided)
│   ├── style.md (user-provided)
│   └── idea-mapping.md (user-provided)
├── scripts/
│   └── brand_illustrator.py ✅
└── assets/ (generated)
```

---

## HOW CLAUDE USES THIS SKILL

### 1. Content Analysis

**When user provides content:**

- Claude reads `idea-mapping.md` to determine theme
- Matches theme to visual concepts from `visual-world.md`
- Selects appropriate style from `style.md`

### 2. Image Generation Workflow

**Process:**

1. Analyze content theme
2. Generate 3 concept options (from visual-world + idea-mapping)
3. Wait for user selection
4. Craft detailed prompt incorporating:
   - Photography guidelines (Caravaggio style)
   - Color palette (muted, desaturated)
   - Composition rules (generous space)
5. Generate image (via API)
6. Apply post-processing (desaturate, contrast, vignette)
7. Save to dated project folder

**Script:** `scripts/brand_illustrator.py`

### 3. Typography Application

**When styling text content:**

- Apply Monument Grotesk (or fallback) from `typography.md`
- Use Kinfolk-style serif for "EUANGELION" masthead only
- Scale according to responsive specs
- Implement spacing from `spacing.md`
- Ensure WCAG contrast ratios

### 4. Image Treatment

**For external/uploaded images:**

- Check acceptance criteria from `external-assets.md`
- Apply standard treatment pipeline:
  - Desaturate -30%
  - Contrast +15%
  - Vignette 10%
  - Grain 5%
- Generate responsive sizes (1920px, 1200px, 800px)
- Compress (JPG 80%, WebP 85%)

### 5. Scroll Experience Implementation

**When building devotional layout:**

- Create full-viewport sections (from `scroll-experience.md`)
- Implement PaRDeS interaction layers
- Add scroll-triggered animations (fade + slide)
- Include Easter eggs (margin notes, hidden text)
- Ensure accessibility (keyboard nav, screen reader)

---

## BUILDER METHOD

### Quick Start for New Illustrations

1. **Gather Content:**

   ```bash
   # Claude receives content description
   "I need a hero image for a devotional about recognizing God in daily moments"
   ```

2. **Generate Concepts:**

   ```bash
   python scripts/brand_illustrator.py "recognizing God in daily moments"
   ```

   Output:

   ```
   Option 1: Morning light streaming through window onto simple breakfast table
   Option 2: Open eyes with light reflection, contemplative close-up
   Option 3: Doorway with warm light, threshold moment
   ```

3. **User Selects:**

   ```
   → Selected: Option 1
   ```

4. **Generate & Save:**
   - Crafts detailed prompt with brand guidelines
   - Generates image (via API)
   - Saves to `/mnt/user-data/outputs/brand-projects/illustration-YYYYMMDD-HHMMSS/`

---

## PROCESS WORKFLOWS

### Workflow 1: Content→Illustration

```
User Content
    ↓
Analyze Theme (idea-mapping.md)
    ↓
Suggest Objects/Scenes (visual-world.md)
    ↓
Generate 3 Concepts
    ↓
User Selects
    ↓
Craft Detailed Prompt (photography.md + style.md)
    ↓
Generate Image (API)
    ↓
Post-Process (external-assets.md)
    ↓
Save to Project Folder
```

### Workflow 2: Style Application

```
Raw Content (text, images)
    ↓
Apply Typography (typography.md)
    ↓
Process Images (photography.md + external-assets.md)
    ↓
Apply Spacing (spacing.md)
    ↓
Build Layout (scroll-experience.md)
    ↓
Output Styled Content
```

---

## REFERENCE PRIORITY

When multiple guidelines conflict, priority order:

1. **photography.md** - Visual style foundation
2. **colors.md** - Color palette is sacred
3. **typography.md** - Type scale and families
4. **spacing.md** - Breathing room non-negotiable
5. **style.md** - Overall aesthetic decisions
6. **visual-world.md** - Subject matter library
7. **idea-mapping.md** - Theme→visual logic

---

## AI-FIRST CONTENT: Processing Instructions

### Topic | Approach | Objects/Elements | Style | Tone

|-------|----------|------------------|-------|------|
| AI coding | Morning ritual builder with code | Laptop, monitor, window light | Builder's world | Calm, focused |
| AI as collaborator | Two perspectives merging | Desk setup, notebook + screen | Duet energy | Partnership |
| Prompt engineering | Conversation bubbles, chat UI | Chat interface, speech elements | Digital but warm | Clear, direct |
| When AI fails | Debugging scene | Crossed-out code, eraser, rework | Real, honest | Humble |
| Debugging | Detective work | Magnifying glass over code | Mystery solving | Curious |

(From idea-mapping.md - see full file for complete mapping)

---

## BRAND CONSISTENCY CHECKS

Before finalizing any output, verify:

- [ ] Colors match palette (Tehom Black, Scroll White, God is Gold dominant)
- [ ] Typography uses Monument Grotesk system (NOT multiple fonts)
- [ ] Images follow Caravaggio style (single-source lighting, dramatic)
- [ ] Spacing uses 8px grid (generous, never cramped)
- [ ] Hebrew terms isolated and prominent (gold, 28-32px)
- [ ] No modern clutter in images (phones, logos, screens)
- [ ] Contrast ratios pass WCAG 2.1 AA (4.5:1 minimum)
- [ ] Mobile-responsive (test at 320px, 768px, 1440px)

---

## TROUBLESHOOTING

### Problem: Generated image off-brand

**Solution:**

- Check prompt includes full photography guidelines
- Verify desaturation applied (-30%)
- Ensure "avoid modern objects" in negative prompt

### Problem: Typography too crowded

**Solution:**

- Apply spacing.md specs (80-120px section padding)
- Check line-height is 1.7 for body text
- Verify max-width is 680px for reading

### Problem: User image rejected

**Solution:**

- Check external-assets.md acceptance criteria
- Offer fallback options (texture, solid color, typography-only)
- Suggest curated stock alternatives

---

## MAINTENANCE

### When to Update References:

**colors.md** - Rarely (brand palette is foundational)  
**typography.md** - Only if changing fonts (major decision)  
**photography.md** - Rarely (Caravaggio style is timeless)  
**spacing.md** - Rarely (grid system is foundational)  
**scroll-experience.md** - Occasionally (interaction refinements)  
**external-assets.md** - Occasionally (acceptance criteria tweaks)

**visual-world.md** - Frequently (add new objects/scenes)  
**idea-mapping.md** - Frequently (add new content→visual mappings)  
**style.md** - Occasionally (style evolution)

---

## INTEGRATION WITH CLAUDE CODE

### Typical Claude Code Session:

```python
# User: "Generate an illustration for this devotional"

# Claude reads:
brand_refs = read_skill_references('brand-illustrator')

# Claude analyzes:
theme = analyze_content(user_devotional_text)
concepts = generate_concepts(theme, brand_refs)

# Claude presents options
# User selects

# Claude generates:
prompt = craft_prompt(selected_concept, brand_refs)
image = generate_image(prompt)  # API call

# Claude post-processes:
styled_image = apply_brand_treatment(image, brand_refs['photography'])

# Claude saves:
save_to_project_folder(styled_image, metadata)
```

---

## EXTERNAL API CONFIGURATION

### Image Generation (Choose One):

**Option A: Anthropic (Future)**

```python
import anthropic
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
# When image generation available
```

**Option B: Google Gemini**

```python
import google.generativeai as genai
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro-vision')
```

**Option C: OpenAI DALL-E**

```python
from openai import OpenAI
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
```

**Option D: Midjourney (via API wrapper)**

```python
# Requires third-party API wrapper
```

### Environment Variables:

```bash
export ANTHROPIC_API_KEY="your-key"
export GOOGLE_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

---

## SUCCESS METRICS

This skill is working correctly when:

✅ Generated images consistently match Caravaggio style  
✅ Typography never deviates from Monument Grotesk system  
✅ Colors stay within defined palette (no random bright colors)  
✅ Spacing feels generous (never cramped)  
✅ External images processed consistently  
✅ User can generate brand-consistent content without manual styling  
✅ Projects saved with complete metadata for iteration

---

## NEXT STEPS

### Phase 1 (MVP) - Current:

- [x] Core reference docs created
- [x] Brand illustrator script
- [ ] Test with real content
- [ ] Connect to image generation API

### Phase 2:

- [ ] Add component templates (pull quotes, Hebrew cards, etc.)
- [ ] Build email template system
- [ ] Create social media templates
- [ ] Expand visual-world library

### Phase 3:

- [ ] User-submitted content pipeline
- [ ] Automated quality checks
- [ ] A/B testing different visual treatments
- [ ] Analytics integration

---

## REFERENCES

**Internal:**

- See individual reference docs in `/references/`
- User-provided brand docs (visual-world, style, idea-mapping)

**External:**

- Tandem Co: https://www.thetandemco.com/
- Caravaggio paintings (Google Arts & Culture)
- Monument Grotesk: https://pangrampangram.com/
- SBL Hebrew: https://www.sbl-site.org/

---

**End of SKILL.md v1.0**

_This skill is a living system. Update references as the brand evolves._
