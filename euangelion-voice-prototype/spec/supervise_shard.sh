#!/bin/zsh
# One shard, one dedicated Voicebox server, one port.
#
# Voicebox's MLX/Metal backend calls abort() when generations contend for a
# command encoder INSIDE a process — it kills the server rather than failing the
# request. Separate processes each hold their own Metal context and coexist
# fine, so parallelism is achieved with N servers rather than N threads.
#
# This supervisor owns exactly one port. It restarts only the server bound to
# that port, so a crash in one shard cannot take down its siblings. Resume is
# content-addressed, so a restart re-renders nothing that already succeeded.
SHARD=$1; TOTAL=$2; PORT=$3
cd /Users/jamesparker/Documents/app-projects/external/euangelion
LOG="euangelion-voice-prototype/shard${SHARD}-${PORT}.log"
export VOICEBOX_API="http://127.0.0.1:${PORT}"

start_server() {
  local pid=$(lsof -ti tcp:${PORT} 2>/dev/null)
  [ -n "$pid" ] && { kill -9 $pid 2>/dev/null; sleep 3; }
  nohup /Applications/Voicebox.app/Contents/MacOS/voicebox-server --port ${PORT} \
    --data-dir "$HOME/Library/Application Support/sh.voicebox.app" \
    >> "euangelion-voice-prototype/vb-${PORT}.log" 2>&1 &
  for i in $(seq 1 50); do
    sleep 5
    curl -s --max-time 4 "http://127.0.0.1:${PORT}/health" 2>/dev/null | grep -q healthy && return 0
  done
  return 1
}

for attempt in $(seq 1 80); do
  if ! curl -s --max-time 5 "http://127.0.0.1:${PORT}/health" 2>/dev/null | grep -q healthy; then
    echo "[s${SHARD}] server on ${PORT} down — restarting (attempt ${attempt})" >> "$LOG"
    start_server || { echo "[s${SHARD}] could not start ${PORT}" >> "$LOG"; exit 1; }
  fi
  left=$(python3 -c "import sys;sys.path.insert(0,'euangelion-voice-prototype/spec');import render_catalog as rc;print(len(rc.work_list(shard=($SHARD,$TOTAL))))" 2>/dev/null)
  echo "[s${SHARD}] pass ${attempt} — ${left} left in this shard" >> "$LOG"
  [ "$left" = "0" ] && { echo "[s${SHARD}] shard complete" >> "$LOG"; break; }
  python3 euangelion-voice-prototype/spec/render_catalog.py --voice am_michael \
    --shard ${SHARD}/${TOTAL} >> "$LOG" 2>&1
done
echo "[s${SHARD}] done" >> "$LOG"
