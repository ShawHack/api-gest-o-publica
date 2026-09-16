#!/bin/bash
set -euo pipefail
echo "=== nginx upstream api ==="
docker exec nginx sh -c 'grep -RIn "upstream\|api-semit\|172.20\|proxy_pass" /etc/nginx 2>/dev/null | head -80'
echo "=== docker api containers ==="
docker ps -a --format '{{.ID}} {{.Names}} {{.Status}} {{.Networks}}' | grep -iE 'api|nginx' | head -30
echo "=== api ips ==="
docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{.NetworkID}}{{end}}' 2>/dev/null || true
docker network ls
echo "=== compose services ==="
ls /home/semit/Documentos/api-semit/ | head -40
