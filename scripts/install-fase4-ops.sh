#!/usr/bin/env bash
# Instala cron de retenção de audit logs (LGPD). Uso: bash scripts/install-fase4-ops.sh
set -Eeuo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# api-semit-fase4-ops"
LOG_DIR="${LOG_DIR:-$HOME/Documentos/backups-completos/_logs}"

chmod +x "$REPO/scripts/audit-log-retention.sh" 2>/dev/null || true
mkdir -p "$LOG_DIR"

RETENTION_LINE="45 3 * * 0 REPO=$REPO LOG_DIR=$LOG_DIR $REPO/scripts/audit-log-retention.sh >> $LOG_DIR/audit-retention.log 2>&1 $MARKER-audit-retention"

EXISTING=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -q "$MARKER-audit-retention"; then
  echo "Cron de retenção audit já instalado."
else
  EXISTING="${EXISTING}
${RETENTION_LINE}"
  echo "Adicionado: purge audit logs — domingo 03:45"
fi

echo "$EXISTING" | crontab -
echo "Crontab (fase 4):"
crontab -l | grep "$MARKER" || true
