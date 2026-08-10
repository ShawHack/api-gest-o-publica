#!/usr/bin/env bash
# Limpeza segura da partição / (não remove volumes Docker em uso).
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Execute com sudo: sudo bash $0"
  exit 1
fi

echo "==> Antes:"
df -h /

echo "==> apt clean / autoremove..."
apt-get clean
apt-get autoremove --purge -y

echo "==> journalctl (manter 7 dias)..."
journalctl --vacuum-time=7d 2>/dev/null || true

echo "==> Depois:"
df -h /

echo "Concluído. Não foi executado 'docker volume prune' (risco em produção)."
