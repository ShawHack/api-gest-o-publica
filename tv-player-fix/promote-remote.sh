#!/bin/sh
set -eu

production=tv-semit
rollback=tv-semit-rollback-20260917
candidate_image=api-semit-tv-semit:player-fix-20260917
rollback_image=api-semit-tv-semit:rollback-20260917

old_image=$(docker inspect "$production" --format '{{.Image}}')
docker image tag "$old_image" "$rollback_image"
docker stop "$production" >/dev/null
docker rename "$production" "$rollback"

restore_previous() {
  docker rm -f "$production" >/dev/null 2>&1 || true
  docker rename "$rollback" "$production" >/dev/null 2>&1 || true
  docker start "$production" >/dev/null 2>&1 || true
}
trap restore_previous HUP INT TERM

if ! docker run -d \
  --name "$production" \
  --restart unless-stopped \
  --network api-semit_stack \
  --network-alias tv-semit \
  --label com.docker.compose.project=api-semit \
  --label com.docker.compose.service=tv-semit \
  -e NODE_ENV=production \
  -e PORT=3050 \
  -v api-semit_tv-semit-data:/app/data \
  "$candidate_image" >/dev/null; then
  restore_previous
  exit 1
fi

healthy=false
attempt=0
while [ "$attempt" -lt 30 ]; do
  status=$(docker inspect "$production" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' 2>/dev/null || true)
  if [ "$status" = healthy ]; then
    healthy=true
    break
  fi
  if [ "$status" = unhealthy ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done

if [ "$healthy" != true ]; then
  docker logs --tail 50 "$production" >&2 || true
  restore_previous
  exit 1
fi

trap - HUP INT TERM
docker inspect "$production" --format 'PROMOTED {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}'
docker exec "$production" wget -qO- http://127.0.0.1:3050/api/health
