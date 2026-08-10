#!/usr/bin/env bash
set -Eeuo pipefail

########################################
# Config editável
########################################
API_C="${API_C:-api}"         # container da API
MONGO_C="${MONGO_C:-mongo}"   # container do Mongo
NGINX_C="${NGINX_C:-nginx}"   # container do Nginx (serve o build do frontend)
CERTBOT_C="${CERTBOT_C:-certbot}"  # container do Certbot (se existir)

# Diretório do projeto no host
PROJ_DIR="${PROJ_DIR:-$HOME/Documentos/api-semit}"

# Onde salvar os backups
BASE_DIR="${BASE_DIR:-$HOME/Documentos/backups-completos}"

########################################
# Setup
########################################
TS="$(date +%F_%H-%M-%S)"
OUT_DIR="${BASE_DIR}/${TS}"
WORK="${OUT_DIR}/full"
LOG="${OUT_DIR}/backup.log"

mkdir -p "${WORK}"
exec > >(tee -a "${LOG}") 2>&1

die(){ echo "[ERRO] $*" >&2; exit 1; }
warn(){ echo "[AVISO] $*" >&2; }
ok(){ echo -e "\n==> $*"; }

need(){ command -v "$1" >/dev/null 2>&1 || die "Comando '$1' não encontrado."; }
is_running(){ docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null | grep -qi true; }

need docker
docker ps >/dev/null 2>&1 || die "Docker não acessível. Inicie o Docker."

ok "Iniciando backup completo - ${TS}"
ok "Saída: ${OUT_DIR}"
ok "Log:   ${LOG}"

########################################
# 0) Snapshot de arquivos do projeto no host
########################################
ok "Copiando projeto do host (${PROJ_DIR})..."
mkdir -p "${WORK}/project"
if [ -d "${PROJ_DIR}" ]; then
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude=node_modules \
      --exclude=.git \
      --exclude=dist \
      --exclude=build \
      "${PROJ_DIR}/" "${WORK}/project/"
  else
    cp -a "${PROJ_DIR}/." "${WORK}/project/" || warn "Falha ao copiar snapshot do projeto (sem rsync)."
  fi
else
  warn "Diretório do projeto ${PROJ_DIR} não existe. Pulando."
fi

########################################
# 1) Código da API (dentro do container)
########################################
ok "Detectando diretório da API dentro do container '${API_C}'..."
APP_DIR="$(docker inspect -f '{{.Config.WorkingDir}}' "${API_C}" 2>/dev/null || true)"
if [ -z "${APP_DIR}" ]; then
  APP_DIR="$(docker exec "${API_C}" sh -lc 'find / -maxdepth 3 -type f -name package.json 2>/dev/null | head -1 | xargs -r dirname' || true)"
fi
[ -n "${APP_DIR}" ] || die "Não consegui localizar a pasta do app dentro do container '${API_C}'."
ok "APP_DIR=${APP_DIR}"

ok "Copiando código da API..."
docker cp "${API_C}:${APP_DIR}" "${WORK}/api"

# .env da API (se existir no container)
if docker exec "${API_C}" sh -lc "test -f ${APP_DIR}/.env"; then
  ok "Copiando .env do backend (container)..."
  docker cp "${API_C}:${APP_DIR}/.env" "${WORK}/api/.env.container"
fi

########################################
# 2) Uploads / Imagens
########################################
ok "Copiando uploads de imagens..."
mkdir -p "${WORK}/images"
if docker exec "${API_C}" sh -lc 'test -d /data/apicemiterio'; then
  docker cp "${API_C}:/data/apicemiterio/." "${WORK}/images/"
  ok "Imagens copiadas de /data/apicemiterio"
else
  if docker exec "${API_C}" sh -lc "test -d ${APP_DIR}/public/images"; then
    docker cp "${API_C}:${APP_DIR}/public/images/." "${WORK}/images/"
    ok "Imagens copiadas de ${APP_DIR}/public/images"
  else
    warn "Nenhuma pasta de imagens encontrada (/data/apicemiterio ou public/images)."
  fi
fi

########################################
# 3) Dump do MongoDB (lógico)
########################################
ok "Gerando dump do MongoDB em '${MONGO_C}'..."
BACKUP_PATH="/data/backup_${TS}"
docker exec "${MONGO_C}" sh -lc "rm -rf ${BACKUP_PATH} && mongodump --out ${BACKUP_PATH}"

ok "Copiando dump do MongoDB para o host..."
mkdir -p "${WORK}/mongo"
docker cp "${MONGO_C}:${BACKUP_PATH}" "${WORK}/mongo/backup"

########################################
# 4) Frontend (código-fonte do host)
########################################
if [ -d "${PROJ_DIR}/frontend" ]; then
  ok "Copiando FRONTEND (código-fonte) do host..."
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude=node_modules \
      --exclude=dist \
      --exclude=build \
      "${PROJ_DIR}/frontend/" "${WORK}/frontend-src/"
  else
    mkdir -p "${WORK}/frontend-src"
    cp -a "${PROJ_DIR}/frontend/." "${WORK}/frontend-src/" || warn "Falha ao copiar frontend-src (sem rsync)."
  fi
else
  warn "Não encontrei ${PROJ_DIR}/frontend (código-fonte)."
fi

