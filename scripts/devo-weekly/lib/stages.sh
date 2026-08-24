# Checkpointed stages for the weekly series run. Source this, don't execute.
#
# A quota death mid-run advances the tier ladder and RESUMES: stages already
# marked complete are skipped rather than re-executed.
#
# LIMITATION (2026-08-24): narration and imagery happen INSIDE the single
# devo-go `claude -p` call, not as separate shell steps, so the finest seam
# available here is `compose`. A failure part-way through compose will re-run
# narration and imagery for that attempt. Splitting them would require
# restructuring devo-go itself. Recorded rather than hidden.

stage_done() { [ -f "$1/stages/$2.done" ]; }

mark_stage() {
  mkdir -p "$1/stages"
  date -u +%FT%TZ > "$1/stages/$2.done"
}

# run_stage <run_dir> <name> <command...>
run_stage() {
  _run="$1"; _name="$2"; shift 2
  if stage_done "$_run" "$_name"; then
    echo "[stage] skip $_name (already complete)"
    return 0
  fi
  echo "[stage] run $_name (tier ${CLAUDE_TIER:-?})"
  "$@" || return $?
  mark_stage "$_run" "$_name"
  echo "[stage] done $_name"
}
