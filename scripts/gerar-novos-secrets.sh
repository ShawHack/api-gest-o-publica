#!/usr/bin/env bash
# Gera valores aleatórios para colar nos .env — NÃO altera arquivos automaticamente.
set -euo pipefail

gen() {
  openssl rand -base64 48 | tr -d '/+=\n' | head -c 64
}

echo "=== Novos secrets (copiar para .env em manutenção) ==="
echo ""
echo "JWT_SECRET=$(gen)"
echo "GOVCIDADAO_JWT_SECRET=$(gen)"
echo "API_KEYS=$(gen)"
echo ""
echo "Atualize backend/.env e .env na raiz; depois: docker compose up -d --build api govcidadao-api"
