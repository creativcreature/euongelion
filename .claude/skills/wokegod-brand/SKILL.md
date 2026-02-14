---
name: wokegod-brand
description: Use this skill when implementing visual direction, typography, spacing, iconography, animation behavior, and editorial UI styling for Euangelion.
---

# wokeGod Brand Skill

## When To Use

Use for:

- typography and type hierarchy decisions
- color/paper/ink palette implementation
- layout rhythm, spacing, borders, and newspaper shell styling
- motion treatment (subtle, reading-first interactions)
- icon and asset styling consistency

Do not use this skill for platform data-contract logic without `euangelion-platform`.

## Inputs To Confirm

1. Target page(s) and viewport scope (desktop/mobile).
2. Expected visual reference or approval baseline.
3. Any constraints (e.g., no generated images, no glow, no emojis).

## Progressive Disclosure References

Read only references required for the task:

1. `references/typography.md` for font system and type scale.
2. `references/colors.md` for palette and contrast.
3. `references/spacing.md` for rhythm and layout density.
4. `references/components.md` for reusable component treatments.
5. `references/responsive.md` for breakpoint behavior.
6. `references/animations.md` and `references/scroll-experience.md` for motion.
7. `references/accessibility.md` for WCAG checks.
8. `references/external-assets.md` when using any user-supplied assets.

## Implementation Workflow

1. Establish visual target and constraints from current docs/mockups.
2. Apply smallest cohesive styling pass across all affected pages/components.
3. Validate:
   - no horizontal overflow
   - readable type at smallest viewport
   - dark/light parity where required
   - interaction affordances are clear
4. Run verification:
   - `npm run type-check`
   - `npm run lint`
   - targeted UI/manual checks
5. Update `CHANGELOG.md` with exact scope.

## Guardrails

- No emoji-based iconography.
- Preserve established newspaper-shell structure unless explicitly changed.
- Keep body reading comfort first; avoid aggressive motion.
- Maintain AA contrast and keyboard/focus visibility.

## Optional Script Usage

If image-processing or illustration helper is explicitly requested:

```bash
python .claude/skills/wokegod-brand/scripts/brand_illustrator.py "<prompt>"
```

Only use generated assets when requested; otherwise prefer curated/user-provided assets.

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
