#!/bin/bash
set -e
echo "=== model snippet ==="
docker exec api sed -n '1,120p' /app/models/ComturContent.js
echo "=== helper types ==="
docker exec api grep -n "research\|ALLOWED\|TYPES\|status\|published" /app/helpers/comtur-content.js | head -40
echo "=== controller public list ==="
docker exec api grep -n "status\|type\|published\|find\|listPublic\|getPublic" /app/controllers/ComturContentController.js | head -60
echo "=== mongo dbs ==="
docker exec mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(d=>print(d.name))' || docker exec mongo mongo --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(d=>print(d.name))'
