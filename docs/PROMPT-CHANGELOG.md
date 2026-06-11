# Soul Audit Prompt Changelog

Every revision to the prompts in `src/lib/soul-audit/grounded-weave.ts` must be
logged here with its eval delta. This is the contract that keeps prompt changes
honest: no prompt ships without showing what the eval suite says before and after.

---

## Procedure

1. **Before editing a prompt**, run the smoke suite and record baseline scores:

   ```bash
   RUN_SOULAUDIT_EVALS=1 ANTHROPIC_API_KEY=sk-ant-... \
     npx vitest run __tests__/soul-audit-evals/smoke.test.ts 2>&1 | tee /tmp/eval-before.txt
   ```

2. **Make the prompt change** in `src/lib/soul-audit/grounded-weave.ts`
   (functions: `systemPrompt`, `readingUserPrompt`, or `deepDiveUserPrompt`).

3. **Re-run the smoke suite** and record after scores:

   ```bash
   RUN_SOULAUDIT_EVALS=1 ANTHROPIC_API_KEY=sk-ant-... \
     npx vitest run __tests__/soul-audit-evals/smoke.test.ts 2>&1 | tee /tmp/eval-after.txt
   ```

4. **Run the crisis gate tests** (always required, no env vars needed):

   ```bash
   npx vitest run __tests__/soul-audit-evals/crisis.test.ts
   ```

5. **Add a row** to the changelog below. Include:
   - What changed (one sentence)
   - Rubric pass rate before and after (N/7 samples passing)
   - Verification pass rate before and after (N/7)
   - Any dimension that regressed (must be explained or the change is blocked)

6. **Commit the prompt file AND this changelog together** so the history is
   traceable. PR description must reference this changelog row.

---

## Rubric Dimensions (reference)

| ID  | Dimension             | What it checks                                                       |
| --- | --------------------- | -------------------------------------------------------------------- |
| A   | scripture_present     | `scriptureText` non-empty, `scriptureReference` set                  |
| B   | source_present        | At least one endnote with a non-empty `source`                       |
| C   | structure_conformance | Title + body 600-1200 words + prayer + ≥1 reflection question        |
| D   | situational_relevance | Body shares ≥3 content words with the reflection/theme (heuristic)   |
| E   | llm_voice_check       | Speaks directly / creedal anchor / no hollow clichés (STUB — opt-in) |

`overall` = A ∧ B ∧ C ∧ D (∧ E when E is wired and enabled).

Verification (`verification.ok`) is the closed-system guarantee: no ungrounded
author citations, no fabricated transliterations. It is checked separately from
the rubric.

---

## Changelog

| Date       | Prompt Function | Change Summary                                   | Rubric Before | Rubric After | Verification Before | Verification After | Notes                              |
| ---------- | --------------- | ------------------------------------------------ | ------------- | ------------ | ------------------- | ------------------ | ---------------------------------- |
| 2026-06-11 | _(baseline)_    | Initial eval harness created — no prompt changed | not run       | not run      | not run             | not run            | Baseline. Run smoke suite to seed. |

<!-- Template row (copy and fill in):
| YYYY-MM-DD | readingUserPrompt    | Short description of what changed                           | N/7 (A:N B:N C:N D:N) | N/7 (A:N B:N C:N D:N) | N/7              | N/7                | Why the change was made             |
-->

---

## Notes

- **Rubric scores are not a target — they are a guardrail.** A passing rubric does
  not mean the devotional is beautiful; it means it meets the minimum structural
  and grounding contract.
- **Dimension D (situational_relevance) is heuristic.** A score of 3/7 on this
  dimension alone is not a blocker if the failing cases are vague one-word
  reflections ("tired", "lost") — short inputs produce short content-word sets,
  making overlap hard to measure. Flag these in the Notes column, not as regressions.
- **Verification failures are hard blockers.** Any prompt revision that causes
  `verification.ok` to drop must be reverted or fixed before shipping.
- **The crisis gate is immutable.** Changes to `crisis-gate.ts` must maintain 100%
  detection on all crisis fixtures and 0% false trigger rate on safe fixtures.
  Run `npx vitest run __tests__/soul-audit-evals/crisis.test.ts` before any edit
  to that file and after. A regression blocks the PR.