########################################
# 5) Frontend (build em produção no Nginx)
########################################
if is_running "${NGINX_C}"; then
  ok "Copiando FRONTEND (build do Nginx) e configs..."
  mkdir -p "${WORK}/frontend-build" "${WORK}/nginx"
  docker cp "${NGINX_C}:/usr/share/nginx/html" "${WORK}/frontend-build/html" || warn "HTML do Nginx não copiado."
  docker cp "${NGINX_C}:/etc/nginx"            "${WORK}/nginx/etc_nginx"     || warn "Config do Nginx não copiada."
else
  warn "Container '${NGINX_C}' não está rodando. Pulando cópia do build do frontend e conf do Nginx."
fi

########################################
# 6) Variáveis de ambiente efetivas
########################################
ok "Exportando variáveis de ambiente dos containers..."
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${API_C}"   > "${WORK}/env_runtime_api.txt"   || true
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${MONGO_C}" > "${WORK}/env_runtime_mongo.txt" || true
is_running "${NGINX_C}" && docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${NGINX_C}" > "${WORK}/env_runtime_nginx.txt" || true
is_running "${CERTBOT_C}" && docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "${CERTBOT_C}" > "${WORK}/env_runtime_certbot.txt" || true

########################################
# 7) Certificados Let's Encrypt (TLS)
########################################
ok "Copiando certificados Let's Encrypt..."

mkdir -p "${WORK}/letsencrypt"

# A) Se houver container certbot, copia de lá
if is_running "${CERTBOT_C}"; then
  docker cp "${CERTBOT_C}:/etc/letsencrypt" "${WORK}/letsencrypt/etc_letsencrypt" || warn "Falha ao copiar /etc/letsencrypt do container certbot."
  # (opcional) meta/contas/logs se existirem no container
  docker cp "${CERTBOT_C}:/var/lib/letsencrypt"  "${WORK}/letsencrypt/var_lib_letsencrypt"  2>/dev/null || true
  docker cp "${CERTBOT_C}:/var/log/letsencrypt"  "${WORK}/letsencrypt/var_log_letsencrypt"  2>/dev/null || true
else
  warn "Container '${CERTBOT_C}' não está rodando (ou não existe). Tentando copiar do host..."

  # B) Se /etc/letsencrypt é bind no host, copie direto
  if [ -d /etc/letsencrypt ]; then
    # pode exigir sudo dependendo das permissões
    if cp -a /etc/letsencrypt "${WORK}/letsencrypt/etc_letsencrypt" 2>/dev/null; then
      ok "Certificados copiados de /etc/letsencrypt (host)."
    else
      warn "Permissão negada ao copiar /etc/letsencrypt. Tentando com sudo..."
      sudo cp -a /etc/letsencrypt "${WORK}/letsencrypt/etc_letsencrypt" || warn "Não foi possível copiar /etc/letsencrypt nem com sudo."
      # preserva permissões típicas (opcional)
      sudo chown -R "$(id -u):$(id -g)" "${WORK}/letsencrypt/etc_letsencrypt" 2>/dev/null || true
    fi

    # (opcional) copie também lib/log se quiser histórico
    [ -d /var/lib/letsencrypt ] && sudo cp -a /var/lib/letsencrypt "${WORK}/letsencrypt/var_lib_letsencrypt" 2>/dev/null || true
    [ -d /var/log/letsencrypt ] && sudo cp -a /var/log/letsencrypt "${WORK}/letsencrypt/var_log_letsencrypt" 2>/dev/null || true
  else
    warn "/etc/letsencrypt não encontrado no host."
  fi
fi

# (opcional) capture crontab/timers usados na renovação
if [ -f /etc/cron.d/certbot ]; then
  cp -a /etc/cron.d/certbot "${WORK}/letsencrypt/cron_certbot" || true
fi
[ -f /lib/systemd/system/certbot.timer ]  && cp -a /lib/systemd/system/certbot.timer  "${WORK}/letsencrypt/" || true
[ -f /lib/systemd/system/certbot.service ] && cp -a /lib/systemd/system/certbot.service "${WORK}/letsencrypt/" || true

########################################
# 8) Arquivos raiz úteis do projeto
########################################
ok "Copiando compose/Dockerfiles/nginx do projeto..."
mkdir -p "${WORK}/project-root"
for f in docker-compose.yml Docker-compose.yml docker-compose.yaml Dockerfile nginx; do
  [ -e "${PROJ_DIR}/$f" ] && cp -a "${PROJ_DIR}/$f" "${WORK}/project-root/" || true
done
[ -f "${PROJ_DIR}/.env" ] && cp -a "${PROJ_DIR}/.env" "${WORK}/project-root/.env" || true

########################################
# 9) Compactar
########################################
ok "Compactando backup..."
cd "${OUT_DIR}"
TARBALL="api-semit-backup-${TS}.tar.gz"
tar -czf "${TARBALL}" full/

########################################
# 10) Resumo
########################################
ok "Tamanhos:"
du -sh "${WORK}/api"            2>/dev/null || true
du -sh "${WORK}/images"         2>/dev/null || true
du -sh "${WORK}/mongo"          2>/dev/null || true
du -sh "${WORK}/frontend-src"   2>/dev/null || true
du -sh "${WORK}/frontend-build" 2>/dev/null || true
du -sh "${WORK}/nginx"          2>/dev/null || true
du -sh "${WORK}/letsencrypt"    2>/dev/null || true
du -sh "${WORK}/project-root"   2>/dev/null || true
du -sh "${WORK}/project"        2>/dev/null || true

echo
echo "✅ Backup concluído."
echo "Arquivo: ${OUT_DIR}/${TARBALL}"
echo "Log:     ${LOG}"
