#!/usr/bin/env bash
# Restaura o dump mais recente em Mongo isolado; não altera produção.
set -Eeuo pipefail

REPO="${REPO:-/home/semit/Documentos/api-gestao-publica}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
CONTAINER="${RESTORE_TEST_CONTAINER:-mongo-restore-test-$$}"
LOG="${REPO}/docs/RESTORE-BACKUP-LOG.md"
UPDATE_LOG="${UPDATE_LOG:-1}"
START_EPOCH="$(date +%s)"

LATEST_NAME="$(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -printf '%f\n' | sort -r | head -1)"
LATEST="$BASE_DIR/$LATEST_NAME"
DUMP="$LATEST/full/mongo/backup"

die() { echo "[ERRO] $*" >&2; exit 1; }
ok() { echo "[OK] $*"; }
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

[ -n "$LATEST_NAME" ] || die "Nenhum backup em $BASE_DIR"
[ -d "$DUMP" ] || die "Dump não encontrado: $DUMP"
MONGO_IMAGE="${RESTORE_TEST_IMAGE:-$(docker inspect -f '{{.Config.Image}}' mongo 2>/dev/null || true)}"
[ -n "$MONGO_IMAGE" ] || MONGO_IMAGE="mongo:6"

echo "== Teste de restore isolado =="
echo "Backup: $LATEST"
echo "Imagem: $MONGO_IMAGE"

docker run -d --name "$CONTAINER" --network none "$MONGO_IMAGE" >/dev/null
for i in $(seq 1 60); do
  docker exec "$CONTAINER" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1 && break
  [ "$i" -eq 60 ] && die "Mongo de teste não respondeu"
  sleep 1
done

docker cp "$DUMP/." "${CONTAINER}:/data/restore_dump/"
docker exec "$CONTAINER" mongorestore --drop /data/restore_dump

SUMMARY="$(docker exec "$CONTAINER" mongosh --quiet --eval '
let dbs=0, cols=0, docs=0;
for (const info of db.adminCommand({listDatabases:1}).databases) {
  if (["admin","config","local"].includes(info.name)) continue;
  dbs++;
  const d=db.getSiblingDB(info.name);
  for (const c of d.getCollectionNames()) { cols++; docs += d.getCollection(c).countDocuments(); }
}
print(`databases=${dbs} collections=${cols} documents=${docs}`);
if (dbs < 1 || cols < 1 || docs < 1) quit(2);
')" || die "restore concluído, mas validação de conteúdo falhou"
echo "$SUMMARY"
ok "Restore e consultas concluídos; produção permaneceu intocada"

if [ "$UPDATE_LOG" = "1" ]; then
  ELAPSED=$(( $(date +%s) - START_EPOCH ))
  printf '| %s | teste automatizado | `%s` | %ss | **OK** | Mongo isolado (`%s`); %s |\n' \
    "$(date +%F)" "$LATEST_NAME" "$ELAPSED" "$MONGO_IMAGE" "$SUMMARY" >> "$LOG"
  echo "Log atualizado: $LOG"
fi
