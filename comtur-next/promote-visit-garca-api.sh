#!/usr/bin/env bash
set -euo pipefail

OPS=/home/semit/Documentos/api-semit
PUBLIC=$OPS/backend/public
PRIVATE=$OPS/backend/private
TAG_PRE=api-semit-api:pre-visit-garca-api-20260909
TAG_CAND=api-semit-api:visit-garca-api-candidate

python3 - <<'PY'
from pathlib import Path

replacements = {
    Path("/home/semit/Documentos/api-semit/backend/private/dashboard-app.html"): (
        'href="/comtur-portal.html" class="card card-comtur"',
        'href="/turismo/" class="card card-comtur"',
    ),
}

for path, (old, new) in replacements.items():
    text = path.read_text(encoding="utf-8")
    if old in text:
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        print("PATCHED", path.name)
    else:
        print("SKIP", path.name)

for name in ("comtur-admin.html", "comtur-branding-admin.html", "comtur-meetings-admin.html", "comtur-content-admin.html"):
    path = Path("/home/semit/Documentos/api-semit/backend/public") / name
    if not path.exists():
        print("MISSING", name)
        continue
    text = path.read_text(encoding="utf-8")
    updated = text.replace('href="/comtur-portal.html"', 'href="/turismo/"').replace("href='/comtur-portal.html'", "href='/turismo/'")
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        print("PATCHED", name)
    else:
        print("SKIP", name)
PY

WORKDIR=$(docker inspect api --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
NETWORK=$(docker inspect api --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
cat > /tmp/Dockerfile.visit-garca-api <<'EOF'
FROM api-semit-api:latest
USER root
COPY models/ComturContent.js /app/models/ComturContent.js
COPY helpers/comtur-content.js /app/helpers/comtur-content.js
COPY controllers/ComturContentController.js /app/controllers/ComturContentController.js
USER node
EOF

docker build -t "$TAG_CAND" -f /tmp/Dockerfile.visit-garca-api "$OPS/backend"

docker rm -f api-visit-candidate >/dev/null 2>&1 || true
docker inspect api --format '{{range .Config.Env}}{{println .}}{{end}}' > /tmp/api-visit.env
chmod 600 /tmp/api-visit.env
docker run -d --name api-visit-candidate --network "$NETWORK" -p 127.0.0.1:5001:5000 --env-file /tmp/api-visit.env "$TAG_CAND" >/dev/null
ok=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:5001/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" -ne 1 ]]; then
  echo CANDIDATE_UNHEALTHY
  docker logs --tail 80 api-visit-candidate
  docker rm -f api-visit-candidate >/dev/null
  rm -f /tmp/api-visit.env
  exit 1
fi

shop=$(curl -sS -o /tmp/shop.json -w '%{http_code}' 'http://127.0.0.1:5001/api/comtur/content?type=shopping&limit=1')
feat=$(curl -sS -o /tmp/feat.json -w '%{http_code}' 'http://127.0.0.1:5001/api/comtur/content?featured=true&limit=1')
echo "CANDIDATE shopping=$shop featured=$feat"
python3 - <<'PY'
import json
from pathlib import Path
for name in ("shop.json", "feat.json"):
    data = json.loads(Path("/tmp", name).read_text())
    assert "data" in data, name
print("CANDIDATE_JSON_OK")
PY

current=$(docker inspect api --format '{{.Image}}')
docker tag "$current" "$TAG_PRE"
docker tag "$TAG_CAND" api-semit-api:latest
cd "$WORKDIR"
docker compose up -d --no-deps --force-recreate api
healthy=0
for _ in $(seq 1 30); do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  if [[ "$st" == "healthy" ]]; then healthy=1; break; fi
  if [[ "$st" == "exited" || "$st" == "dead" ]]; then break; fi
  sleep 2
done
if [[ "$healthy" -ne 1 ]]; then
  echo PROMOTE_FAILED
  docker tag "$TAG_PRE" api-semit-api:latest
  docker compose up -d --no-deps --force-recreate api
  docker rm -f api-visit-candidate >/dev/null
  rm -f /tmp/api-visit.env
  exit 1
fi

docker rm -f api-visit-candidate >/dev/null
rm -f /tmp/api-visit.env /tmp/shop.json /tmp/feat.json
curl -fsS http://127.0.0.1:5000/health; echo
curl -sS -o /dev/null -w 'prod shopping %{http_code}\n' 'http://127.0.0.1:5000/api/comtur/content?type=shopping&limit=1'
curl -sS -o /dev/null -w 'prod featured %{http_code}\n' 'http://127.0.0.1:5000/api/comtur/content?featured=true&limit=1'
echo ROLLBACK_IMAGE "$TAG_PRE"
