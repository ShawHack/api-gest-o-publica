#!/usr/bin/env bash
# k6 — carga leve em staging/produção (Fase 3).
set -euo pipefail

export K6_BASE_URL="${K6_BASE_URL:-https://api.garca.sp.gov.br}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 não instalado. Usando container grafana/k6..."
  docker run --rm -i \
    -e K6_BASE_URL \
    -v "$(cd "$(dirname "$0")/.." && pwd)/k6:/scripts:ro" \
    grafana/k6:latest run /scripts/smoke-load.js
  exit 0
fi

k6 run "$(dirname "$0")/../k6/smoke-load.js"
