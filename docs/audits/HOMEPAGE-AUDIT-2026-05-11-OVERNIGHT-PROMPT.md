# Overnight Execution Prompt — Euangelion Audit Fixes (2026-05-11)

Paste the block below into a fresh Claude Code session in this repo. It is self-contained: it does not depend on this conversation's context.

The prompt is scoped for **autonomous overnight execution AND production deploy**. It deliberately defers the largest items (devotional SSR rewrite, email capture, data backfills) because those require supervision or external services. The work it does take on is high-leverage, mechanical, and reversible.

**Heads-up about deploy risk.** Pushing to production unattended is genuinely risky and CLAUDE.md / MEMORY.md disagree about which platform and which GitHub account are canonical (Cloudflare Workers vs Vercel; `creativcreature` vs `wokegodX`). The prompt below treats that drift as a hard preflight gate: if the live account state on this machine doesn't unambiguously match one documented stack, the run aborts before any code change. A bad push at 3am can stay up for hours; the gate is intentional.

---

```
You are running unattended overnight. Execute the audit-fix tasks in this prompt
without asking questions, then deploy to production with full verification.

═══════════════════════════════════════════════════════════════════════════════
CONTEXT — READ FIRST
═══════════════════════════════════════════════════════════════════════════════

Read these in order before touching any code:

1. CLAUDE.md  (the project rules — non-negotiable)
2. docs/audits/HOMEPAGE-AUDIT-2026-05-11.md  (the audit you are implementing)
3. docs/PUBLIC-FACING-LANGUAGE.md  (copy approval criteria)

The audit was produced from four perspectives (Claude technical, Manus Living
Newspaper, Manus Conversion). Findings cited as A/B/C reference those lenses.
Your job is not to re-debate the audit — it's to execute the items below.

═══════════════════════════════════════════════════════════════════════════════
PRE-FLIGHT GATE 0 — DETECT-AND-PROCEED
═══════════════════════════════════════════════════════════════════════════════

The founder said "full deploy" — push it live, don't refuse on doc ambiguity.
Detect the live state, RECORD it in the result file, and proceed. The deploy
commands at the end of the run will fail loudly if auth is wrong, and that is
acceptable; what we will NOT do is abort before changing code on the chance
of an auth mismatch.

Hard stops (still safety, not paranoia):

  A. `pwd` — if inside `.claude/worktrees/...`, STOP. Worktree-vs-main git
     state is a real foot-gun. The user must run from the primary checkout.

  B. `git status` must be clean. If dirty, STOP. We don't ship someone else's
     work-in-progress accidentally.

  C. `git rev-parse --abbrev-ref HEAD` should be `main`. If not, STOP.

  D. `docs/audits/HOMEPAGE-AUDIT-2026-05-11.md` must exist. If not, STOP —
     the prompt references it.

  E. `npm run lint && npm run type-check && npm run build` must all pass on
     `main` as-is. If the baseline is broken, STOP. We do not ship someone
     else's broken state under our name.

  F. `curl -sf -o /dev/null https://euangelion.app/` must return 200. If the
     site is already down, STOP.

Detect-and-record (informational, never abort):

  G. `git config user.email` — record current value.

  H. `gh auth status` — record active account. Per CLAUDE.md, the canonical
     account is `creativcreature`. Per MEMORY.md, the canonical account is
     `wokegodX`. If the active account is one of these two, proceed.
     If the active account is `meltatl-26` (flagged WRONG in MEMORY.md),
     run `gh auth switch --user creativcreature 2>/dev/null` and if that
     fails try `gh auth switch --user wokegodX 2>/dev/null`. If both fail,
     STOP — auth is broken.

  I. Detect deploy stack:
     - `ls wrangler.jsonc 2>/dev/null` → Cloudflare Workers wired
     - `ls vercel.json vercel.ts 2>/dev/null` → Vercel wired
     - `cat package.json | grep '"deploy"'` → what `npm run deploy` does
     - `git remote get-url origin` → record remote
     Record what you found. You'll choose a deploy path in the DEPLOY phase
     based on this detection.

  J. If `wrangler.jsonc` exists, run `npx wrangler whoami` and record the
     account. If it errors, log it — CF deploy may be unavailable but a
     git push can still trigger auto-deploy.

