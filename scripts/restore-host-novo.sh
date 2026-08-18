#!/usr/bin/env bash
# Restore da stack SEMIT em um servidor Linux NOVO (Docker + Compose).
# Não execute no host de produção SEMIT sem ALLOW_ON_SEMIT=1.
set -Eeuo pipefail
umask 077

die(){ echo "[ERRO] $*" >&2; exit 1; }
ok(){ echo "==> $*"; }

BACKUP_DIR=""
TARGET="${TARGET:-$HOME/Documentos/api-gestao-publica}"
RUNTIME="${RUNTIME:-$HOME/runtime/api-gestao-publica}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-api-semit}"
LOAD_IMAGES=1
START=0
FORCE=0

usage() {
  cat <<'EOF'
Uso:
  restore-host-novo.sh --backup-dir DIR [--target DIR] [--runtime DIR]
                       [--sem-imagens] [--iniciar] --eu-autorizo-restore

Restaura projeto, segredos, certificados, Mongo, uploads, Redis e imagens Docker.
Exige Docker. Recusa rodar no hostname SEMIT (produção), salvo ALLOW_ON_SEMIT=1.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --runtime) RUNTIME="$2"; shift 2 ;;
    --sem-imagens) LOAD_IMAGES=0; shift ;;
    --iniciar) START=1; shift ;;
    --eu-autorizo-restore) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argumento desconhecido: $1" ;;
  esac
done

[ "$FORCE" = 1 ] || die "Passe --eu-autorizo-restore para continuar."
[ -n "$BACKUP_DIR" ] || die "--backup-dir é obrigatório."
BACKUP_DIR="$(readlink -f "$BACKUP_DIR")"
[ -d "$BACKUP_DIR/full" ] || die "Não achei $BACKUP_DIR/full"

HOSTN="$(hostname -s 2>/dev/null || hostname)"
if [ "$HOSTN" = "SEMIT" ] && [ "${ALLOW_ON_SEMIT:-0}" != "1" ]; then
  die "Hostname é SEMIT (produção). Este script é para servidor novo. Para forçar: ALLOW_ON_SEMIT=1"
fi

need(){ command -v "$1" >/dev/null 2>&1 || die "Instale $1"; }
need docker
need rsync
docker compose version >/dev/null 2>&1 || die "Instale o plugin docker compose."

FULL="$BACKUP_DIR/full"
[ -f "$FULL/secrets/production.env" ] || die "Falta full/secrets/production.env (backup incompleto)."
[ -d "$FULL/mongo/backup" ] || die "Falta dump Mongo."

ok "Backup: $BACKUP_DIR"
ok "Destino: $TARGET"
ok "Runtime: $RUNTIME"

########################################
# 1) Imagens
########################################
IMG_ARCHIVE="$(ls -1 "$BACKUP_DIR"/docker-images-*.tar.gz 2>/dev/null | head -1 || true)"
if [ "$LOAD_IMAGES" = 1 ]; then
  [ -n "$IMG_ARCHIVE" ] || die "Arquivo docker-images-*.tar.gz ausente. Use --sem-imagens só se for rebuildar."
  ok "Carregando imagens Docker (pode levar vários minutos)..."
  gzip -dc "$IMG_ARCHIVE" | docker load
else
  ok "Pulando docker load (--sem-imagens)."
fi

########################################
# 2) Projeto + runtime + segredos
########################################
ok "Restaurando código do projeto..."
mkdir -p "$TARGET" "$RUNTIME/secrets" "$RUNTIME/assets"
chmod 700 "$RUNTIME" "$RUNTIME/secrets"
rsync -a "$FULL/project/" "$TARGET/"
if [ -d "$FULL/runtime" ]; then
  ok "Restaurando árvore runtime..."
  rsync -a "$FULL/runtime/" "$RUNTIME/"
fi
cp -a "$FULL/secrets/production.env" "$RUNTIME/secrets/production.env"
chmod 600 "$RUNTIME/secrets/production.env"
if [ -f "$FULL/secrets/backend.env" ]; then
  cp -a "$FULL/secrets/backend.env" "$RUNTIME/secrets/backend.env"
  chmod 600 "$RUNTIME/secrets/backend.env"
fi
if [ -f "$FULL/secrets/upa-rural-service-account.json" ]; then
  mkdir -p "$HOME/.config/api-gestao-publica"
  chmod 700 "$HOME/.config/api-gestao-publica"
  cp -a "$FULL/secrets/upa-rural-service-account.json" \
    "$HOME/.config/api-gestao-publica/upa-rural-service-account.json"
  cp -a "$FULL/secrets/upa-rural-service-account.json" \
    "$RUNTIME/secrets/upa-rural-service-account.json"
  chmod 600 "$HOME/.config/api-gestao-publica/upa-rural-service-account.json" \
    "$RUNTIME/secrets/upa-rural-service-account.json"
