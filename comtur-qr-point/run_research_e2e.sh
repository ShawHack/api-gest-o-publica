#!/bin/bash
set -e
docker cp /tmp/insert_research_test.js api:/app/insert_research_test.js
OUT=$(docker exec -w /app api node /app/insert_research_test.js)
echo "$OUT"
SLUG=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["slug"])' "$OUT")
DRAFT=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["draftSlug"])' "$OUT")
echo "SLUG=$SLUG"
echo "DRAFT=$DRAFT"
echo "=== LIST ==="
curl -sk "https://127.0.0.1/api/comtur/content?type=research&limit=20"
echo
echo "=== DETAIL ==="
curl -sk "https://127.0.0.1/api/comtur/content/$SLUG" | head -c 1200
echo
echo "=== DRAFT DETAIL (expect 404) ==="
code=$(curl -sk -o /tmp/draft.json -w "%{http_code}" "https://127.0.0.1/api/comtur/content/$DRAFT")
echo "HTTP $code"
cat /tmp/draft.json
echo
echo "=== ADMIN FORM MARKERS ==="
grep -c 'id="researchFields"' /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
grep -c "'research': 'researchFields'" /home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html
docker exec api grep -c 'id="researchFields"' /app/public/comtur-content-admin.html
docker rm -f >/dev/null 2>&1 || true
docker exec api rm -f /app/insert_research_test.js
