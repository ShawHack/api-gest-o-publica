#!/bin/bash
# Transfere \\10.15.25.4\tecnologia\DITD\Marjorie\teatro
# para /home/semit/Documentos/api-semit/teatro
set -euo pipefail

SMB_HOST="10.15.25.4"
SMB_SHARE="tecnologia"
REMOTE_PATH="DITD/Marjorie/teatro"
DEST_DIR="/home/semit/Documentos/api-semit/teatro"

SMB_USER="${SMB_USER:-}"
SMB_PASS="${SMB_PASS:-}"
SMB_DOMAIN="${SMB_DOMAIN:-}"

if [[ -z "$SMB_USER" ]]; then
  read -r -p "Usuário do compartilhamento (ex: DOMINIO\\usuario ou usuario): " SMB_USER
fi
if [[ -z "$SMB_PASS" ]]; then
  read -r -s -p "Senha: " SMB_PASS
  echo
fi

mkdir -p "$DEST_DIR"

AUTH="$SMB_USER%$SMB_PASS"
if [[ -n "$SMB_DOMAIN" ]]; then
  AUTH="$SMB_DOMAIN/$AUTH"
fi

echo "Verificando origem remota..."
smbclient "//${SMB_HOST}/${SMB_SHARE}" -U "$AUTH" -c "cd \"${REMOTE_PATH}\"; ls" || {
  echo "Erro ao acessar o compartilhamento. Verifique usuário, senha e caminho."
  exit 1
}

echo "Baixando para ${DEST_DIR} ..."
(
  cd "$DEST_DIR"
  smbclient "//${SMB_HOST}/${SMB_SHARE}" -U "$AUTH" \
    -D "$REMOTE_PATH" \
    -c "prompt OFF; recurse ON; mget *"
)

echo "Concluído. Conteúdo em: ${DEST_DIR}"
du -sh "$DEST_DIR"
ls -la "$DEST_DIR"
