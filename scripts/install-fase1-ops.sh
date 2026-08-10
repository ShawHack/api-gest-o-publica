#!/usr/bin/env bash
# Instala entradas de cron de operação (Fase 1) — SEM backup automático.
# Backup: apenas manual via ./backup_completo.sh ou ./scripts/backup-diario.sh
# Uso: bash scripts/install-fase1-ops.sh
set -Eeuo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# api-semit-fase1-ops"

chmod +x "$REPO/scripts/backup-diario.sh" "$REPO/scripts/uptime-check.sh" 2>/dev/null || true

# Remover cron de backup se existir (política: backup só manual)
EXISTING=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -q "$MARKER-backup"; then
  EXISTING=$(echo "$EXISTING" | grep -v "$MARKER-backup" || true)
  echo "Removido: cron de backup automático (backup é só manual)."
fi

UPTIME_LINE="*/10 * * * * BASE_URL=https://api.garca.sp.gov.br REPO=$REPO $REPO/scripts/uptime-check.sh $MARKER-uptime"

if echo "$EXISTING" | grep -q "$MARKER-uptime"; then
  echo "Cron de uptime já instalado."
else
  EXISTING="${EXISTING}
${UPTIME_LINE}"
  echo "Adicionado: uptime a cada 10 min"
fi

echo "$EXISTING" | crontab -
echo "Crontab atual (marcadores api-semit):"
crontab -l 2>/dev/null | grep "$MARKER" || echo "(nenhum)"
echo ""
echo "Backup: execute manualmente:"
echo "  PROJ_DIR=$REPO BASE_DIR=\$HOME/Documentos/backups-completos bash $REPO/backup_completo.sh"
echo "  # ou: bash $REPO/scripts/backup-diario.sh"
