#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

if rg -n 'console\.log\([^)]*JWT_SECRET' "$ROOT/backend/helpers" 2>/dev/null; then
  echo "[ERRO] Log de JWT_SECRET encontrado em helpers/"
  FAIL=1
fi

if rg -n 'Verificando com JWT_SECRET' "$ROOT/backend" 2>/dev/null; then
  echo "[ERRO] Mensagem de log de JWT_SECRET ainda presente"
  FAIL=1
fi

exit "$FAIL"
