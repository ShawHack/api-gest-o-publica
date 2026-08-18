#!/usr/bin/env bash
# Backup completo da API SEMIT — suficiente para restaurar em outro servidor.
set -Eeuo pipefail
umask 077

API_C="${API_C:-api}"
MONGO_C="${MONGO_C:-mongo}"
REDIS_C="${REDIS_C:-redis}"
NGINX_C="${NGINX_C:-nginx}"
CERTBOT_C="${CERTBOT_C:-certbot}"

PROJ_DIR="${PROJ_DIR:-$HOME/Documentos/api-gestao-publica}"
BASE_DIR="${BASE_DIR:-$HOME/Documentos/backups-completos}"
RUNTIME_DIR="${RUNTIME_DIR:-$HOME/runtime/api-gestao-publica}"
INCLUDE_DOCKER_IMAGES="${INCLUDE_DOCKER_IMAGES:-1}"
INCLUDE_RUNTIME="${INCLUDE_RUNTIME:-1}"

TS="$(date +%F_%H-%M-%S)"
OUT_DIR="${BASE_DIR}/${TS}"
WORK="${OUT_DIR}/full"
LOG="${OUT_DIR}/backup.log"

mkdir -p "${WORK}"
chmod 700 "${OUT_DIR}" "${WORK}"
exec > >(tee -a "${LOG}") 2>&1

die(){ echo "[ERRO] $*" >&2; exit 1; }
warn(){ echo "[AVISO] $*" >&2; }
ok(){ echo ""; echo "==> $*"; }

need(){ command -v "$1" >/dev/null 2>&1 || die "Comando '$1' não encontrado."; }
is_running(){ docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -qi true; }
copy_secret_file() {
  local src="$1" dest="$2"
  [ -e "$src" ] || return 1
  mkdir -p "$(dirname "$dest")"
  cp -L --remove-destination "$src" "$dest"
  chmod 600 "$dest"
  return 0
}

need docker
docker ps >/dev/null 2>&1 || die "Docker não acessível."
[ -d "${PROJ_DIR}" ] || die "Projeto não encontrado: ${PROJ_DIR}"

ok "Iniciando backup completo - ${TS}"
ok "Projeto: ${PROJ_DIR}"
ok "Saída: ${OUT_DIR}"

########################################
# 0) Snapshot do projeto (sem seguir symlinks globais)
########################################
ok "Copiando projeto do host..."
mkdir -p "${WORK}/project"
rsync -a --delete \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=build \
  "${PROJ_DIR}/" "${WORK}/project/"
# Evita .env-symlink morto no restore
if [ -L "${WORK}/project/.env" ]; then
  rm -f "${WORK}/project/.env"
fi

########################################
# 1) Código da API no container (sem node_modules)
########################################
ok "Copiando código da API do container '${API_C}'..."
is_running "${API_C}" || die "Container ${API_C} não está rodando."
APP_DIR="$(docker inspect -f '{{.Config.WorkingDir}}' "${API_C}" 2>/dev/null || true)"
[ -n "${APP_DIR}" ] || APP_DIR="/app"
mkdir -p "${WORK}/api"
docker exec "${API_C}" tar -C "${APP_DIR}" --exclude=node_modules -cf - . \
  | tar -C "${WORK}/api" -xf -
chmod 700 "${WORK}/api"
if docker exec "${API_C}" test -f "${APP_DIR}/.env"; then
  docker cp "${API_C}:${APP_DIR}/.env" "${WORK}/api/.env.container"
  chmod 600 "${WORK}/api/.env.container"
fi

########################################
# 2) Uploads
########################################
ok "Copiando uploads /data/apicemiterio..."
mkdir -p "${WORK}/images"
if docker exec "${API_C}" test -d /data/apicemiterio; then
  docker cp "${API_C}:/data/apicemiterio/." "${WORK}/images/"
else
  warn "Pasta /data/apicemiterio ausente no container."
fi

