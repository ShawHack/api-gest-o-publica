#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
KEEP="${KEEP:-3}"
NO_DELETE="${NO_DELETE:-0}"
ID="${1:-}"
CLIENT_SHA="${2:-}"

[[ "$ID" =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$ ]] || { echo "ERRO: ID inválido" >&2; exit 2; }
[[ "$CLIENT_SHA" =~ ^[0-9a-fA-F]{64}$ ]] || { echo "ERRO: SHA-256 inválido" >&2; exit 2; }
DIR="$BASE_DIR/$ID"
[ -d "$DIR" ] || { echo "ERRO: backup não encontrado: $ID" >&2; exit 1; }
mapfile -t ARCHIVES < <(find "$DIR" -maxdepth 1 -type f -name '*.tar.gz' -size +0c -print)
[ "${#ARCHIVES[@]}" -eq 1 ] || { echo "ERRO: pacote inválido" >&2; exit 1; }
SERVER_SHA="$(sha256sum "${ARCHIVES[0]}" | awk '{print $1}')"
[ "${SERVER_SHA,,}" = "${CLIENT_SHA,,}" ] || { echo "ERRO: checksum do cliente diverge do servidor; retenção cancelada" >&2; exit 1; }

mkdir -p "$BASE_DIR/_receipts" "$BASE_DIR/_logs"
printf 'validated_at=%s\nbackup_id=%s\nsha256=%s\n' "$(date -Iseconds)" "$ID" "$SERVER_SHA" > "$BASE_DIR/_receipts/$ID.receipt"

mapfile -t ALL < <(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -printf '%f\n' | sort -r)
if [ "$NO_DELETE" = "1" ]; then
  echo "TESTE: recibo validado; exclusões desativadas. Total atual: ${#ALL[@]}, retenção futura: $KEEP."
  exit 0
fi
if [ "${#ALL[@]}" -le "$KEEP" ]; then
  echo "Recibo validado; ${#ALL[@]} backup(s), nenhuma exclusão necessária."
  exit 0
fi

for OLD in "${ALL[@]:$KEEP}"; do
  rm -rf -- "$BASE_DIR/$OLD"
  echo "Retenção: removido $OLD após validação local de $ID"
done
