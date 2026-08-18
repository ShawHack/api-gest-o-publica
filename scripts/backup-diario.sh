#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO="${REPO:-/home/semit/Documentos/api-gestao-publica}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
LOG_DIR="${LOG_DIR:-$BASE_DIR/_logs}"

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
RC=0
PROJ_DIR="$REPO" BASE_DIR="$BASE_DIR" bash "$REPO/backup_completo.sh" >> "$LOG_FILE" 2>&1 || RC=$?
if [ "$RC" -ne 0 ]; then
  log "ERRO: backup terminou com código $RC"
  exit "$RC"
fi

if ! BASE_DIR="$BASE_DIR" MAX_AGE_HOURS=2 bash "$REPO/scripts/verificar-backup.sh" >> "$LOG_FILE" 2>&1; then
  log "ERRO: backup criado, mas a verificação falhou. Nenhuma retenção foi executada."
  exit 1
fi

if ! BASE_DIR="$BASE_DIR" bash "$REPO/scripts/publicar-backup-transferencia.sh" >> "$LOG_FILE" 2>&1; then
  log "ERRO: falha ao gerar checksum/manifesto. Nenhuma retenção foi executada."
  exit 1
fi

date -Iseconds > "$LAST_SUCCESS_FILE"
log "Backup concluído, verificado e publicado. Retenção aguarda recibo validado do Windows."
