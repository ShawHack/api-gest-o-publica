#!/bin/bash
set -e
BASE=/home/semit/Documentos/api-semit
cp /tmp/comtur-content.js "$BASE/backend/helpers/comtur-content.js"
sed -i 's/\r$//' /tmp/patch_qr_point_admin.py /tmp/patch_qr_tests.py
python3 /tmp/patch_qr_point_admin.py
python3 /tmp/patch_qr_tests.py
# copy helper into running api container and restart
docker cp "$BASE/backend/helpers/comtur-content.js" api:/app/helpers/comtur-content.js
docker restart api
# wait healthy
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  st=$(docker inspect api --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')
  echo "api=$st"
  [ "$st" = "healthy" ] && break
  sleep 3
done
grep -n 'qrPointFields\|qr_point.: .qrPointFields\|aceita ponto QR\|normalizeQr\|input.qr' \
  "$BASE/backend/public/comtur-content-admin.html" \
  "$BASE/backend/helpers/comtur-content.js" \
  "$BASE/backend/__tests__/unit/comtur-content.test.js" | head -40
curl -sS --max-time 8 http://127.0.0.1:5000/health; echo
curl -sS --max-time 8 http://127.0.0.1:5000/readyz; echo
