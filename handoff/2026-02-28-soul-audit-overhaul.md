# Soul Audit Overhaul — Running Handoff

**Purpose:** Context continuity document for the 7-phase Soul Audit overhaul.
**Last updated:** All 7 phases complete.

---

## All Phases Complete ✅

### Phase 1: Remove the LLM Bottleneck ✅

- **Submit route** (`src/app/api/soul-audit/submit/route.ts`): Rewrote from 702→302 lines. Replaced `generatePlanOutlines()` (LLM, 30-60s) with `buildAuditOptions()` (keyword scoring, <1s). Removed `maxDuration=120`, all LLM imports, `parseAuditIntentWithBrain()`. Strategy changed to `'curated_assembly'`.
- **Select route** (`src/app/api/soul-audit/select/route.ts`): Rewrote from 636→506 lines. Removed entire `ai_generative` code path. Only `ai_primary` (curated assembly) and `curated_prefab` paths remain.
- **Deleted 7 cascade infrastructure files** (~2,146 lines removed):
  - `src/app/api/soul-audit/generate-next/route.ts` (477 lines)
  - `src/app/api/soul-audit/generation-status/route.ts` (139 lines)
  - `src/lib/soul-audit/outline-generator.ts` (555 lines)
  - `src/lib/soul-audit/outline-cache.ts` (~100 lines)
  - `src/lib/soul-audit/generative-builder.ts` (795 lines)
  - `src/hooks/useGenerationStatus.ts` (~80 lines)
  - `__tests__/helpers/mock-outlines.ts` (test helper)
- **Results page**: Removed all cascade UI (generative progress, BUILDING states, pending skeletons).
- **Tests**: Updated 3 test files to expect `ai_primary` instead of `ai_generative`.

**Result:** Submit → options in <1s. Select → plan in <1s. Zero LLM calls.

### Phase 2: Extend to 7 Days ✅

- Extended `CHIASTIC_POSITIONS` to include `'Sabbath'` and `'Review'`
- Added `buildSabbathDay()`: synthesizes rest day from week's scripture references
- Added `buildReviewDay()`: synthesizes week summary with arc reflection
- Modified `buildCuratedFirstPlan()`: maps 5 devotional days + appends Sabbath (day 6) + Review (day 7)
- Added `dayType: 'devotional' | 'sabbath' | 'review'` to each plan day

### Phase 3: Module-Level Assembly ✅

- Added `buildModules()` function to `curated-builder.ts`
- Each devotional day now includes a `modules` array with 5-7 structured content blocks
- Module types: scripture, teaching, bridge (personalized), reflection, insight, prayer, takeaway
- Results page renders modules when present, falls back to flat fields for backward compatibility

### Phase 4: Deeper Organic Personalization ✅

- `personalizedBridge()`: Extended snippet 180→280 chars, added theological framing with scripture ref
- `personalizedPrayerLine()`: Extended snippet 120→200 chars, more intimate language
- `expandedJournalPrompt()`: Now accepts `userResponse`, adds thematic line connecting user's themes to scripture

### Phase 5: Repository Cleanup ✅

- **Types removed** from `soul-audit.ts`: `PlanOutline`, `PlanOutlinePreview`, `PlanDayOutline`, `GenerationStatusResponse`, `DayGenerationStatus`, `PlanType`, `CompositionReport`, `CustomDevotional`
- **Fields removed** from `CustomPlanDay`: `generationStatus`, `compositionReport`, `targetLengthMinutes`
- **Fields removed** from `SoulAuditSubmitResponseV2`: `slowGeneration`
- **Fields removed** from `SoulAuditSelectResponse`: `generationStatus`, `planType`
- **Fields removed** from `AuditOptionPreview`: `planOutline`
- **Flag removed** from `brain/flags.ts`: `outlineCacheEnabled`
- **Dead test mocks** removed from 3 test files (generative-builder mock blocks)
- **Kept** `ai_generative` in union types for backward DB compatibility

### Phase 6: Decompose Results Page ✅

- **Before:** 2281 lines in monolithic `results/page.tsx`
- **After:** 1580 lines in `results/page.tsx` + 7 focused components (31% reduction)
- **New components** in `src/components/soul-audit/`:
  - `AuditOptionCard.tsx` — single option card (large/small variants) with hero, keywords, CTA, reasoning
  - `AuditRerollSection.tsx` — reroll button + remaining count
  - `CrisisResourceBanner.tsx` — crisis acknowledgement gate with resource links
  - `GuestSignupGate.tsx` — signup/onboarding choice with sabbath, theme, text scale preferences
  - `PlanDayContent.tsx` — full article rendering (modules + flat fallback + endnotes + bookmark)
  - `PlanDayRail.tsx` — sidebar timeline with day buttons, section anchors, archive links
  - `SavedPathsList.tsx` — saved audit options with verse snippets + clean-up

### Phase 7: API Consolidation ✅

- **Before:** 7 soul-audit routes (root, submit, consent, select, current, reset, archive)
- **After:** 5 soul-audit routes
- **Deleted:**
  - `src/app/api/soul-audit/route.ts` (deprecated bridge)
  - `src/app/api/soul-audit/reset/route.ts` → merged into manage
  - `src/app/api/soul-audit/archive/route.ts` → merged into manage
- **Created:** `src/app/api/soul-audit/manage/route.ts` — GET (archive) + POST (reset)
- **Remaining routes:** submit, consent, select, current, manage
- All client callers updated (results page, soul-audit page, landing page, library rail, 5 test files)

---

## Final Metrics

| Metric                   | Before                | After                               |
| ------------------------ | --------------------- | ----------------------------------- |
| Submit → options latency | 30-60s (LLM)          | <1s (keyword scoring)               |
| Select → plan latency    | 60-120s (LLM per day) | <1s (curated assembly)              |
| LLM calls per audit      | 6-10                  | 0                                   |
| Plan days                | 5 (devotional only)   | 7 (5 devotional + Sabbath + Review) |
| Modules per day          | 0 (flat fields)       | 5-7 structured modules              |
| Results page lines       | 2281                  | 1580 (+ 7 components)               |
| Soul-audit API routes    | 7                     | 5                                   |
| Dead code removed        | ~2,500+ lines         | —                                   |
| Tests                    | 1045 passing          | 1045 passing                        |
| Type-check               | Clean                 | Clean                               |

---

## Environment Notes

- Worktree: `.claude/worktrees/lucid-benz/`
- Node 25 installed (build script gates at <25 — pre-existing)
- No `.env.local` in worktree (Supabase calls use in-memory fallbacks)
- Dev server runs on port 3333
- FadeIn components use GSAP/IntersectionObserver — don't animate in preview tool (content renders but opacity:0 until forced)

## Verification Commands

```bash
npx tsc --noEmit                    # Type-check ✅
npx vitest run                      # Tests (74 files, 1045 tests) ✅
npx eslint src/ --max-warnings=0    # Lint (3 pre-existing warnings)
npm run build                       # Build (blocked by Node 25 gate)
```
