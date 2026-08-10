#!/usr/bin/env bash
# Liga nginx <-> GovCidadao e (opcional) GovCidadao <-> rede do stack memorial,
# para o proxy /garca-cidadao e /garca-cidadao-api deixarem de retornar 502.
# Não altera arquivos do memorial; só `docker network connect`.
#
# Uso (na raiz do repo api-semit, com memorial + GovCidadao no ar):
#   ./scripts/nginx-link-govcidadao.sh
#
# Se a rede do compose raiz não for api-semit_stack:
#   MEMORIAL_STACK_NETWORK=nome_da_rede ./scripts/nginx-link-govcidadao.sh
#
# Logins iguais ao memorial exigem ainda EXTERNAL_MONGO_URI na API — use:
#   cd GovCidadao && docker compose -f docker-compose.yml -f docker-compose.memorial-bridge.yml up -d --build api
set -euo pipefail

STACK_NET="${MEMORIAL_STACK_NETWORK:-api-semit_stack}"

if ! docker inspect nginx >/dev/null 2>&1; then
  echo "Erro: container nginx não encontrado." >&2
  exit 1
fi
if ! docker inspect govcidadao-frontend >/dev/null 2>&1; then
  echo "Erro: container govcidadao-frontend não encontrado. Suba GovCidadao/ (docker compose up -d)." >&2
  exit 1
fi

if [[ -z "$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' govcidadao-frontend | tr -s ' ')" ]]; then
  echo "Erro: govcidadao-frontend sem redes." >&2
  exit 1
fi

while read -r line; do
  [[ -z "$line" ]] && continue
  if docker network inspect "$line" >/dev/null 2>&1; then
    docker network connect "$line" nginx 2>/dev/null || true
    echo "OK: nginx ligado à rede '${line}'."
  fi
done < <(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' govcidadao-frontend)

if docker network inspect "$STACK_NET" >/dev/null 2>&1; then
  docker network connect "$STACK_NET" govcidadao-api 2>/dev/null || true
  docker network connect "$STACK_NET" govcidadao-frontend 2>/dev/null || true
  echo "OK: govcidadao-api (e frontend) tentativa de ligação à rede '${STACK_NET}'."
else
  echo "Aviso: rede '${STACK_NET}' não existe — nginx só na rede do GovCidadao. Suba o compose da raiz (memorial) ou defina MEMORIAL_STACK_NETWORK." >&2
fi

docker exec nginx nginx -s reload
echo "OK: nginx recarregado. Teste: docker exec nginx wget -qO- --timeout=3 http://govcidadao-api:8000/health"
echo "Lembrete: usuários do memorial na API exigem rebuild com docker-compose.memorial-bridge.yml (EXTERNAL_MONGO_URI)."
