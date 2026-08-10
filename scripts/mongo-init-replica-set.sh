#!/usr/bin/env bash
# Inicializa replica set rs0 no Mongo (idempotente). Rodar após mongo subir com --replSet rs0.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RS_NAME="${MONGO_RS_NAME:-rs0}"
MEMBER_HOST="${MONGO_RS_MEMBER:-mongo:27017}"

echo "Verificando/inicializando replica set ${RS_NAME} (${MEMBER_HOST})..."

docker compose exec -T mongo mongosh --quiet --eval "
const name = '${RS_NAME}';
try {
  const st = rs.status();
  if (st.ok === 1) {
    print('OK: replica set já iniciado — ' + st.set);
    quit(0);
  }
} catch (e) {
  print('Iniciando replica set...');
}
const cfg = { _id: name, members: [{ _id: 0, host: '${MEMBER_HOST}' }] };
const r = rs.initiate(cfg);
printjson(r);
"

echo "Aguardando PRIMARY..."
for i in $(seq 1 30); do
  state=$(docker compose exec -T mongo mongosh --quiet --eval "try { print(rs.status().members[0].stateStr) } catch(e) { print('UNKNOWN') }" 2>/dev/null | tail -1)
  if [ "$state" = "PRIMARY" ]; then
    echo "OK: Mongo PRIMARY"
    exit 0
  fi
  sleep 2
done

echo "ERRO: Mongo não ficou PRIMARY a tempo" >&2
exit 1