########################################
# 3) MongoDB
########################################
ok "Dump do MongoDB..."
is_running "${MONGO_C}" || die "Container ${MONGO_C} não está rodando."
BACKUP_PATH="/data/backup_${TS}"
docker exec "${MONGO_C}" sh -lc "rm -rf ${BACKUP_PATH} && mongodump --out ${BACKUP_PATH}"
mkdir -p "${WORK}/mongo"
docker cp "${MONGO_C}:${BACKUP_PATH}" "${WORK}/mongo/backup"
docker exec "${MONGO_C}" rm -rf "${BACKUP_PATH}" || true

########################################
# 4) Frontend fonte
########################################
if [ -d "${PROJ_DIR}/frontend" ]; then
  ok "Copiando fonte do frontend..."
  rsync -a --delete --exclude=node_modules --exclude=dist --exclude=build \
    "${PROJ_DIR}/frontend/" "${WORK}/frontend-src/"
fi

########################################
# 5) Frontend publicado + Nginx
########################################
if is_running "${NGINX_C}"; then
  ok "Copiando build do Nginx e configs..."
  mkdir -p "${WORK}/frontend-build" "${WORK}/nginx"
  docker cp "${NGINX_C}:/usr/share/nginx/html" "${WORK}/frontend-build/html" || warn "HTML do Nginx não copiado."
  docker cp "${NGINX_C}:/etc/nginx" "${WORK}/nginx/etc_nginx" || warn "Config do Nginx não copiada."
else
  warn "Container nginx parado."
fi

########################################
# 6) Variáveis efetivas (perm 600)
########################################
ok "Exportando ambiente dos containers (arquivo restrito)..."
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${API_C}" > "${WORK}/env_runtime_api.txt"
chmod 600 "${WORK}/env_runtime_api.txt"
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${MONGO_C}" > "${WORK}/env_runtime_mongo.txt" || true
is_running "${NGINX_C}" && docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${NGINX_C}" > "${WORK}/env_runtime_nginx.txt" || true
is_running "${CERTBOT_C}" && docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${CERTBOT_C}" > "${WORK}/env_runtime_certbot.txt" || true
chmod 600 "${WORK}"/env_runtime_*.txt 2>/dev/null || true

########################################
# 7) Let's Encrypt
########################################
ok "Copiando certificados TLS..."
mkdir -p "${WORK}/letsencrypt"
if is_running "${CERTBOT_C}"; then
  docker cp "${CERTBOT_C}:/etc/letsencrypt" "${WORK}/letsencrypt/etc_letsencrypt" || warn "Falha ao copiar certbot."
  docker cp "${CERTBOT_C}:/var/lib/letsencrypt" "${WORK}/letsencrypt/var_lib_letsencrypt" 2>/dev/null || true
else
  warn "certbot não está rodando; tentando volume Docker."
  if docker volume inspect api-semit_letsencrypt >/dev/null 2>&1; then
    docker run --rm -v api-semit_letsencrypt:/etc/letsencrypt:ro -v "${WORK}/letsencrypt:/out" alpine \
      sh -c "cp -a /etc/letsencrypt /out/etc_letsencrypt"
  fi
fi
chmod 700 "${WORK}/letsencrypt" || true

########################################
# 8) Compose / nginx do projeto
########################################
ok "Copiando compose e nginx do projeto..."
mkdir -p "${WORK}/project-root"
for f in docker-compose.yml docker-compose.yaml Dockerfile nginx monitoring; do
  [ -e "${PROJ_DIR}/$f" ] && cp -a "${PROJ_DIR}/$f" "${WORK}/project-root/" || true
done
if [ -e "${PROJ_DIR}/.env" ]; then
  copy_secret_file "${PROJ_DIR}/.env" "${WORK}/project-root/production.env" || true
fi

########################################
# 9) Segredos reais (não symlink)
########################################
ok "Copiando segredos dereferenciados..."
SECRETS="${WORK}/secrets"
mkdir -p "${SECRETS}"
chmod 700 "${SECRETS}"
SECRET_OK=0
if copy_secret_file "${PROJ_DIR}/.env" "${SECRETS}/production.env"; then
  SECRET_OK=1
