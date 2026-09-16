#!/bin/bash
set -euo pipefail
OLD='Uma conta municipal. O mesmo acesso da Cultura, da Agenda e dos demais serviços da Prefeitura.'
NEW='Com uma única conta, você acessa os serviços da Prefeitura de forma simples e prática.'

echo "=== live index.html ==="
# find turismo public path from nginx or common locations
for d in \
  /home/semit/Documentos/api-semit/backend/public/turismo \
  /home/semit/Documentos/api-semit/mapaturistico/public/turismo \
  /var/www/turismo
do
  [ -d "$d" ] && echo "dir $d" && ls "$d" | head -20
done

# resolve from nginx
docker exec nginx sh -c 'grep -n "turismo" /etc/nginx/conf.d/default.conf | head -40'

echo "=== find phrase in assets ==="
# search common public roots
FOUND=$(grep -RIl --include='*.js' -F "$OLD" /home/semit/Documentos/api-semit 2>/dev/null | head -20 || true)
echo "$FOUND"

if [ -z "$FOUND" ]; then
  # try inside container mount
  FOUND=$(docker exec api sh -c "grep -RIl --include='*.js' -F '$OLD' /app/public /mapaturistico-public 2>/dev/null" | head -20 || true)
  echo "in container: $FOUND"
fi

# Also check live URL asset name
ASSET=$(curl -sk https://127.0.0.1/turismo/cadastro | grep -oE '/turismo/assets/index-[^"]+\.js' | head -1 || true)
echo "asset=$ASSET"
if [ -n "$ASSET" ]; then
  BASE=$(basename "$ASSET")
  # locate file on disk
  FILE=$(find /home/semit/Documentos/api-semit -name "$BASE" 2>/dev/null | head -5)
  echo "file candidates: $FILE"
  for f in $FILE; do
    if grep -Fq "$OLD" "$f"; then
      cp -a "$f" "$f.bak-authphrase-$(date +%Y%m%d%H%M%S)"
      python3 - <<PY
from pathlib import Path
p = Path("$f")
t = p.read_text(encoding='utf-8')
old = """$OLD"""
new = """$NEW"""
c = t.count(old)
print('count', c, 'in', p)
if c == 0:
    raise SystemExit('phrase not found')
p.write_text(t.replace(old, new), encoding='utf-8')
print('replaced ok')
PY
    fi
  done
fi

# verify
curl -sk "https://127.0.0.1${ASSET}" 2>/dev/null | grep -Fo "$NEW" | head -1 || true
curl -sk "https://127.0.0.1${ASSET}" 2>/dev/null | grep -Fo "$OLD" | head -1 || echo "old phrase gone from asset"
echo DONE
