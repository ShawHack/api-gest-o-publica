#!/usr/bin/env bash
# Migra o data-root do Docker para /home/docker-data (partição com espaço).
# Requer sudo. Gera downtime de ~2–10 min (stack api-semit parada).
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/home/semit/Documentos/api-semit}"
NEW_ROOT="/home/docker-data"
OLD_ROOT="/var/lib/docker"
DAEMON_JSON="/etc/docker/daemon.json"

echo "==> Verificando espaço em /home..."
df -h /home

if [[ ! -d "$COMPOSE_DIR" ]] || [[ ! -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
  echo "ERRO: docker-compose não encontrado em $COMPOSE_DIR"
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Execute com sudo: sudo bash $0"
  exit 1
fi

echo "==> Parando stack de produção (docker compose down)..."
cd "$COMPOSE_DIR"
sudo -u semit docker compose down

echo "==> Parando Docker..."
systemctl stop docker docker.socket 2>/dev/null || true

mkdir -p "$NEW_ROOT"

if [[ -d "$OLD_ROOT" ]] && [[ "$(ls -A "$OLD_ROOT" 2>/dev/null | wc -l)" -gt 0 ]]; then
  echo "==> Copiando dados de $OLD_ROOT para $NEW_ROOT (pode demorar)..."
  rsync -aHAX --numeric-ids "$OLD_ROOT/" "$NEW_ROOT/"
fi

echo "==> Configurando data-root em $DAEMON_JSON..."
if [[ -f "$DAEMON_JSON" ]]; then
  cp -a "$DAEMON_JSON" "${DAEMON_JSON}.bak.$(date +%Y%m%d%H%M%S)"
fi
mkdir -p /etc/docker
if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY'
import json, os
path = "/etc/docker/daemon.json"
data = {}
if os.path.isfile(path):
    with open(path) as f:
        data = json.load(f)
data["data-root"] = "/home/docker-data"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
else
  echo '{ "data-root": "/home/docker-data" }' > "$DAEMON_JSON"
fi

echo "==> Iniciando Docker..."
systemctl start docker
sleep 3

if ! docker info 2>/dev/null | grep -q "Docker Root Dir: $NEW_ROOT"; then
  echo "ERRO: data-root não apontou para $NEW_ROOT"
  docker info | grep "Docker Root Dir" || true
  exit 1
fi

echo "==> Subindo stack..."
cd "$COMPOSE_DIR"
sudo -u semit docker compose up -d

echo "==> Aguardando healthchecks..."
sleep 15
sudo -u semit docker compose ps

echo ""
echo "OK. Docker agora usa $NEW_ROOT"
echo "Após validar produção por alguns dias, você pode renomear o antigo:"
echo "  sudo mv $OLD_ROOT ${OLD_ROOT}.old.\$(date +%Y%m%d)"
echo ""
df -h / /home
