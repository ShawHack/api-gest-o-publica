#!/usr/bin/env bash
# Instala entradas de cron de operação (Fase 1), incluindo backup diário.
# Uso: bash scripts/install-fase1-ops.sh
set -Eeuo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# api-semit-fase1-ops"
BACKUP_MARKER="# api-semit-backup-daily"

chmod +x "$REPO/scripts/backup-diario.sh" "$REPO/scripts/uptime-check.sh" 2>/dev/null || true

EXISTING=$(crontab -l 2>/dev/null || true)
EXISTING=$(echo "$EXISTING" | grep -v -e "$MARKER-backup" -e "$BACKUP_MARKER" || true)

UPTIME_LINE="*/10 * * * * BASE_URL=https://api.garca.sp.gov.br REPO=$REPO $REPO/scripts/uptime-check.sh $MARKER-uptime"
BACKUP_LINE="15 1 * * * REPO=$REPO BASE_DIR=/home/semit/Documentos/backups-completos RETENTION_DAYS=14 $REPO/scripts/backup-diario.sh >> /home/semit/Documentos/backups-completos/_logs/backup-cron.log 2>&1 $BACKUP_MARKER"

if echo "$EXISTING" | grep -q "$MARKER-uptime"; then
  echo "Cron de uptime já instalado."
else
  EXISTING="${EXISTING}
${UPTIME_LINE}"
  echo "Adicionado: uptime a cada 10 min"
fi

EXISTING="${EXISTING}
${BACKUP_LINE}"
echo "Configurado: backup diário às 01:15, com retenção de 14 dias"

echo "$EXISTING" | crontab -
echo "Crontab atual (marcadores api-semit):"
crontab -l 2>/dev/null | grep "$MARKER" || echo "(nenhum)"
echo ""
echo "Backup também pode ser executado manualmente:"
echo "  PROJ_DIR=$REPO BASE_DIR=\$HOME/Documentos/backups-completos bash $REPO/backup_completo.sh"
echo "  # ou: bash $REPO/scripts/backup-diario.sh"
