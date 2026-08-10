#!/usr/bin/env bash
set -Eeuo pipefail

# Backup completo Docker + sistema + dumps de banco.
# Destino padrão: E:\backups API-SEMIT (no WSL: /mnt/e/backups API-SEMIT).

WIN_TARGET="${WIN_TARGET:-E:\\backups API-SEMIT}"
LINUX_TARGET="${LINUX_TARGET:-/mnt/e/backups API-SEMIT}"
BASE_DIR="${BASE_DIR:-}"
PROJECT_DIR="${PROJECT_DIR:-$PWD}"
TS="$(date +%F_%H-%M-%S)"

log() { echo "[INFO] $*"; }
warn() { echo "[AVISO] $*" >&2; }
die() { echo "[ERRO] $*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "Comando '$1' não encontrado."; }

resolve_base_dir() {
  if [[ -n "$BASE_DIR" ]]; then
    printf "%s" "$BASE_DIR"
    return
  fi

  if [[ -d "$LINUX_TARGET" || -d /mnt/e ]]; then
    mkdir -p "$LINUX_TARGET"
    printf "%s" "$LINUX_TARGET"
    return
  fi

  if [[ -d "/mnt/$(echo "$WIN_TARGET" | cut -d':' -f1 | tr '[:upper:]' '[:lower:]')" ]]; then
    mkdir -p "$LINUX_TARGET"
    printf "%s" "$LINUX_TARGET"
    return
  fi

  mkdir -p "$HOME/backups/API-SEMIT"
  warn "Unidade E: nao encontrada. Usando fallback em $HOME/backups/API-SEMIT"
  printf "%s" "$HOME/backups/API-SEMIT"
}

BASE_DIR="$(resolve_base_dir)"
OUT_DIR="${BASE_DIR}/${TS}"
WORK_DIR="${OUT_DIR}/full"
LOG_FILE="${OUT_DIR}/backup.log"

mkdir -p "$WORK_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

need docker
need tar

docker info >/dev/null 2>&1 || die "Docker nao acessivel. Inicie o Docker e tente novamente."

log "Iniciando backup completo"
log "Destino base: $BASE_DIR"
log "Destino final: $OUT_DIR"

mkdir -p \
  "$WORK_DIR/system" \
  "$WORK_DIR/docker" \
  "$WORK_DIR/docker/images" \
  "$WORK_DIR/docker/containers" \
  "$WORK_DIR/docker/volumes" \
  "$WORK_DIR/docker/networks" \
  "$WORK_DIR/db_dumps" \
  "$WORK_DIR/project"

log "Coletando informacoes do sistema"
{
  echo "timestamp=$TS"
  echo "hostname=$(hostname)"
  echo "kernel=$(uname -a)"
  echo "usuario=$(id)"
} > "$WORK_DIR/system/system_info.txt"

df -h > "$WORK_DIR/system/df.txt" || true
free -h > "$WORK_DIR/system/free.txt" || true
env > "$WORK_DIR/system/environment.txt" || true

if [[ -d "$PROJECT_DIR" ]]; then
  log "Copiando snapshot do projeto: $PROJECT_DIR"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude ".git" \
      --exclude "node_modules" \
      --exclude "dist" \
      --exclude "build" \
      --exclude ".next" \
      "$PROJECT_DIR/" "$WORK_DIR/project/"
  else
    cp -a "$PROJECT_DIR/." "$WORK_DIR/project/"
  fi
fi

log "Exportando metadados Docker"
docker version > "$WORK_DIR/docker/docker_version.txt"
docker info > "$WORK_DIR/docker/docker_info.txt"
docker ps -a --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}}' > "$WORK_DIR/docker/containers/list.txt"
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' > "$WORK_DIR/docker/images/list.txt"
docker volume ls --format '{{.Name}}' > "$WORK_DIR/docker/volumes/list.txt"
docker network ls --format '{{.ID}} {{.Name}} {{.Driver}}' > "$WORK_DIR/docker/networks/list.txt"
docker compose ls > "$WORK_DIR/docker/compose_ls.txt" 2>/dev/null || true

log "Salvando imagens Docker em tar"
while IFS= read -r image_ref; do
  [[ -z "$image_ref" ]] && continue
  [[ "$image_ref" == "<none>:<none>"* ]] && continue
  safe_name="$(echo "$image_ref" | tr '/:' '__')"
  docker save -o "$WORK_DIR/docker/images/${safe_name}.tar" "$image_ref" || warn "Falha ao salvar imagem $image_ref"
done < <(docker images --format '{{.Repository}}:{{.Tag}}')

log "Exportando filesystem dos containers"
while IFS= read -r container_name; do
  [[ -z "$container_name" ]] && continue
  docker inspect "$container_name" > "$WORK_DIR/docker/containers/${container_name}.inspect.json" || true
  docker logs --tail 500 "$container_name" > "$WORK_DIR/docker/containers/${container_name}.log.txt" 2>&1 || true
  docker export "$container_name" -o "$WORK_DIR/docker/containers/${container_name}.tar" || warn "Falha ao exportar container $container_name"
