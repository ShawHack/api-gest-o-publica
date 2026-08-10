#!/usr/bin/env bash
# Migração produção: standalone → replica set rs0 (janela curta de indisponibilidade).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Migração Mongo → replica set rs0 ==="
echo "1) Backup recomendado antes de continuar."
if [ "${SKIP_CONFIRM:-}" != "SIM" ]; then
  read -r -p "Backup verificado? (digite SIM) " ok
  if [ "$ok" != "SIM" ]; then
    echo "Abortado. Rode: bash scripts/verificar-backup.sh"
    exit 1
  fi
fi

echo "Parando API e Gov (Mongo continua até recreate)..."
docker compose stop api govcidadao-api govcidadao-frontend email-worker 2>/dev/null || true

echo "Recriando Mongo com --replSet rs0 (volume preservado)..."
docker compose up -d mongo --force-recreate

echo "Aguardando healthcheck Mongo..."
for i in $(seq 1 40); do
  if docker compose ps mongo --format '{{.Health}}' 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 3
done

bash "$ROOT/scripts/mongo-init-replica-set.sh"

echo "Subindo stack..."
docker compose up -d api govcidadao-api govcidadao-frontend redis email-worker 2>/dev/null || docker compose up -d api govcidadao-api govcidadao-frontend redis

sleep 15
curl -sf http://127.0.0.1:5000/readyz | head -c 200
echo ""
docker compose exec nginx nginx -s reload 2>/dev/null || true
echo "=== Migração concluída. Valide login Memorial e Garça Cidadão. ==="
