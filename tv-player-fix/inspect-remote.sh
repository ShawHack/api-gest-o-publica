#!/bin/sh
set -eu
echo SERVER_OK
docker inspect tv-semit --format '{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}'
docker inspect tv-semit --format '{{json .Config.Healthcheck}}'
docker exec tv-semit sh -c 'pwd; ls -l /app/public/playlist-engine.js /app/public/js/playlist-engine.js /app/public/storage-cache.js /app/public/js/storage-cache.js'
docker exec tv-semit sh -c 'grep -nE "listen|api/health" /app/server.js | tail -20'
docker exec tv-semit wget -qSO- -O /dev/null http://127.0.0.1:3050/api/health 2>&1 | tail -10 || true
docker logs --tail 20 tv-semit 2>&1
