#!/usr/bin/env bash
# Teste de restore em Mongo isolado (NÃO altera produção).
set -Eeuo pipefail

REPO="${REPO:-/home/semit/Documentos/api-semit}"
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"
CONTAINER="${RESTORE_TEST_CONTAINER:-mongo-restore-test}"
PORT="${RESTORE_TEST_PORT:-27099}"
LOG="${REPO}/docs/RESTORE-BACKUP-LOG.md"

LATEST=$(find "$BASE_DIR" -maxdepth 1 -type d -name '20*' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
DUMP="${LATEST}/full/mongo/backup"

die() { echo "[ERRO] $*" >&2; exit 1; }
ok() { echo "[OK] $*"; }

[ -n "$LATEST" ] || die "Nenhum backup em $BASE_DIR"
[ -d "$DUMP" ] || die "Dump não encontrado: $DUMP"

echo "== Teste de restore (homologação) =="
echo "Backup: $LATEST"
echo "Dump:   $DUMP"

docker rm -f "$CONTAINER" 2>/dev/null || true

docker run -d --name "$CONTAINER" -p "127.0.0.1:${PORT}:27017" mongo:7
echo "Aguardando Mongo de teste..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1; then
    break
  fi
  sleep 1
  [ "$i" -eq 30 ] && die "Mongo de teste não respondeu"
done

docker cp "$DUMP" "${CONTAINER}:/data/restore_dump"
docker exec "$CONTAINER" mongorestore --drop /data/restore_dump

echo "--- Contagens pós-restore ---"
docker exec "$CONTAINER" mongosh --quiet --eval '
for (const name of ["apicemiterio", "govcidadao", "semit"]) {
  const n = db.getSiblingDB(name).getCollectionNames().length;
  print(name + ": " + n + " coleções");
}
print("apicemiterio.users: " + db.getSiblingDB("apicemiterio").users.countDocuments());
print("apicemiterio.sepultados: " + db.getSiblingDB("apicemiterio").sepultados.countDocuments());
'

docker rm -f "$CONTAINER" >/dev/null
ok "Restore de teste concluído (container removido)"

TS="$(date +%Y-%m-%d)"
if grep -q "Teste homologação automático" "$LOG" 2>/dev/null; then
  sed -i "s|.*Teste homologação automático.*|${TS} | script | \`${LATEST##*/}\` | ~2 min | **OK** | mongorestore em mongo:${PORT} |" "$LOG" || true
else
  cat >> "$LOG" <<EOF

| ${TS} | script | \`${LATEST##*/}\` | ~2 min | **OK** | Teste homologação automático (mongorestore em mongo:${PORT}) |
EOF
fi

echo "Log atualizado: $LOG"
