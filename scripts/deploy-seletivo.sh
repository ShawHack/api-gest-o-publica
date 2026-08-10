#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ "$#" -eq 0 ]; then
  echo "Uso: $0 <servico> [servico ...]"
  echo "Exemplo: $0 api email-worker job-worker"
  exit 2
fi

COMPOSE=(docker compose -f docker-compose.yml)
if [ -f monitoring/docker-compose.monitoring.yml ]; then
  COMPOSE+=(-f monitoring/docker-compose.monitoring.yml --profile monitoring)
fi

echo "Validando a configuracao Docker Compose..."
"${COMPOSE[@]}" config --quiet

echo "Registrando estado anterior..."
"${COMPOSE[@]}" ps

echo "Atualizando somente: $*"
"${COMPOSE[@]}" up -d --build --no-deps "$@"

echo "Estado apos a atualizacao:"
"${COMPOSE[@]}" ps "$@"

echo "Deploy seletivo concluido. Os demais servicos nao foram derrubados."
