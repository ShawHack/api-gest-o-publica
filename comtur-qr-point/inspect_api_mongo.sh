#!/bin/bash
set -e
echo "=== api cwd ==="
docker exec api pwd
docker exec api ls
echo "=== find model ==="
docker exec api sh -c 'find / -name "*ComturContent*" 2>/dev/null | head -30'
docker exec api sh -c 'find / -iname "*comtur*content*" 2>/dev/null | head -30'
echo "=== env ==="
docker exec api sh -c 'printenv | grep -iE "MONGO|MONGODB|DATABASE" | sed "s/=.*/=***/"'
echo "=== package ==="
docker exec api sh -c 'ls package.json 2>/dev/null; ls /app/package.json 2>/dev/null; ls /usr/src/app/package.json 2>/dev/null; ls /opt/app/package.json 2>/dev/null'
echo "=== mongosh cols ==="
docker exec mongo mongosh --quiet --eval 'db.getSiblingDB("api-semit").getCollectionNames().filter(n=>/comtur|content/i.test(n))'
docker exec mongo mongosh --quiet --eval 'db.getSiblingDB("semit").getCollectionNames().filter(n=>/comtur|content/i.test(n))'
docker exec mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name)'
