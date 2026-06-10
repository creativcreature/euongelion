# Reading Experience — Tranche 1: Review / Commit / Revert Guide

**Branch:** `reading-experience-overhaul` (your repo is currently on it)
**State:** changes are written to the working tree but **not committed** (the
sandbox couldn't write to `.git`). Nothing is on `main`. Nothing is deployed.

---

## 0. One-time cleanup (do this first)

A stale lock file was left by the pre-commit hook running in the sandbox. From
the repo root on your machine:

```bash
rm -f .git/index.lock
```

(If `git status` already works, you can skip this.)

---

## 1. See exactly what changed

```bash
git branch --show-current          # should print: reading-experience-overhaul
git status
git diff --stat HEAD               # files touched (ignore docs/AUDIENCE.md + package.json — pre-existing)
git diff HEAD                      # full line-by-line diff
```

**Files in this tranche**

| File                                                         | Change                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `src/components/daily-bread/DailyBreadView.tsx`              | real prev/next nav; no reload-on-complete; "Continue to Day N" |
| `src/app/api/bookmarks/route.ts`                             | anonymous (session-keyed) save/delete                          |
| `src/components/SavedList.tsx`                               | **new** — saved-content list UI                                |
| `src/app/saved/page.tsx`                                     | **new** — `/saved` route                                       |
| `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` | dead bookmarks link → `/saved`                                 |
| `src/app/api/soul-audit/select/route.ts`                     | archive prior active plan on new activation                    |
| `CHANGELOG.md`                                               | entry for this tranche                                         |

---

## 2. Verify before you trust it (I could not run these in-session)

The sandbox shell has a 45s limit, so I verified with `type-check` and `eslint`
only. Per your rules, run the real checks on your machine before any deploy:

```bash
npm run type-check     # expect: clean
npm run lint           # expect: no NEW errors (one pre-existing unused-var warning)
npm run build          # full Next build
npm run preview        # Workers runtime — then click through /daily-bread and /saved
```

Manual smoke test in `npm run preview`:

1. Activate a plan via Soul Audit → open `/daily-bread` → prev/next day buttons work, no full reload on "Mark Day Complete", "Continue to Day N" appears.
2. On a series devotional, tap **Save** → open `/saved` → it's listed → **Remove** works.
3. Activate a second plan → `/daily-bread` shows the new one (old one archived).

---

## 3. Commit it (recommended: one commit per concern, so you can scale back)

```bash
# A — reader nav/flow
git add src/components/daily-bread/DailyBreadView.tsx
git commit -m "Daily Bread: real day nav + remove reload-on-complete"

# B — saving + saved page
git add src/app/api/bookmarks/route.ts src/components/SavedList.tsx \
        src/app/saved/page.tsx src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx
git commit -m "Saving: anonymous bookmarks + /saved library route"

# C — activation hygiene
git add src/app/api/soul-audit/select/route.ts
git commit -m "Plan activation: archive prior active plan per session"

git add CHANGELOG.md docs/audits/
git commit -m "docs: reading-experience audit, plan, changelog"
```

---

## 4. Scale back / revert

**Discard everything, return to before this work:**

```bash
git checkout main          # leave the branch; your working tree is clean on main
# the branch still exists if you want to revisit it; delete with:
git branch -D reading-experience-overhaul
```

**Keep some, drop others (before committing):** revert a single file —

```bash
git checkout -- src/components/daily-bread/DailyBreadView.tsx   # undo just the reader changes
rm src/app/saved/page.tsx src/components/SavedList.tsx          # drop the saved page
```

**After committing, undo one concern:** `git revert <that commit hash>` — because
each concern is its own commit, you can remove B without touching A or C.

---

## 5. What is NOT in this tranche (intentionally)

- **Imagery activation** — blocked on your A/B/C aesthetic decision and the
  "exact, not random" rule. No image wiring was done.
- **Reader unification** (collapsing the 3 readers into 1) — higher risk;
  needs Workers-runtime testing before I'd touch routing.
- **Stickies/chat on Daily Bread, motion on Daily Bread, activities, video,
  the `DayContent` media contract** — staged for later phases in the plan.

These are safe to do next once you've confirmed tranche 1 feels right.
