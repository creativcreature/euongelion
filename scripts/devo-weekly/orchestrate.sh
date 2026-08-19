#!/bin/bash
# The weekly series builder (SA-100 / F-146) — launchd entry point.
#
# Wednesdays after the founder's 5am ET Claude-quota reset: derive (or
# accept) the thematic, then run the full devo-go pipeline headless on the
# SUBSCRIPTION, producing next week's series on a branch up to the founder
# reading gate. ElevenLabs narrates (founder voice); Codex generates imagery
# via /imagen. Nothing merges or deploys without the founder.
#
# Manual run:            bash scripts/devo-weekly/orchestrate.sh
# Full-auto publish:     touch scripts/devo-weekly/AUTO_PUBLISH   (overrides
#                        the reading gate — founder's explicit switch)
set -uo pipefail
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="$HOME/Documents/app-projects/external/euangelion"
cd "$REPO"
STAMP="$(date +%Y-%m-%d)"
LOG="$REPO/logs/devo-weekly/$STAMP.log"
exec >>"$LOG" 2>&1
echo "════ devo-weekly $STAMP $(date) ════"

notify() {
  /usr/bin/osascript -e "display notification \"$1\" with title \"Euangelion weekly series\"" || true
}

# ── 1. Thematic: founder override, or derived ────────────────────────────
OVERRIDE_FILE="$REPO/content/next-series-thematic.md"
THEMATIC_FILE="$REPO/logs/devo-weekly/$STAMP-thematic.md"
OVERRIDE_BODY="$(sed '/^<!--/,/^-->/d' "$OVERRIDE_FILE" | sed '/^[[:space:]]*$/d')"

if [ -n "$OVERRIDE_BODY" ]; then
  echo "[thematic] founder override present"
  printf '%s\n' "$OVERRIDE_BODY" > "$THEMATIC_FILE"
  mkdir -p docs/run
  cp "$OVERRIDE_FILE" "docs/run/SERIES-THEMATIC-OVERRIDE-$STAMP.md"
  # Reset the override file to its instructions for next week.
  git checkout -- "$OVERRIDE_FILE" 2>/dev/null || true
else
  echo "[thematic] deriving from last-30-days research + last week's series"
  claude -p "Derive next week's devotional series thematic. METHOD: (1) Run the last30days skill in headless one-shot discovery over the domain 'christian faith, church culture, and spiritual struggles people are talking about' (its engine is at ~/.claude/skills/last30days/scripts/last30days.py; use python3.12, --discover one-shot with --auto-resolve is acceptable headless). (2) Read docs/run/ for the most recent SERIES-THEMATIC-*.md and the newest series in src/data/series.ts to know what LAST week's series was about. (3) Choose ONE thematic that is topical per the research AND continues last week's underlying human thread WITHOUT referencing it (series stand alone). Scripture-anchorable, pastoral not newsy — the news is the doorway, never the content. (4) Write to $THEMATIC_FILE: the thematic in one sentence, the scripture spine candidate, the human condition it speaks to, and 3 sentences of rationale citing what the research surfaced. Write NOTHING else anywhere." \
    --allowedTools "Bash,Read,Write,Grep,Glob" --permission-mode acceptEdits
fi

if [ ! -s "$THEMATIC_FILE" ]; then
  notify "Weekly series FAILED: no thematic produced"
  echo "[fatal] thematic step produced nothing"; exit 1
fi
echo "[thematic] $(head -3 "$THEMATIC_FILE")"

# ── 2. The build: full devo-go, headless, to a branch, gate-stopped ─────
BRANCH="series/auto-$STAMP"
AUTOPUB=""
[ -f "$REPO/scripts/devo-weekly/AUTO_PUBLISH" ] && AUTOPUB="The founder's AUTO_PUBLISH switch is present: after the reading-gate artifact is written, proceed through the remaining devo-go phases INCLUDING merge to main and deploy, exactly as the skill prescribes."

claude -p "Invoke the devo-go skill and execute it END TO END for next week's series. THE THEMATIC is in $THEMATIC_FILE — read it first. THE FOUNDER'S STANDING ANSWERS to devo-go's Required Inputs are in scripts/devo-weekly/STANDING-BRIEF.md — read them; do NOT use AskUserQuestion, this run is unattended and those answers govern. Work on a new branch $BRANCH (create from main). Start day: the Sunday after next Wednesday. Narration: ElevenLabs founder voice per references/narration.md (dry-run first; the key is in .env.local). Imagery: /imagen through the Codex CLI exactly per references/imagery-and-video.md — built-in image_gen only, style anchors attached, prompts assembled by the build scripts, never hand-written. STOP after writing the reading-gate artifact and pushing the branch — do not merge, do not deploy. $AUTOPUB Commit on the branch with proper SA-100 (F-146) citations and the tracking-spine updates the hooks demand. Finish by appending a 10-line summary (series slug, theme, gate artifact path, branch) to $LOG.plan and running: osascript -e 'display notification \"Next week'\''s series is ready to read\" with title \"Euangelion weekly series\"'" \
  --allowedTools "Bash,Read,Write,Edit,Grep,Glob,Skill,Agent" --permission-mode acceptEdits
RC=$?

if [ $RC -ne 0 ]; then
  notify "Weekly series build FAILED — read logs/devo-weekly/$STAMP.log"
  echo "[fatal] build exited $RC"; exit $RC
fi
notify "Weekly series built — branch series/auto-$STAMP awaits your read"
echo "════ done $(date) ════"
