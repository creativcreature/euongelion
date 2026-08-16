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
  # Render in SMALL batches and recycle the server between them.
#
# Batch size and threshold are set from measurement, not taste: at a batch
# of 8 the servers added ~3.5 GB of swap every 9 minutes, which is faster
# than the leak check could catch. Three at a time with a 1.1 GB ceiling
# keeps the footprint flat. A recycle costs ~45s of model load against ~9
# minutes of work, which is cheap next to the throughput collapse that
# swapping causes (2.7x realtime down to 0.96x).
  #
  # voicebox-server LEAKS: each grew to 3-4 GB after six hours serving an 82M
  # parameter model, and three of them pushed the machine into swap (96% used),
  # which collapsed throughput from 2.7x realtime to 0.96x while the CPU sat
  # idle. Health checks never caught it because a bloated server is still
  # "healthy". Recycling between batches caps the growth; the work queue is
  # content-addressed so nothing is re-rendered.
  python3 euangelion-voice-prototype/spec/render_catalog.py --voice am_michael \
    --shard ${SHARD}/${TOTAL} --limit 5 >> "$LOG" 2>&1
  rss=$(ps -o rss= -p "$(lsof -ti tcp:${PORT} 2>/dev/null | head -1)" 2>/dev/null | tr -d ' ')
  if [ -n "$rss" ] && [ "$rss" -gt 1100000 ]; then
    echo "[s${SHARD}] server at $((rss/1024)) MB — recycling" >> "$LOG"
    start_server || { echo "[s${SHARD}] recycle failed" >> "$LOG"; exit 1; }
  fi
done
echo "[s${SHARD}] done" >> "$LOG"
