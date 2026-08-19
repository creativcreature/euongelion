#!/bin/bash
# The weekly series machine, cloud edition (SA-100 / F-146 revised).
# Runs inside .github/workflows/weekly-series.yml — see its header for the
# full contract. Machine-independent by design (founder, 2026-08-19: "This
# needs to work as well as the Daily Bread page — regardless of if this
# machine is on or not").
set -euo pipefail
STAMP="$(date -u +%Y-%m-%d)"
BRANCH="series/auto-$STAMP"
THEMATIC_FILE="/tmp/thematic-$STAMP.md"

# ── 1. Thematic: founder override (committed to the repo from any device),
#      or derived from research + last week's thread ──────────────────────
OVERRIDE_BODY="$(sed '/^<!--/,/^-->/d' content/next-series-thematic.md | sed '/^[[:space:]]*$/d' || true)"

if [ -n "$OVERRIDE_BODY" ]; then
  echo "[thematic] founder override present"
  printf '%s\n' "$OVERRIDE_BODY" > "$THEMATIC_FILE"
else
  echo "[thematic] deriving (research + last week's thread)"
  claude -p "Derive next week's devotional series thematic. METHOD: (1) Use WebSearch to survey what people are actually wrestling with in faith, church culture and spiritual life over roughly the last 30 days — communities, commentary, conversation; 4-6 searches, look for the human condition under the noise, not the news itself. (2) Read docs/run/ for the most recent SERIES-THEMATIC-*.md files and the newest entries in src/data/series.ts to know what LAST week's series was about. (3) Choose ONE thematic that is topical per the research AND continues last week's underlying human thread WITHOUT referencing it (series stand alone). Scripture-anchorable, pastoral not newsy — the news is the doorway, never the content. (4) Write to $THEMATIC_FILE exactly: the thematic in one sentence, a scripture spine candidate, the human condition it speaks to, and 3 sentences of rationale citing what the research surfaced. Write NOTHING else anywhere." \
    --allowedTools "WebSearch,WebFetch,Read,Write,Grep,Glob" --permission-mode acceptEdits
fi

[ -s "$THEMATIC_FILE" ] || { echo "[fatal] no thematic produced"; exit 1; }
echo "── thematic ──"; cat "$THEMATIC_FILE"; echo "──────────────"

if [ "${RUN_MODE:-full}" = "thematic-only" ]; then
  echo "[mode] thematic-only — stopping before the build"
  exit 0
fi

# ── 2. The build: full devo-go on a branch, PR as the reading gate ───────
git checkout -b "$BRANCH"
mkdir -p docs/run
cp "$THEMATIC_FILE" "docs/run/SERIES-THEMATIC-$STAMP.md"
# Reset the override file so next week starts clean (no-op when unused).
git checkout origin/main -- content/next-series-thematic.md || true

AUTOPUB_NOTE=""
if [ "${AUTO_PUBLISH:-}" = "true" ]; then
  AUTOPUB_NOTE="The founder's AUTO_PUBLISH repo variable is set: after the reading-gate artifact, continue through devo-go's remaining phases INCLUDING merge to main. Do not push to main directly — merge the branch via 'gh pr merge --merge --admin' after opening the PR."
fi

claude -p "Invoke the devo-go skill and execute it for next week's series, CLOUD CONSTRAINTS EDITION. THE THEMATIC is in $THEMATIC_FILE — read it first. THE FOUNDER'S STANDING ANSWERS to devo-go's Required Inputs are in scripts/devo-weekly/STANDING-BRIEF.md — read them; this run is unattended and those answers govern; never use AskUserQuestion. You are ALREADY on branch $BRANCH.

CLOUD CONSTRAINTS (these adapt the skill, they do not relax it):
- GROUNDING/VERIFICATION: use the committed public/reference-index.json, the committed lexicons, the committed BSB corpus, and WebSearch. The 13GB local library is not present here. Any claim, story or quote that cannot be verified from those sources is CUT — never shipped hedged (references/verification-standards.md governs).
- NARRATION: ElevenLabs founder voice per references/narration.md. ALWAYS the dry-run first; abort the narration phase (and say so in the gate artifact) if the dry-run cost exceeds the plan balance. python3 is 3.12 here; ffmpeg is installed.
- IMAGERY: use \`codex exec\` (headless Codex CLI, authenticated via ~/.codex/auth.json — the founder's ChatGPT subscription). Built-in image_gen ONLY, style anchors attached from public/images/site/series/, prompts assembled by the build scripts, NATIVE size per the standing 2026-08-16 ruling — no upscaling here, the founder upscales downstream. If codex auth is stale, FAIL the imagery phase loudly and note it in the gate artifact; do not substitute another generator (Nano Banana and Higgsfield are banned for this pipeline).
- START DAY: the Sunday after next Wednesday (SA-029 sabbath-first).
- COMMITS: on this branch only, hook-compliant (SA-100, F-146 citations, tracking-spine updates). NEVER touch main.

FINISH by: (1) writing the reading-gate artifact the skill prescribes, (2) pushing the branch, (3) opening a pull request titled 'Weekly series (reading gate): <series title>' whose body is the gate artifact content plus the thematic rationale — use \`gh pr create\`. $AUTOPUB_NOTE" \
  --allowedTools "Bash,Read,Write,Edit,Grep,Glob,Skill,Agent,WebSearch,WebFetch" --permission-mode acceptEdits

echo "[done] branch $BRANCH pushed; reading-gate PR opened"