fi
# Reescreve prefixos de path do host antigo
OLD_RUNTIME="/home/semit/runtime/api-gestao-publica"
if [ "$RUNTIME" != "$OLD_RUNTIME" ]; then
  sed -i "s|$OLD_RUNTIME|$RUNTIME|g" "$RUNTIME/secrets/production.env"
fi
ln -sfn "$RUNTIME/secrets/production.env" "$TARGET/.env"
chmod 600 "$RUNTIME/secrets/"* 2>/dev/null || true

########################################
# 3) Frontend publicado
########################################
if [ -d "$FULL/frontend-build/html" ]; then
  mkdir -p "$RUNTIME/assets/frontend-build"
  rsync -a "$FULL/frontend-build/html/" "$RUNTIME/assets/frontend-build/"
fi
if [ -d "$FULL/api/public" ]; then
  mkdir -p "$RUNTIME/assets/backend-public"
  rsync -a "$FULL/api/public/" "$RUNTIME/assets/backend-public/"
fi

########################################
# 4) Compose up infra
########################################
cd "$TARGET"
COMPOSE=(docker compose -p "$COMPOSE_PROJECT" -f docker-compose.yml)
if [ -f monitoring/docker-compose.monitoring.yml ]; then
  COMPOSE+=(-f monitoring/docker-compose.monitoring.yml)
fi

ok "Subindo mongo, redis e volumes..."
"${COMPOSE[@]}" up -d mongo redis

ok "Aguardando Mongo..."
for i in $(seq 1 60); do
  if docker exec mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1; then
    break
  fi
  sleep 2
  [ "$i" -eq 60 ] && die "Mongo não respondeu."
done

ok "Iniciando replica set rs0 se necessário..."
docker exec mongo mongosh --quiet --eval '
try {
  const s = rs.status();
  print("replica set já iniciado: " + s.set);
} catch (e) {
  const r = rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] });
  printjson(r);
}
' || true

sleep 5

########################################
# 5) Mongo restore
########################################
ok "Restaurando MongoDB (mongorestore --drop)..."
docker exec mongo rm -rf /data/restore_dump || true
docker cp "$FULL/mongo/backup/." mongo:/data/restore_dump/
docker exec mongo mongorestore --drop /data/restore_dump
docker exec mongo rm -rf /data/restore_dump || true

########################################
# 6) Uploads
########################################
ok "Restaurando volume de uploads..."
VOL="$(docker inspect api -f '{{range .Mounts}}{{if eq .Destination "/data/apicemiterio"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
if [ -z "$VOL" ]; then
  VOL="${COMPOSE_PROJECT}_apicemiterio_data"
  docker volume create "$VOL" >/dev/null
fi
docker run --rm \
  -v "$VOL":/data \
  -v "$FULL/images":/backup:ro \
  alpine sh -c "mkdir -p /data && cp -a /backup/. /data/"

########################################
# 7) Redis
########################################
if [ -d "$FULL/redis" ] && [ "$(ls -A "$FULL/redis" 2>/dev/null)" ]; then
  ok "Restaurando dados Redis..."
  "${COMPOSE[@]}" stop redis || true
  REDIS_VOL="${COMPOSE_PROJECT}_redis-data"
  docker run --rm -v "$REDIS_VOL":/data -v "$FULL/redis":/backup:ro alpine \
    sh -c "rm -rf /data/*; cp -a /backup/. /data/"
  "${COMPOSE[@]}" start redis || "${COMPOSE[@]}" up -d redis
fi

########################################
# 8) TLS
########################################
if [ -d "$FULL/letsencrypt/etc_letsencrypt" ]; then
  ok "Restaurando Let's Encrypt..."
  docker volume create "${COMPOSE_PROJECT}_letsencrypt" >/dev/null
  docker run --rm \
    -v "${COMPOSE_PROJECT}_letsencrypt":/etc/letsencrypt \
    -v "$FULL/letsencrypt/etc_letsencrypt":/backup:ro \
    alpine sh -c "rm -rf /etc/letsencrypt/*; cp -a /backup/. /etc/letsencrypt/"
fi

########################################
# 9) Subir stack
########################################
if [ "$START" = 1 ]; then
  ok "Subindo serviços restantes..."
  "${COMPOSE[@]}" up -d
  ok "Aguardando API..."
  for i in $(seq 1 36); do
    st="$(docker inspect -f '{{.State.Health.Status}}' api 2>/dev/null || echo starting)"
    echo "  health=$st"
    [ "$st" = "healthy" ] && break
    sleep 5
  done
  curl -fsS http://127.0.0.1:5000/health || die "health local falhou"
  curl -fsS http://127.0.0.1:5000/readyz || die "readyz falhou"
  echo
  ok "Restore concluído. Aponte o DNS de api.garca.sp.gov.br para este host e confira HTTPS."
else
  ok "Infra e dados restaurados. Para subir a API:"
  echo "  cd $TARGET && docker compose -p $COMPOSE_PROJECT up -d"
fi
