#!/usr/bin/env bash
# Sobe Prometheus + Grafana (100% gratuito, só localhost).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Subindo stack de monitoramento (perfil monitoring)..."
docker compose \
  -f docker-compose.yml \
  -f monitoring/docker-compose.monitoring.yml \
  --profile monitoring up -d prometheus grafana

echo ""
HOST="${MONITORING_BIND_IP:-10.15.25.28}"
echo "Prometheus: http://${HOST}:9090"
echo "Grafana:    http://${HOST}:3001  (admin / GRAFANA_ADMIN_PASSWORD no .env)"
echo "Dashboard:  API-SEMIT > Auditoria forense — API-SEMIT"
