#!/usr/bin/env bash
# Roda pytest do GovCidadao (host com pip ou container Python no servidor de produção).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GOV="$ROOT/GovCidadao"
export JWT_SECRET="${JWT_SECRET:-test-jwt-govcidadao-only}"

run_local() {
  cd "$GOV"
  if ! python3 -c "import pytest" 2>/dev/null; then
    python3 -m pip install -q -r requirements.txt -r requirements-dev.txt
  fi
  python3 -m pytest -q "$@"
}

run_docker() {
  echo "pytest via container (host sem pip)..."
  docker run --rm \
    -v "$GOV:/work" -w /work \
    -e JWT_SECRET \
    python:3.11-slim \
    sh -c "pip install -q -r requirements.txt -r requirements-dev.txt && python -m pytest -q $*"
}

if python3 -c "import pytest" 2>/dev/null; then
  run_local
elif python3 -m pip --version >/dev/null 2>&1; then
  run_local
else
  run_docker
fi