done < <(docker ps -a --format '{{.Names}}')

log "Backup dos volumes Docker"
while IFS= read -r volume_name; do
  [[ -z "$volume_name" ]] && continue
  mkdir -p "$WORK_DIR/docker/volumes/$volume_name"
  docker run --rm \
    -v "${volume_name}:/source:ro" \
    -v "$WORK_DIR/docker/volumes/$volume_name:/backup" \
    alpine sh -c "cd /source && tar -czf /backup/${volume_name}.tar.gz ." \
    || warn "Falha no volume $volume_name"
done < <(docker volume ls --format '{{.Name}}')

log "Inspecionando redes Docker"
while IFS= read -r network_name; do
  [[ -z "$network_name" ]] && continue
  docker network inspect "$network_name" > "$WORK_DIR/docker/networks/${network_name}.json" || true
done < <(docker network ls --format '{{.Name}}')

run_dump_postgres() {
  local c="$1"
  local user db auth
  user="$(docker exec "$c" sh -lc 'printf "%s" "${POSTGRES_USER:-postgres}"' 2>/dev/null || true)"
  db="$(docker exec "$c" sh -lc 'printf "%s" "${POSTGRES_DB:-postgres}"' 2>/dev/null || true)"
  auth="PGPASSWORD=\"${POSTGRES_PASSWORD:-}\""
  [[ -z "$user" ]] && user="postgres"
  [[ -z "$db" ]] && db="postgres"
  docker exec "$c" sh -lc "$auth pg_dumpall -U \"$user\"" > "$WORK_DIR/db_dumps/${c}_postgres_all.sql" 2>/dev/null \
    || warn "Falha no dump Postgres do container $c"
  docker exec "$c" sh -lc "$auth pg_dump -U \"$user\" \"$db\"" > "$WORK_DIR/db_dumps/${c}_postgres_${db}.sql" 2>/dev/null \
    || true
}

run_dump_mongo() {
  local c="$1"
  docker exec "$c" sh -lc 'rm -rf /tmp/backup_mongo && mongodump --out /tmp/backup_mongo' 2>/dev/null \
    || { warn "Falha no mongodump do container $c"; return; }
  docker cp "$c:/tmp/backup_mongo" "$WORK_DIR/db_dumps/${c}_mongo_dump" || warn "Falha ao copiar dump Mongo de $c"
}

run_dump_mysql() {
  local c="$1"
  local user pass
  user="$(docker exec "$c" sh -lc 'printf "%s" "${MYSQL_USER:-${MARIADB_USER:-root}}"' 2>/dev/null || true)"
  pass="$(docker exec "$c" sh -lc 'printf "%s" "${MYSQL_PASSWORD:-${MARIADB_PASSWORD:-${MYSQL_ROOT_PASSWORD:-${MARIADB_ROOT_PASSWORD:-}}}}"' 2>/dev/null || true)"
  [[ -z "$user" ]] && user="root"
  docker exec "$c" sh -lc "mysqldump -u\"$user\" -p\"$pass\" --all-databases --routines --events --triggers" \
    > "$WORK_DIR/db_dumps/${c}_mysql_all.sql" 2>/dev/null \
    || warn "Falha no mysqldump do container $c"
}

log "Gerando dumps de bancos (detecao automatica)"
while IFS= read -r c; do
  [[ -z "$c" ]] && continue
  img="$(docker inspect -f '{{.Config.Image}}' "$c" 2>/dev/null || true)"
  case "$img" in
    *postgres*|*timescale*)
      log "Dump Postgres: $c"
      run_dump_postgres "$c"
      ;;
    *mongo*)
      log "Dump MongoDB: $c"
      run_dump_mongo "$c"
      ;;
    *mysql*|*mariadb*)
      log "Dump MySQL/MariaDB: $c"
      run_dump_mysql "$c"
      ;;
    *)
      if docker exec "$c" sh -lc 'command -v mongodump >/dev/null 2>&1' >/dev/null 2>&1; then
        log "Dump MongoDB (fallback): $c"
        run_dump_mongo "$c"
      elif docker exec "$c" sh -lc 'command -v pg_dump >/dev/null 2>&1' >/dev/null 2>&1; then
        log "Dump Postgres (fallback): $c"
        run_dump_postgres "$c"
      elif docker exec "$c" sh -lc 'command -v mysqldump >/dev/null 2>&1' >/dev/null 2>&1; then
        log "Dump MySQL (fallback): $c"
        run_dump_mysql "$c"
      fi
      ;;
  esac
done < <(docker ps --format '{{.Names}}')

log "Compactando backup final"
(
  cd "$OUT_DIR"
  tar -czf "api-semit-backup-completo-${TS}.tar.gz" full
)

log "Backup concluido com sucesso"
echo
echo "Arquivo final: $OUT_DIR/api-semit-backup-completo-${TS}.tar.gz"
echo "Pasta completa: $OUT_DIR/full"
echo "Log: $LOG_FILE"
echo
echo "Restaurar imagens: docker load -i <arquivo.tar>"
echo "Restaurar container exportado: docker import <container.tar> <novo_nome:tag>"
