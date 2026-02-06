# wokeGod External Asset Handling

**Version:** 1.0

## THE CHALLENGE

wokeGod doesn't control all images - sources include Substack embeds, user uploads, external links.

## ACCEPTANCE CRITERIA

### AUTO-ACCEPT

- Resolution: 1200px+ width
- File size: Under 5MB
- Formats: JPG, PNG, WebP
- Aspect ratio: 16:9, 3:2, 4:3, 1:1, 4:5
- Sharp, in-focus, passes style check

### FLAG FOR REVIEW

- Borderline quality
- Resolution 800-1200px
- Slightly off-brand but usable

### AUTO-REJECT

- Under 800px width
- Over 10MB
- Heavy compression/pixelated
- Modern clutter visible
- Completely off-brand

## PROCESSING PIPELINE

### Standard Treatment (ALL images):

1. Desaturate: -30%
2. Contrast: +15%
3. Vignette: 10% darkness, feathered
4. Grain: 5% (optional, film-like quality)
5. Sharpen: 40%, 1.0 radius

### Generate Responsive Sizes:

- 1920px (desktop hero)
- 1200px (standard desktop)
- 800px (mobile)
- WebP + JPG fallback

### Optimize:

- JPG quality: 80%
- WebP quality: 85%
- Strip EXIF data
- Progressive scan

## FALLBACK STRATEGY

When no good image available:

1. Subtle texture (paper/fabric, 15% opacity)
2. Solid color (Scroll White or Tehom Black)
3. Typography-only section (large pull quote/Hebrew term)

NEVER: Generic placeholders, stretched low-res, unrelated stock

## SUBSTACK CDN HANDLING

Images already embedded in devotional HTML:

1. Extract URL from <img> tag
2. Analyze (resolution, style fit)
3. Apply standard treatment
4. Cache processed version
5. Replace URL in output

## USER UPLOAD WORKFLOW

1. Check file specs
2. Run style assessment (AI or manual)
3. Auto-process if passing
4. Provide feedback if failing
5. Suggest curated alternatives

[See photography.md for complete guidelines]
