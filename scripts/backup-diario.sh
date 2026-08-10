#!/usr/bin/env bash
# Backup diário da API-SEMIT — chama backup_completo.sh, valida o resultado e
# aplica retenção. Pode ser executado manualmente ou pelo cron.
set -Eeuo pipefail
umask 077

REPO="${REPO:-/home/semit/Documentos/api-semit}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
LOG_DIR="${LOG_DIR:-/home/semit/Documentos/backups-completos/_logs}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$LOG_DIR" "$BASE_DIR"
LOG_FILE="$LOG_DIR/backup-diario.log"
LOCK_FILE="$LOG_DIR/.backup-diario.lock"
LAST_SUCCESS_FILE="$LOG_DIR/.backup-last-success"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Outra execução de backup já está em andamento; esta execução foi ignorada."
  exit 0
fi

log "Iniciando backup diário (repo=$REPO)"
if ! docker ps --format '{{.Names}}' | grep -qx mongo; then
  log "AVISO: container mongo não está rodando; backup pode falhar parcialmente."
fi

RC=0
PROJ_DIR="$REPO" BASE_DIR="$BASE_DIR" bash "$REPO/backup_completo.sh" >> "$LOG_FILE" 2>&1 || RC=$?
if [ "$RC" -eq 0 ]; then
  if BASE_DIR="$BASE_DIR" MAX_AGE_HOURS=2 bash "$REPO/scripts/verificar-backup.sh" >> "$LOG_FILE" 2>&1; then
    date -Iseconds > "$LAST_SUCCESS_FILE"
    log "Backup concluído e verificado com sucesso."
  else
    log "ERRO: backup criado, mas a verificação falhou."
    exit 1
  fi
else
  log "ERRO: backup terminou com código $RC"
  exit "$RC"
fi

# Remove backups antigos (pastas datadas 20xx-xx-xx em BASE_DIR)
find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -mtime +"$RETENTION_DAYS" -exec rm -rf -- {} + 2>/dev/null || true

exit 0
