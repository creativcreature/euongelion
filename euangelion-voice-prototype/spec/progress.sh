#!/bin/zsh
# Live progress meter for the back-catalog narration re-render.
#
#   ./progress.sh          one snapshot
#   ./progress.sh watch    refreshes every 30s until the catalog is done
#
# Everything is derived from the manifest and the shard logs, so it reports what
# actually landed on disk rather than what a runner thinks it did.
cd /Users/jamesparker/Documents/app-projects/external/euangelion

snapshot() {
python3 - <<'PY'
import sys, re, glob, json, os, time
sys.path.insert(0, 'euangelion-voice-prototype/spec')
import render_catalog as rc

man = json.load(open('src/data/audio-manifest.json'))
todo = rc.work_list()
total, left = len(man), len(todo)
done = total - left
pct = done / total * 100 if total else 0

BAR = 44
fill = int(BAR * done / total) if total else 0
bar = '█' * fill + '░' * (BAR - fill)

# throughput measured from this run's logs: audio produced per wall second
rows = []
for f in glob.glob('euangelion-voice-prototype/shard*-*.log'):
    for line in open(f, encoding='utf-8', errors='replace'):
        m = re.search(r'\((\d+)s\) duration [\d.]+ min \((\d+)s\)', line)
        if m:
            rows.append((int(m.group(1)), int(m.group(2))))
rate = (sum(r[1] for r in rows) / sum(r[0] for r in rows)) if rows else 0.0
shards = len(glob.glob('euangelion-voice-prototype/shard*-*.log')) or 1
rem_audio = sum(man[s]['duration'] for s in todo if s in man)
eta = rem_audio / rate / shards if rate else 0

print(f"\n  NARRATION — back catalog\n")
print(f"  [{bar}] {pct:5.1f}%")
print(f"  {done} of {total} devotionals   |   {left} to go")
if rate:
    h = int(eta // 3600); m_ = int((eta % 3600) // 60)
    print(f"  {rem_audio/3600:.1f} h of audio left  |  {rate:.2f}x realtime  |  ETA ~{h}h {m_:02d}m")
print()

for i in range(3):
    port = 17494 + i
    log = f'euangelion-voice-prototype/shard{i}-{port}.log'
    if not os.path.exists(log):
        continue
    txt = open(log, encoding='utf-8', errors='replace').read()
    d = len(re.findall(r'^\[\d+/', txt, re.M))
    fail = txt.count('FAILED')
    restarts = txt.count('down — restarting')
    cur = ''
    for line in reversed(txt.splitlines()):
        m = re.match(r'\[(\d+)/(\d+)\] ([a-z0-9-]+) ', line)
        if m:
            cur = m.group(3)
            break
    up = os.system(f'curl -s --max-time 3 http://127.0.0.1:{port}/health >/dev/null 2>&1') == 0
    flag = 'up  ' if up else 'DOWN'
    print(f"  shard {i}  :{port}  {flag}  {d:3d} done  {fail} failed  {restarts} restarts   {cur[:34]}")
print()
PY
}

if [ "$1" = "watch" ]; then
  while true; do
    clear
    snapshot
    left=$(python3 -c "import sys;sys.path.insert(0,'euangelion-voice-prototype/spec');import render_catalog as rc;print(len(rc.work_list()))" 2>/dev/null)
    [ "$left" = "0" ] && { echo "  catalog complete."; break; }
    echo "  refreshing every 30s — ctrl-C to stop"
    sleep 30
  done
else
  snapshot
fi
