#!/usr/bin/env bash
set -euo pipefail

cd /home/semit/Documentos/api-semit

current_id="$(docker inspect api --format '{{.Image}}')"
docker tag "$current_id" api-semit-api:pre-comtur-admin-20260909
docker tag api-semit-api:comtur-admin-candidate api-semit-api:latest
docker compose up -d --no-deps --force-recreate api

healthy=0
for _ in $(seq 1 30); do
  status="$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    healthy=1
    break
  fi
  if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo PROMOTION_FAILED_ROLLBACK
  docker logs --tail 120 api 2>&1 || true
  docker tag api-semit-api:pre-comtur-admin-20260909 api-semit-api:latest
  docker compose up -d --no-deps --force-recreate api
  exit 1
fi

echo API_HEALTHY
docker ps --filter name=^/api$ --format '{{.Names}} {{.Image}} {{.Status}}'
echo RUNNING_IMAGE
docker inspect api --format '{{.Image}} {{.Config.Image}}'
echo PUBLIC
curl -k -sS -i --max-time 10 'https://127.0.0.1/api/comtur/meetings?limit=5' | head -28
echo ADMIN_UNAUTH
curl -k -sS -i --max-time 10 'https://127.0.0.1/api/comtur/admin/meetings' | head -28
echo ADMIN_POST_UNAUTH
curl -k -sS -i --max-time 10 -X POST 'https://127.0.0.1/api/comtur/admin/meetings' -H 'Content-Type: application/json' --data '{}' | head -28
echo RECENT_ERRORS
docker logs --since 5m api 2>&1 | grep -iE 'comtur|error|exception|fatal' | tail -80 || true
