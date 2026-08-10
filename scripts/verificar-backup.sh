#!/usr/bin/env bash
# Verifica se existe backup recente válido (não restaura nada).
set -Eeuo pipefail

BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
FAIL=0

echo "Verificando backups em: $BASE_DIR"

if [ ! -d "$BASE_DIR" ]; then
  echo "ERRO: diretório de backups não existe."
  exit 1
fi

LATEST=$(find "$BASE_DIR" -maxdepth 1 -type d -name '20*' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST" ]; then
  echo "ERRO: nenhuma pasta de backup datada (20*) encontrada."
  exit 1
fi

echo "Último backup: $LATEST"

AGE_SEC=$(( $(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST") ))
AGE_H=$(( AGE_SEC / 3600 ))
if [ "$AGE_H" -gt "$MAX_AGE_HOURS" ]; then
  echo "AVISO: backup tem ${AGE_H}h (limite ${MAX_AGE_HOURS}h)."
  FAIL=1
else
  echo "OK idade do backup: ${AGE_H}h"
fi

if [ -d "$LATEST/full/mongo/backup" ] || [ -d "$LATEST/mongo/backup" ]; then
  echo "OK dump Mongo presente"
else
  echo "AVISO: dump Mongo não encontrado no layout esperado"
  FAIL=1
fi

if [ -f "$LATEST/backup.log" ] || [ -f "$BASE_DIR/_logs/backup-diario.log" ]; then
  echo "OK log de backup referenciado"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "Resultado: backup verificado com sucesso."
else
  echo "Resultado: revisar backup — rode: bash scripts/backup-diario.sh"
fi

exit "$FAIL"