fi
if [ -f "${RUNTIME_DIR}/secrets/production.env" ]; then
  copy_secret_file "${RUNTIME_DIR}/secrets/production.env" "${SECRETS}/production.env"
  SECRET_OK=1
fi
if [ -f "${RUNTIME_DIR}/secrets/backend.env" ]; then
  copy_secret_file "${RUNTIME_DIR}/secrets/backend.env" "${SECRETS}/backend.env"
  SECRET_OK=1
fi
# Firebase / service accounts
FIREBASE_JSON="${ROTAS_FIREBASE_CREDENTIALS_FILE:-$HOME/.config/api-gestao-publica/upa-rural-service-account.json}"
if [ -f "${FIREBASE_JSON}" ]; then
  copy_secret_file "${FIREBASE_JSON}" "${SECRETS}/upa-rural-service-account.json"
  SECRET_OK=1
fi
if [ -d "${HOME}/.config/api-gestao-publica" ]; then
  mkdir -p "${SECRETS}/dot-config"
  find "${HOME}/.config/api-gestao-publica" -maxdepth 1 -type f -name '*.json' -print0 \
    | while IFS= read -r -d '' f; do
        copy_secret_file "$f" "${SECRETS}/dot-config/$(basename "$f")" || true
      done
fi
[ "$SECRET_OK" = 1 ] || die "Nenhum arquivo de segredo foi copiado."
# Inventário de nomes, sem conteúdo
{
  echo "production.env=$([ -f "${SECRETS}/production.env" ] && echo presente || echo ausente)"
  echo "backend.env=$([ -f "${SECRETS}/backend.env" ] && echo presente || echo ausente)"
  echo "firebase_json=$([ -f "${SECRETS}/upa-rural-service-account.json" ] && echo presente || echo ausente)"
} > "${SECRETS}/MANIFEST.txt"
chmod 600 "${SECRETS}/MANIFEST.txt"

########################################
# 10) Runtime (assets + secrets) — layout do host
########################################
if [ "${INCLUDE_RUNTIME}" = "1" ] && [ -d "${RUNTIME_DIR}" ]; then
  ok "Copiando árvore runtime ${RUNTIME_DIR}..."
  mkdir -p "${WORK}/runtime"
  rsync -a --copy-links \
    --exclude='*.tmp' \
    "${RUNTIME_DIR}/" "${WORK}/runtime/"
  find "${WORK}/runtime/secrets" -type f -exec chmod 600 {} \; 2>/dev/null || true
  chmod 700 "${WORK}/runtime/secrets" 2>/dev/null || true
fi

########################################
# 11) Redis
########################################
ok "Copiando persistência Redis..."
mkdir -p "${WORK}/redis"
if is_running "${REDIS_C}"; then
  LAST=$(docker exec "${REDIS_C}" redis-cli LASTSAVE | tr -d '\r')
  docker exec "${REDIS_C}" redis-cli BGSAVE >/dev/null || warn "BGSAVE falhou."
  for _ in $(seq 1 30); do
    INPROG=$(docker exec "${REDIS_C}" redis-cli INFO persistence | awk -F: '/rdb_bgsave_in_progress/{gsub(/\r/,"",$2); print $2}')
    NOW=$(docker exec "${REDIS_C}" redis-cli LASTSAVE | tr -d '\r')
    if [ "${INPROG:-1}" = "0" ] && [ "$NOW" != "$LAST" ]; then
      break
    fi
    if [ "${INPROG:-1}" = "0" ]; then
      break
    fi
    sleep 1
  done
  docker cp "${REDIS_C}:/data/." "${WORK}/redis/" || warn "Cópia Redis incompleta."
else
  warn "Container redis parado."
fi

########################################
# 12) Inventário do host (sem segredos)
########################################
ok "Gravando inventário para restore em host novo..."
python3 - << PY
import json, socket, subprocess, datetime
from pathlib import Path

