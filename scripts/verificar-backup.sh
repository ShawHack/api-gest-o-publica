#!/usr/bin/env bash
# Verifica idade, conteúdo mínimo e integridade do pacote do backup mais recente.
set -Eeuo pipefail

BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
VERIFY_ARCHIVE="${VERIFY_ARCHIVE:-1}"
FAIL=0

ok() { echo "OK $*"; }
fail() { echo "ERRO: $*" >&2; FAIL=1; }

echo "Verificando backups em: $BASE_DIR"
[ -d "$BASE_DIR" ] || { echo "ERRO: diretório de backups não existe." >&2; exit 1; }

# O nome contém data/hora em ordem lexical; não depende do mtime da pasta.
LATEST="$(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d \
  -name '20??-??-??_??-??-??' -printf '%f\n' 2>/dev/null | sort -r | head -1)"
[ -n "$LATEST" ] || { echo "ERRO: nenhum backup datado encontrado." >&2; exit 1; }
LATEST="$BASE_DIR/$LATEST"
echo "Último backup: $LATEST"

AGE_SEC=$(( $(date +%s) - $(stat -c %Y "$LATEST") ))
AGE_H=$(( AGE_SEC / 3600 ))
if [ "$AGE_SEC" -lt 0 ] || [ "$AGE_H" -gt "$MAX_AGE_HOURS" ]; then
  fail "backup tem ${AGE_H}h (limite ${MAX_AGE_HOURS}h)"
else
  ok "idade do backup: ${AGE_H}h"
fi

DUMP="$LATEST/full/mongo/backup"
if [ -d "$DUMP" ]; then
  BSON_COUNT="$(find "$DUMP" -type f -name '*.bson' -size +0c | wc -l)"
  [ "$BSON_COUNT" -gt 0 ] && ok "dump Mongo presente (${BSON_COUNT} BSON não vazios)" \
    || fail "dump Mongo não contém BSON não vazio"
else
  fail "dump Mongo não encontrado em $DUMP"
fi

for required in full/project full/api full/images full/project-root backup.log; do
  [ -e "$LATEST/$required" ] && ok "$required presente" || fail "$required ausente"
done

mapfile -t ARCHIVES < <(find "$LATEST" -maxdepth 1 -type f -name '*.tar.gz' -size +0c -print)
if [ "${#ARCHIVES[@]}" -ne 1 ]; then
  fail "esperado exatamente 1 arquivo .tar.gz não vazio; encontrados ${#ARCHIVES[@]}"
elif [ "$VERIFY_ARCHIVE" = "1" ]; then
  ARCHIVE="${ARCHIVES[0]}"
  echo "Validando integralmente o arquivo: $ARCHIVE"
  if gzip -t -- "$ARCHIVE"; then
    ok "fluxo gzip íntegro"
  else
    fail "arquivo gzip corrompido ou truncado"
  fi
else
  ok "arquivo compactado presente (validação integral desativada)"
fi

if grep -Eqi '^\[ERRO\]|(^|[^[:alpha:]])error([^[:alpha:]]|$)|no space left|unexpected end' "$LATEST/backup.log"; then
  fail "backup.log contém indicação de erro"
else
  ok "backup.log sem indicação de erro fatal"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "Resultado: backup verificado com sucesso."
else
  echo "Resultado: backup inválido ou incompleto." >&2
fi
exit "$FAIL"
