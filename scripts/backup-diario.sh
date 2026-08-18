#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO="${REPO:-/home/semit/Documentos/api-gestao-publica}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
LOG_DIR="${LOG_DIR:-$BASE_DIR/_logs}"
KEEP_BACKUP_GENERATIONS="${KEEP_BACKUP_GENERATIONS:-3}"

mkdir -p "$LOG_DIR" "$BASE_DIR"
chmod 700 "$BASE_DIR" || true
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
chmod 600 "$LAST_SUCCESS_FILE" || true

# Mantém as N gerações mais recentes; o restante só sai depois de um backup válido.
mapfile -t GENS < <(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d \
  -name '20??-??-??_??-??-??' -printf '%f\n' | sort -r)
if [ "${#GENS[@]}" -gt "$KEEP_BACKUP_GENERATIONS" ]; then
  for old in "${GENS[@]:$KEEP_BACKUP_GENERATIONS}"; do
    log "Retenção: removendo geração antiga $old"
    rm -rf "$BASE_DIR/$old"
  done
fi

log "Backup concluído, verificado e publicado. Gerações locais mantidas: $KEEP_BACKUP_GENERATIONS."
