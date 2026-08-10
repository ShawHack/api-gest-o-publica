#!/usr/bin/env bash
# Backup API-SEMIT (execução MANUAL) — chama backup_completo.sh com log.
# Não instalar em cron. Política: backup só quando o operador executar este script
# (ou backup_completo.sh). Ver scripts/install-fase1-ops.sh.
set -Eeuo pipefail

REPO="${REPO:-/home/semit/Documentos/api-semit}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
LOG_DIR="${LOG_DIR:-/home/semit/Documentos/backups-completos/_logs}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$LOG_DIR" "$BASE_DIR"
LOG_FILE="$LOG_DIR/backup-diario.log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

log "Iniciando backup diário (repo=$REPO)"
if ! docker ps --format '{{.Names}}' | grep -qx mongo; then
  log "AVISO: container mongo não está rodando; backup pode falhar parcialmente."
fi

PROJ_DIR="$REPO" BASE_DIR="$BASE_DIR" bash "$REPO/backup_completo.sh" >> "$LOG_FILE" 2>&1
RC=$?
if [ "$RC" -eq 0 ]; then
  log "Backup concluído com sucesso."
else
  log "ERRO: backup terminou com código $RC"
fi

# Remove backups antigos (pastas datadas 20xx-xx-xx em BASE_DIR)
find "$BASE_DIR" -maxdepth 1 -type d -name '20*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true

exit "$RC"
