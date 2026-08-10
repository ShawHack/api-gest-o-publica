#!/usr/bin/env bash
# Verificação de saúde API-SEMIT — uso manual ou via cron.
set -Eeuo pipefail

BASE_URL="${BASE_URL:-https://api.garca.sp.gov.br}"
LOCAL_API="${LOCAL_API:-http://127.0.0.1:5000}"
LOG_DIR="${LOG_DIR:-/home/semit/Documentos/backups-completos/_logs}"
DISK_WARN="${DISK_WARN:-85}"
REPO="${REPO:-/home/semit/Documentos/api-semit}"
ALERT_COOLDOWN_MIN="${UPTIME_ALERT_COOLDOWN_MIN:-30}"
STATE_FILE="$LOG_DIR/.uptime-state"
ALERT_SENT_FILE="$LOG_DIR/.uptime-alert-sent-at"

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/uptime-check.log"
FAIL=0
PREV_STATE="ok"
[ -f "$STATE_FILE" ] && PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo ok)

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

check_http() {
  local name="$1" url="$2" expect="$3"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 30 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expect" ]; then
    log "OK $name ($url) → HTTP $code"
  else
    log "FALHA $name ($url) → HTTP $code (esperado $expect)"
    FAIL=1
  fi
}

log "=== uptime-check ==="

check_http "health-public" "$BASE_URL/health" "200"
check_http "readyz-public" "$BASE_URL/readyz" "200"
check_http "health-local" "$LOCAL_API/health" "200"

for c in mongo redis api nginx; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    log "OK container $c rodando"
  else
    log "FALHA container $c não está Up"
    FAIL=1
  fi
done

disk_pct=$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')
if [ -n "$disk_pct" ] && [ "$disk_pct" -ge "$DISK_WARN" ]; then
  log "AVISO disco / em ${disk_pct}% (limiar ${DISK_WARN}%)"
  FAIL=1
else
  log "OK disco / em ${disk_pct:-?}%"
fi

if [ -x "$REPO/scripts/ci-check-secret-logs.sh" ]; then
  if bash "$REPO/scripts/ci-check-secret-logs.sh" >> "$LOG" 2>&1; then
    log "OK checagem de logs de segredos"
  else
    log "FALHA checagem de logs de segredos no código em disco"
  fi
fi

if [ -x "$REPO/scripts/verificar-backup.sh" ]; then
  if BASE_DIR="${BACKUP_BASE_DIR:-/home/semit/Documentos/backups-completos}" \
      MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-30}" \
      bash "$REPO/scripts/verificar-backup.sh" >> "$LOG" 2>&1; then
    log "OK backup recente e válido"
  else
    log "FALHA backup ausente, antigo ou inválido"
    FAIL=1
  fi
fi

send_alert_email() {
  local kind="$1"
  if ! command -v docker >/dev/null 2>&1; then
    log "AVISO: docker indisponível — alerta por e-mail não enviado"
    return 0
  fi
  if ! docker compose -f "$REPO/docker-compose.yml" ps -q api 2>/dev/null | grep -q .; then
    log "AVISO: container api parado — tentando enviar alerta mesmo assim"
  fi
  if tail -45 "$LOG" | docker compose -f "$REPO/docker-compose.yml" exec -T api \
      node scripts/send-uptime-alert.js "$kind" 2>>"$LOG"; then
    log "Alerta e-mail ($kind) enviado"
    date +%s >"$ALERT_SENT_FILE"
  else
    log "FALHA ao enviar alerta por e-mail ($kind)"
  fi
}

should_send_alert() {
  [ ! -f "$ALERT_SENT_FILE" ] && return 0
  local last now diff
  last=$(cat "$ALERT_SENT_FILE" 2>/dev/null || echo 0)
  now=$(date +%s)
  diff=$(( now - last ))
  [ "$diff" -ge $(( ALERT_COOLDOWN_MIN * 60 )) ]
}

if [ "$FAIL" -eq 0 ]; then
  log "Resultado: SAUDÁVEL"
  echo ok >"$STATE_FILE"
  if [ "$PREV_STATE" = "fail" ]; then
    if should_send_alert; then
      send_alert_email recovered
    fi
  fi
else
  log "Resultado: PROBLEMA DETECTADO — ver RUNBOOK docs/RUNBOOK-INCIDENTES.md"
  echo fail >"$STATE_FILE"
  if should_send_alert; then
    send_alert_email down
  else
    log "Alerta e-mail em cooldown (${ALERT_COOLDOWN_MIN} min)"
  fi
fi

exit "$FAIL"
