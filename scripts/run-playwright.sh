#!/usr/bin/env bash
# Smoke E2E Playwright contra staging/produção.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-https://api.garca.sp.gov.br}"

if [[ ! -d "$E2E/node_modules/@playwright/test" ]]; then
  echo "Instalando dependências e2e..."
  (cd "$E2E" && npm ci 2>/dev/null || npm install)
  (cd "$E2E" && npx playwright install chromium)
fi

echo "Playwright → $PLAYWRIGHT_BASE_URL"
cd "$E2E"
npm test "$@"
