#!/bin/zsh
# Voicebox's MLX/Metal backend aborts the whole server process when it cannot
# get a command encoder — it does not fail the request, it calls abort(). That
# takes the API socket with it and strands any in-flight job in `generating`.
#
# So: one render at a time (concurrency is what triggers it), and when the
# server dies, put it back and carry on. The work queue is content-addressed,
# so a resume re-renders nothing that already succeeded.
cd /Users/jamesparker/Documents/app-projects/external/euangelion
LOG=euangelion-voice-prototype/michael-supervised.log

restart_voicebox() {
  pkill -9 -if voicebox 2>/dev/null; sleep 4
  open -a Voicebox
  for i in $(seq 1 50); do
    sleep 6
    curl -s --max-time 5 http://127.0.0.1:17493/health 2>/dev/null | grep -q '"status":"healthy"' && return 0
  done
  return 1
}

for attempt in $(seq 1 60); do
  if ! curl -s --max-time 5 http://127.0.0.1:17493/health 2>/dev/null | grep -q healthy; then
    echo "[supervisor] voicebox down — restarting (attempt $attempt)" >> $LOG
    restart_voicebox || { echo "[supervisor] could not bring it back" >> $LOG; exit 1; }
    echo "[supervisor] back up" >> $LOG
  fi
  remaining=$(python3 -c "import sys;sys.path.insert(0,'euangelion-voice-prototype/spec');import render_catalog as rc;print(len(rc.work_list()))" 2>/dev/null)
  echo "[supervisor] pass $attempt — $remaining devotionals left" >> $LOG
  [ "$remaining" = "0" ] && { echo "[supervisor] catalog complete" >> $LOG; break; }
  python3 euangelion-voice-prototype/spec/render_catalog.py --voice am_michael >> $LOG 2>&1
done
echo "[supervisor] done" >> $LOG
