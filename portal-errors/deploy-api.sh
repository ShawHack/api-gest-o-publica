#!/bin/sh
set -eu
cd /home/semit/Documentos/api-semit
stage=/tmp/portal-errors-20260904
backup=/home/semit/Documentos/deploy-backups/portal-errors-20260904
cp -pn backend/server.js "$backup/server.production.js"
docker cp api:/app/server.js "$backup/server.runtime.before.js"
cp "$stage/nginx.conf" nginx/nginx.conf
docker exec nginx nginx -t
docker image tag api-semit-api:portal-errors-20260904 api-semit-api:latest
if ! docker compose up -d --no-deps --no-build api; then
  docker image tag api-semit-api:pre-portal-errors-20260904 api-semit-api:latest
  docker compose up -d --no-deps --no-build api
  docker exec nginx nginx -s reload
  exit 1
fi
healthy=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if docker exec api node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then healthy=1; break; fi
  sleep 2
done
if [ "$healthy" != 1 ]; then
  docker image tag api-semit-api:pre-portal-errors-20260904 api-semit-api:latest
  docker compose up -d --no-deps --no-build api
  docker exec nginx nginx -s reload
  echo 'API rollback applied' >&2
  exit 1
fi
cp "$stage/server.production.js" backend/server.js
cp "$stage/api-not-found.js" backend/helpers/api-not-found.js
docker exec nginx nginx -s reload
echo 'API healthy; minimal correction published.'
