#!/usr/bin/env bash
set -euo pipefail
cd /home/semit/Documentos/api-semit
previous="$(docker inspect api --format '{{.Image}}')"
docker tag "$previous" api-semit-api:pre-comtur-full-20260909
docker tag api-semit-api:comtur-antivirus-candidate api-semit-api:latest
docker compose up -d --no-deps --force-recreate api
healthy=0
for _ in $(seq 1 30); do
  status="$(docker inspect api --format '{{.State.Health.Status}}' 2>/dev/null || true)"
  [ "$status" = healthy ] && healthy=1 && break
  sleep 2
done
if [ "$healthy" -ne 1 ]; then
  docker logs --tail 120 api 2>&1 || true
  docker tag api-semit-api:pre-comtur-full-20260909 api-semit-api:latest
  docker compose up -d --no-deps --force-recreate api
  exit 1
fi
curl -fsS --max-time 8 http://127.0.0.1:5000/health
curl -fsS --max-time 8 http://127.0.0.1:5000/comtur/branding
curl -fsS --max-time 8 http://127.0.0.1:5000/comtur/content
test "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:5000/comtur/admin/content)" = 401