def sh(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.stdout.strip(), p.returncode

images = []
compose_files = ""
working_dir = "${PROJ_DIR}"
project = "api-semit"
for name in ["api","mongo","redis","nginx","certbot","email-worker","job-worker","govcidadao-api","govcidadao-frontend","ferramentas"]:
    out, rc = sh(["docker","inspect",name])
    if rc != 0:
        continue
    c = json.loads(out)[0]
    labels = c.get("Config", {}).get("Labels") or {}
    images.append({
        "container": name,
        "image": c.get("Config",{}).get("Image"),
        "image_id": c.get("Image"),
        "status": c.get("State",{}).get("Status"),
    })
    if name == "api":
        compose_files = labels.get("com.docker.compose.project.config_files","")
        working_dir = labels.get("com.docker.compose.project.working_dir") or working_dir
        project = labels.get("com.docker.compose.project") or project

commit, _ = sh(["git","-C", r"${PROJ_DIR}", "rev-parse", "HEAD"])
volumes, _ = sh(["docker","volume","ls","-q"])
inv = {
    "created_at": datetime.datetime.now().astimezone().isoformat(),
    "hostname": socket.gethostname(),
    "backup_id": "${TS}",
    "project_dir": r"${PROJ_DIR}",
    "runtime_dir": r"${RUNTIME_DIR}",
    "compose_project": project,
    "compose_files": [p for p in compose_files.split(",") if p],
    "working_dir": working_dir,
    "git_commit": commit,
    "mongo_replset": "rs0",
    "public_url": "https://api.garca.sp.gov.br",
    "containers": images,
    "named_volumes": [v for v in volumes.splitlines() if v.startswith("api-semit") or v.startswith("api-gestao")],
}
Path(r"${WORK}/inventory.json").write_text(json.dumps(inv, indent=2), encoding="utf-8")
print("inventory.json escrito")
PY

########################################
# 13) Imagens Docker (air-gap)
########################################
IMG_LIST=(
  "api-semit-api:latest"
  "api-semit-email-worker:latest"
  "api-semit-job-worker:latest"
  "api-semit-govcidadao-api:latest"
  "api-semit-govcidadao-frontend:latest"
  "api-semit-ferramentas:latest"
  "mongo:6"
  "redis:7-alpine"
  "nginx:alpine"
  "certbot/certbot"
)
SAVE_IMGS=()
if [ "${INCLUDE_DOCKER_IMAGES}" = "1" ]; then
  ok "Salvando imagens Docker..."
  for img in "${IMG_LIST[@]}"; do
    if docker image inspect "$img" >/dev/null 2>&1; then
      SAVE_IMGS+=("$img")
    else
      warn "Imagem ausente, não será salva: $img"
    fi
  done
  [ "${#SAVE_IMGS[@]}" -ge 4 ] || die "Poucas imagens Docker encontradas para um restore em host novo."
  printf '%s\n' "${SAVE_IMGS[@]}" > "${OUT_DIR}/docker-images.txt"
  docker save "${SAVE_IMGS[@]}" | gzip -1 > "${OUT_DIR}/docker-images-${TS}.tar.gz"
  chmod 600 "${OUT_DIR}/docker-images-${TS}.tar.gz"
  ok "Imagens salvas: ${#SAVE_IMGS[@]}"
else
  warn "INCLUDE_DOCKER_IMAGES=0 — restore em host novo exigirá rebuild."
fi

########################################
# 14) Compactar payload full/
########################################
ok "Compactando payload full/..."
cd "${OUT_DIR}"
TARBALL="api-semit-backup-${TS}.tar.gz"
tar -czf "${TARBALL}" full/
chmod 600 "${TARBALL}" "${LOG}"
chmod 700 "${WORK}" "${OUT_DIR}"

########################################
# 15) Resumo
########################################
ok "Tamanhos:"
du -sh "${WORK}"/* "${OUT_DIR}"/*.tar.gz 2>/dev/null || true
echo
echo "Backup concluído."
echo "Payload: ${OUT_DIR}/${TARBALL}"
echo "Imagens: ${OUT_DIR}/docker-images-${TS}.tar.gz"
echo "Log:     ${LOG}"
echo "Restore: scripts/restore-host-novo.sh --backup-dir ${OUT_DIR}"
