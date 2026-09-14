#!/usr/bin/env bash
set -u
echo LOAD
cat /proc/loadavg
echo D_STATE
for p in /proc/[0-9]*; do
  state=$(awk '/^State:/{print $2}' "$p/status" 2>/dev/null || true)
  if [ "$state" = D ]; then
    awk '/^Name:|^Pid:|^State:/{printf "%s ",$2} END{print ""}' "$p/status" 2>/dev/null
  fi
done | head -80
echo BUILD_PROCESSES
pgrep -af 'docker build|buildkit|jest|node --check' | head -80 || true
echo DISK
df -h /home
echo HEALTH
curl -fsS --max-time 4 http://127.0.0.1:5000/health || true