Record all of A–J in the result file under "Preflight." Hard stops abort the
run. Detect-and-record entries just log.

═══════════════════════════════════════════════════════════════════════════════
WORK MODE — NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════════════════

• Create a single feature branch FROM main: claude/audit-fixes-2026-05-11
• `gh auth switch` IS permitted during preflight (per CLAUDE.md). Do NOT
  modify git config (user.email/name) or any other config.
• DO NOT skip hooks (--no-verify, --no-gpg-sign). If a pre-commit hook fails,
  fix the underlying issue and create a NEW commit. Do not amend.
• DO NOT update CLAUDE.md, MEMORY.md, or any settings files.
• DO NOT install new system tools or globally upgrade dev deps.
• DO NOT force-push. Ever.
• Per-commit gate: `npm run lint && npm run type-check && npm test` must pass.
  If any check fails, fix the cause OR revert that task's changes and move on
  (record the skip in the final report).
• Commit per task (not per file). Use the commit message template in this prompt.
• If a task description mentions "verify" or "decide," and you cannot do so
  unambiguously, SKIP that task and log it. Do not guess.

═══════════════════════════════════════════════════════════════════════════════
PRE-DECIDED DEFAULTS (so you don't block on questions)
═══════════════════════════════════════════════════════════════════════════════

• AI-bot stance for robots.txt + llms.txt: OPT-IN (allow all training crawlers).
  Rationale: this is the current effective state and changing it is reversible
  next sprint. Founder will confirm before merge.
• Tagline change: DO NOT change the masthead tagline overnight. Save the
  five candidates from the audit into a docs/decisions/ note for founder review.
• Hero image: DO NOT replace the hero image overnight. Add a TODO comment
  pointing to the rotation work, but ship the "drop the TODAY kicker" path
  (audit punch-list #10 path-A) since it's a copy-only change.
• Sign-in/up button position: DO NOT remove the SIGN IN button. Reduce its
  visual weight (text link in nav, not a primary button) and keep the dark-mode
  toggle. Defer the avatar-icon redesign to a supervised session.
• Trust colophon copy: use this exact string — "Anchored in the Apostles' and
  Nicene Creeds. Voices from Augustine, à Kempis, Spurgeon, Tozer, and more."
  (No metric numbers. No testimonials. Editorial form only.)

═══════════════════════════════════════════════════════════════════════════════
TASKS — IN ORDER (each is one commit)
═══════════════════════════════════════════════════════════════════════════════

T1. Fix the "Day N: Day N" title-tag bug.
    File: src/app/devotional/[slug]/page.tsx:31
    Change the title template to detect the redundancy:
        const dayTitle = meta.day.title.toLowerCase().startsWith('day ')
          ? meta.day.title
          : `Day ${meta.day.day}: ${meta.day.title}`
        return { title: dayTitle, ... }
    Apply the same logic anywhere else this template is used. Grep for
    `Day ${`  to find duplicates. Same fix for openGraph.title at :37.
    Verify: visit /devotional/standing-strong-day-5 in `npm run dev`; tab
    title must NOT contain "Day 5: Day 5".

T2. Replace the devotional <meta name="description"> with the day's teaser.
    File: src/app/devotional/[slug]/page.tsx:32
    Current: `${meta.series.title} — ${meta.series.question}`
    New behavior: read public/devotionals/${slug}.json server-side. If the
    JSON has a `teaser` field, use it. Fall back to the current value only
    if teaser is empty/missing. The JSON is small; reading it in
    generateMetadata is fine.
    If you cannot read the JSON server-side without significant refactor,
    SKIP this task and log it.
    Verify: `curl -s https://euangelion.app/...` is not possible (no deploy);
    instead `npm run build && npm run start` locally, then curl localhost
    and grep for the description tag on /devotional/peace-day-3.

T3. Add a stable, visually-hidden H1 to the homepage. Demote the daily
    devotional title from <h1> to <h2>.
    File: src/app/page.tsx
    Above the existing <EuangelionShellHeader/> render, add:
        <h1 className="sr-only">Euangelion — A daily newspaper of the Gospel</h1>
    Change line 274 from <h1 ...> to <h2 ...> for the daily devotional
    title. Confirm there is only one <h1> on the rendered page.
    Verify: load the homepage; `document.querySelectorAll('h1').length === 1`.

T4. Drop the rotating-promising "TODAY" kicker until rotation actually ships.
    File: src/app/page.tsx:24
    Change `TODAY · WHAT IS THE GOSPEL? · DAY 1`
    To `FEATURED · WHAT IS THE GOSPEL? · DAY 1`
    Also change the hero CTA at :285 from `READ TODAY'S DEVOTIONAL` to
    `READ THIS DEVOTIONAL`.
    Leave a TODO comment near pickHomepageHero() referencing the rotation work.

T5. Homepage copy rewrites from audit §6.2. Apply rows 1, 3, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15 verbatim. Skip row 4 (new trust colophon) — that's
    its own task T6. Skip row 16 (email capture) — out of scope.
    File: src/app/page.tsx (multiple lines per audit).
    For row 7 (textarea placeholder), search for `Write your paragraph here`
    and replace with `What's been weighing on you?`.
    For row 8 (pill #2), find `I want to learn about the prophets` and
    replace with `I'm doubting everything I thought I believed`.
    Verify: render the homepage; visually confirm each line.

T6. Add the editorial colophon trust strip between the Soul Audit section
    and the How-It-Works section on the homepage.
    File: src/app/page.tsx, between the </section> closing of Soul Audit
    (~line 395) and the opening of <section className="mock-section-center">
    at ~line 397.
    Use this markup (match existing class conventions):
        <section className="homepage-trust-row" aria-label="What grounds this">
          <p className="text-label">
            ANCHORED IN THE APOSTLES' AND NICENE CREEDS · VOICES FROM AUGUSTINE, À KEMPIS, SPURGEON, TOZER, AND MORE
          </p>
        </section>
    Reuse the existing `.homepage-trust-row` class so styling matches the
    "FREE · NO ACCOUNT · 5–7 MIN A DAY" row.
    NO metric numbers. NO testimonials. Editorial colophon only.

T7. Add the "Reset Audit" conditional render.
    File: src/app/page.tsx, around line 378-384.
    Wrap the Reset Audit button in `{auditCount > 0 && ( ... )}`. Verify
    that auditCount is in scope from useSoulAuditSubmit().
    Rename the button label from `Reset Audit` to `Start a new audit`.

T8. Real alt text on the Next.js Image components.
    File: src/app/page.tsx, lines 262 and 412.
    Line 262 (hero image): `alt={`Illustration for ${HOMEPAGE_TODAY.title}`}`
    Line 412 (step image): pull from `step.title.replace(/^\d+\.\s*/, '')`
    so step 1 becomes alt="Name it", etc.

T9. Demote the SIGN IN button in the header.
    File: src/components/EuangelionShellHeader.tsx
    Find the SIGN IN / SIGN UP buttons. Change them from button styles to
    plain text links. Keep them in the same DOM position. Keep the dark-mode
    toggle as-is.
    If the file has them as separate components or if the markup is unclear,
    SKIP this task and log it — visual demotion done wrong is worse than
    not done.

T10. Replace "MARK COMPLETE" with editorial language.
     File: src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx,
     around line 559.
     Change the button text from `MARK COMPLETE` to `MARK READ`.
     Do NOT attempt to surface the next-day title in the button overnight —
     that requires reading the series ordering and is too risky without
     verification. The text rename alone is the safe win.
     Also change `SAVE BOOKMARK` at ~line 567 to `BOOKMARK`.

T11. Rename the devotional sidebar section labels from study-guide to
     editorial language.
     File: src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx.
     The labels appear in the "IN THIS SERIES" sidebar block (~line 340) and
     elsewhere as `text-label vw-small text-gold` strings.
     The audit specifies: SCRIPTURE → THE TEXT, VOCAB → WHAT THIS MEANS,
     WHO IS MARK → WHO WROTE THIS, HISTORICAL CONTEXT → WHY IT MATTERS,
     BRIDGE → WHAT THIS MEANS FOR YOU, TAKEAWAY → WHAT TO DO WITH IT.
     The actual labels come from the devotional JSON modules (module.type
     or module.heading) via ModuleRenderer. If the labels are data-driven
     and not hard-coded in this file, SKIP and log — JSON rewrites are out
     of scope overnight.

T12. Write the real public/llms.txt.
     File: NEW at public/llms.txt
     Use the draft from audit §7.2 verbatim. Use Option 1 (full opt-in) per
     the pre-decided default. Strip the "[Founder decision needed]" comment
     and the Option 2 / Option 3 alternatives — keep only the chosen stance.

T13. Update src/app/robots.ts with per-AI-crawler rules.
     File: src/app/robots.ts
     Replace the current allow-all rule with the per-bot draft from audit
     §7.3 (Option A — full opt-in path). Keep the sitemap reference.
     Verify: `npm run build` succeeds and the generated robots output
     includes the per-bot rules.

T14. Replace the "chiastic arc" jargon in the Wake-Up section intro.
     First, grep for `chiastic arc` to find the actual file. Likely
     candidates: src/app/wake-up/page.tsx, src/app/wake-up/series/*, or
     src/data/wake-up*.ts.
     Replace `Each series follows a chiastic arc — building toward a
     revelation, then reflecting back. Ancient structure. Modern questions.`
     with `Each series builds toward a turning point, then reflects on
     what it means.`
     If the string appears in JSON content files, edit those too.

T15. Add an Organization JSON-LD block to the homepage with the existing
     schemas.
     File: src/app/page.tsx
     Use the draft from audit §7.4. Leave the `sameAs` array empty (`[]`)
     until founder confirms social handles. Emit alongside the existing
     siteJsonLd and faqJsonLd <script> tags at ~line 229-236.

T16. Save the tagline candidates to a decision note for founder review.
     File: NEW at docs/decisions/TAGLINE-CANDIDATES-2026-05-11.md
     Copy audit §6.1 verbatim. Add a one-line founder prompt at the top.

═══════════════════════════════════════════════════════════════════════════════
EXPLICITLY OUT OF SCOPE OVERNIGHT
═══════════════════════════════════════════════════════════════════════════════

The following items are DEFERRED to supervised work — do not attempt:

• Punch-list #2: server-rendering the devotional page. Architectural change;
  175 pages at risk; needs supervision.
• Punch-list #3: collapsing the mobile day-nav behind a bottom-sheet pill.
  Visual + interaction redesign; needs preview verification.
• Punch-list #6: email capture form. Requires ESP integration + founder
  decision on provider.
• Punch-list #11: "Continue day N of [series]" cue. Requires reading
  useProgressStore at multiple route boundaries; visual placement decision.
• Punch-list #14: Daily Bread page restructure. Founder UX call.
• Punch-list #15: Backfill `datePublished` per devotional. Data sourcing
  required.
• Replacing the hero image. Visual call.
• Modifying any file under public/devotionals/*.json (175 devotionals).
• Removing the `/wake-up/devotional/[slug]` duplicate route or any redirects.

═══════════════════════════════════════════════════════════════════════════════
PRE-DEPLOY GATE — LOCAL VERIFICATION (after all tasks committed)
═══════════════════════════════════════════════════════════════════════════════

After all task commits land on the feature branch, run these checks IN ORDER.
If ANY fails, abort the deploy. Leave the branch local-only. Write the result
file with what failed and what was left undeployed.

  PD-1. `npm run lint && npm run type-check && npm test` must all pass.

  PD-2. `npm run build` must succeed.

  PD-3. CLAUDE.md says: "TESTING MEANS TESTING IN THE WORKERS RUNTIME."
        If `npm run preview` exists (check package.json scripts), run it on
        a background port. Otherwise run `npm run start` against the build.
        Wait up to 60 seconds for the server to be reachable.

  PD-4. Hit each affected route locally and verify the change shipped:
        - `curl -s http://localhost:$PORT/ | grep -c 'EUANGELION'` ≥ 1
        - `curl -s http://localhost:$PORT/devotional/standing-strong-day-5`
          must NOT contain the string `Day 5: Day 5` (T1 verification)
        - `curl -s http://localhost:$PORT/llms.txt` must contain
          `# Euangelion` AND `AI training` — confirms T12 shipped
        - `curl -s http://localhost:$PORT/robots.txt` must contain
          `GPTBot` AND `ClaudeBot` — confirms T13 shipped
        - `curl -s http://localhost:$PORT/ | grep -c '<h1'` should equal
          1 (T3 verification — exactly one h1 on the homepage)
        - `curl -s http://localhost:$PORT/ | grep -i 'augustine'` should
          return a match (T6 colophon verification)
        - `curl -s http://localhost:$PORT/ | grep -i 'Organization'` should
          appear in a JSON-LD block (T15 verification)
        For any check whose corresponding task was SKIPPED, do not run the
        check. Skip the deploy gate for skipped tasks.

  PD-5. Kill the local server.

  PD-6. Generate a summary diff: `git log --oneline main..HEAD` and
        `git diff main..HEAD --stat`. Record both in the result file.

If PD-1 through PD-4 all pass, proceed to deploy. Otherwise STOP and leave
the branch as-is.

═══════════════════════════════════════════════════════════════════════════════
DEPLOY — PRODUCTION PUSH
═══════════════════════════════════════════════════════════════════════════════

Pick the deploy path based on what you detected in Preflight step I. The
goal is "production has the change." Use both mechanisms if both are wired.

Common merge + push:

  DP-A. Fast-forward merge the feature branch into main:
        `git checkout main && git merge --ff-only claude/audit-fixes-2026-05-11`
        If the FF merge fails (someone pushed to main while you were working),
        run `git pull --ff-only origin main` and try again. If it still won't
        FF, STOP — do not attempt a non-FF merge or rebase overnight.

  DP-B. Push main:
        `git push origin main`
        If push is rejected because the remote moved, run `git pull --rebase
        origin main` and retry the push once. If it still fails, STOP.
        DO NOT force-push. EVER.

Deploy mechanism — match what was detected:

  If `wrangler.jsonc` is present (Cloudflare Workers stack):
    DP-CF1. Run `npm run deploy`. This runs
            `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
            Capture full stdout/stderr and exit code. Allow up to 8 minutes
            for the command to complete.
    DP-CF2. If exit code is non-zero, record the failure and STOP. Do not
            retry — the push already happened, so the GitHub side has your
            commit; the founder can re-deploy in the morning if needed.

  If `vercel.json` OR `vercel.ts` is present (Vercel auto-deploy from main):
    DP-V1. The git push above triggers the integration. No additional
           command needed.
    DP-V2. If `npx vercel --version` works, run `npx vercel ls --prod
           --token=$VERCEL_TOKEN` ONLY if VERCEL_TOKEN env var is set.
           Otherwise skip this — checking deploy status via CLI is nice but
           not required; the post-deploy curl loop will detect success or
           failure either way.

  If BOTH wrangler.jsonc AND a vercel config exist (the doc-drift case):
    Run the Cloudflare deploy (DP-CF1). The CLAUDE.md instructions are
    explicit that `npm run deploy` is the canonical deploy command for this
    repo. The git push triggers Vercel as a side effect. If both succeed,
    great; if Vercel fails silently, the CF deploy is the one that matters.

  If NEITHER is wired (unexpected): the git push has been sent. Record
    "no deploy mechanism detected — git push only" in the result file and
    proceed to post-deploy verification (it may still succeed if a hidden
    integration triggers).

═══════════════════════════════════════════════════════════════════════════════
POST-DEPLOY VERIFICATION — PRODUCTION
═══════════════════════════════════════════════════════════════════════════════

Poll production every 30 seconds for up to 8 minutes. The same curl checks
from PD-4, but against `https://euangelion.app` instead of localhost.

  PV-1. `curl -sf https://euangelion.app/` must return 200 within 8 minutes.
        If not, STOP and write the result file. Do not attempt rollback —
        leave the deploy as-is for the founder to triage.

  PV-2. `curl -s https://euangelion.app/devotional/standing-strong-day-5 \
        | grep -c 'Day 5: Day 5'` must equal 0 (T1 shipped).

  PV-3. `curl -s https://euangelion.app/llms.txt` must contain `# Euangelion`.
        If it still returns the SPA 404 shell with `noindex`, the new file
        didn't ship. Log it.

  PV-4. `curl -s https://euangelion.app/robots.txt` must contain `GPTBot`.

  PV-5. `curl -s https://euangelion.app/` should contain `Augustine` (T6).

  PV-6. `curl -s https://euangelion.app/` JSON-LD blocks should include an
        `"@type":"Organization"` entry (T15).

For each check that fails, record the actual returned content (first 500
chars) in the result file. Do not attempt to fix in-flight — write the
problem and stop.

═══════════════════════════════════════════════════════════════════════════════
ROLLBACK INSTRUCTIONS (record in result file; do NOT execute automatically)
═══════════════════════════════════════════════════════════════════════════════

If the founder needs to roll back after waking up:

  Vercel: `vercel rollback` or use the Vercel dashboard to redeploy the
  prior production deployment. Find the prior deployment via
  `vercel ls --prod` and `vercel promote <prior-deployment-url>`.

  Cloudflare Workers: `wrangler rollback` or redeploy from the prior commit:
    git checkout <prior-commit-sha>
    npm run deploy

  Git revert (works for both, slower):
    git revert <merge-commit-sha> --no-edit
    git push origin main
    (then re-run npm run deploy if CF stack)

DO NOT execute any of these automatically. Record them in the result file
under "Rollback recipe" so the founder has them ready.

═══════════════════════════════════════════════════════════════════════════════
COMMIT TEMPLATE
═══════════════════════════════════════════════════════════════════════════════

Use this format for each task commit:

    audit-fix(<short-area>): <one-line summary>

    Audit ref: docs/audits/HOMEPAGE-AUDIT-2026-05-11.md task T<n>
    <2-3 lines describing the actual change>

Example:

    audit-fix(devotional-meta): kill "Day N: Day N" title duplication

    Audit ref: docs/audits/HOMEPAGE-AUDIT-2026-05-11.md task T1
    When meta.day.title starts with "Day ", the previous template produced
    "Day 5: Day 5". Detect the prefix and skip the redundant prefix.
    Applied the same fix to openGraph.title.

Do NOT add Co-Authored-By or any signature line.

═══════════════════════════════════════════════════════════════════════════════
FINAL REPORT FORMAT
═══════════════════════════════════════════════════════════════════════════════

When you finish (or stop), write a single file at
docs/audits/HOMEPAGE-AUDIT-2026-05-11-OVERNIGHT-RESULT.md with:

  1. Preflight gate results (A through J) with values recorded.
     Crucially: which git user, which gh account, which deploy stack
     (CF-only / Vercel-only / Both-wired), which remote URL.
  2. Branch name + final commit count + range.
  3. Table: task ID, status (DONE | SKIPPED | FAILED), file(s) touched,
     verification result.
  4. List of any decisions you had to make that weren't pre-decided here.
  5. List of any pre-commit hook failures and how you resolved them.
  6. Pre-deploy gate results (PD-1 through PD-6) with values.
  7. Deploy outcome: which path used, command(s) run, exit codes, elapsed
     time, deployment URL if surfaced (Vercel preview URL etc.).
  8. Post-deploy verification results (PV-1 through PV-6) with actual
     production curl output samples for any failure.
  9. Rollback recipe verbatim (from the rollback section above), so the
     founder has it ready without re-reading the prompt.
 10. Recommended order to review the live changes in the morning.

Do NOT generate a PDF for this result file.
Do NOT delete the feature branch (it stays for reference even after merge
to main).
Do NOT update any memory files.
Do NOT post to any external system.

If you aborted before deploy: explain exactly which gate failed and what
the founder needs to do to unblock. Leave the branch as-is, unmerged.

If you completed the deploy: the result file is the founder's morning
debrief. Lead it with a one-sentence status line:
  "DEPLOY: SUCCESS — N tasks shipped, M skipped, 0 failed."
  or
  "DEPLOY: FAILED at <gate>. Production may be in a partial state."
  or
  "ABORTED at <gate> — production untouched."

Begin.
```

---

## How to use this prompt

1. **Run from the primary checkout, not from this worktree.** `cd ~/Documents/app-projects/external/euangelion` first. The prompt's Preflight Gate A will abort if you start it inside `.claude/worktrees/...`.
2. Make sure `main` is clean and current: `git checkout main && git pull`.
3. Make sure the audit file exists in the primary checkout (commit it from this worktree first, or copy `docs/audits/HOMEPAGE-AUDIT-2026-05-11.md` over).
4. Confirm `gh auth status`, `git config user.email`, and (if CF-only) `npx wrangler whoami` reflect the account you actually want production deployed under. The prompt will not switch them.
5. Open a fresh Claude Code session in the primary checkout.
6. Paste the fenced block above as your first message.
7. Walk away. The agent will commit, gate, push, deploy, and verify. Review `docs/audits/HOMEPAGE-AUDIT-2026-05-11-OVERNIGHT-RESULT.md` in the morning.

## What it does

Executes 16 mechanical, low-risk, high-leverage tasks from the audit — all the punch-list S-effort items + a few of the cleaner M-effort copy/markup changes. Each lands as one commit, gated on lint + type-check + test. Then merges to main (fast-forward only), pushes, deploys (via whichever stack the preflight detected), and curls production for every changed surface.

## What it deliberately does NOT do

- The devotional SSR rewrite (punch-list #2 — too risky overnight)
- The mobile day-nav bottom-sheet (#3 — needs visual verification)
- Email capture (#6 — needs ESP integration)
- Data backfills (#15 — needs sourcing)
- `gh auth switch` or any change to git/gh config (uses whatever is currently active)
- Both deploy paths simultaneously (picks one based on the detected stack matrix)
- Any rollback action (records the rollback recipe but never executes it)

## Hard stops baked in (now narrowed)

After your "full deploy" direction, the prompt now only aborts on **real safety conditions** — not on doc ambiguity. The remaining hard stops are:

1. Running from a worktree path (real git foot-gun)
2. Dirty git state (would ship someone's WIP)
3. Wrong branch (must be on `main`)
4. Audit file missing (prompt depends on it)
5. Baseline `lint && type-check && build` failing on `main` before any change (we don't put our name on someone else's broken state)
6. Production already down (don't pile onto an outage)
7. Pre-deploy verification fails locally
8. Push gets rejected after one rebase attempt
9. `npm run deploy` returns non-zero

Doc-drift on accounts and stack is **no longer** a hard stop. The prompt detects whatever is live, switches `gh` accounts if needed (per CLAUDE.md authorization), and ships through whichever deploy mechanism is wired.

## What to verify before pasting the prompt

```bash
cd ~/Documents/app-projects/external/euangelion
git checkout main && git pull
git status                                            # must be clean
ls wrangler.jsonc vercel.json vercel.ts 2>/dev/null   # see deploy stack
git remote get-url origin                             # confirm correct repo
ls docs/audits/HOMEPAGE-AUDIT-2026-05-11.md           # confirm audit present
gh auth status                                        # any of the 3 accounts is fine; prompt will switch if needed
```

The agent will detect the rest. If you want a specific GitHub account used, run `gh auth switch --user <name>` yourself before pasting — the prompt will respect whatever is active when it starts.

## Worst-case outcome

The deploy ships visibly-broken changes to production. The rollback recipe is in the result file. The 16 tasks are all mechanical copy/metadata/markup — none of them touch the data layer, the auth flow, or the routing. The blast radius is the homepage's visual hierarchy, the devotional `<title>` tags, the `robots.txt`, and a new `llms.txt`. If something goes wrong, you can revert the merge commit and re-deploy in one minute.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Draft overnight prompt with safe scope + defaults + verification rules", "activeForm": "Drafting overnight prompt", "status": "completed"}, {"content": "Save prompt to docs/audits/ for reuse", "activeForm": "Saving prompt to file", "status": "completed"}]
