#!/usr/bin/env bash
# Promove um módulo Flutter web já publicado em frontend/build/ para a referência pinada.
# Atualiza: full/project/frontend/build/<mod>, backend/public/<mod>, scripts/flutter-web-builds.lock
#
# Uso:
#   ./scripts/promover-flutter-web.sh agendamentos
#   ./scripts/promover-flutter-web.sh formularios
#   ./scripts/promover-flutter-web.sh iluminacao
#
# NÃO use para servicos a menos que o main.dart.js contenha "Serviços Web Integrados"
# e tenha sido validado manualmente (fonte Dart original ainda não está no repo).
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${PROJECT_ROOT}/full/project/frontend/build"
DEST="${PROJECT_ROOT}/frontend/build"
BACKUP="${PROJECT_ROOT}/backend/public"
LOCK="${PROJECT_ROOT}/scripts/flutter-web-builds.lock"
MARKER='Serviços Web Integrados'

MOD="${1:-}"
if [ -z "$MOD" ]; then
  echo "Uso: $0 <servicos|agendamentos|formularios|iluminacao>" >&2
  exit 1
fi

case "$MOD" in
  servicos|agendamentos|formularios|iluminacao) ;;
  *)
    echo "[ERRO] Módulo inválido: $MOD" >&2
    exit 1
    ;;
esac

SRC="${DEST}/${MOD}"
if [ ! -f "${SRC}/main.dart.js" ]; then
  echo "[ERRO] Falta ${SRC}/main.dart.js — compile/publique antes de promover." >&2
  exit 1
fi

if [ "$MOD" = "servicos" ]; then
  if ! grep -q 'Web Integrados' "${SRC}/main.dart.js"; then
    echo "[ERRO] servicos sem «${MARKER}» — não promover UI inventada/substituta." >&2
    echo "  Ver docs/PORTAL-SERVICOS-WEB.md" >&2
    exit 1
  fi
fi

file_md5() {
  local f="$1"
  if command -v md5sum >/dev/null 2>&1; then
    md5sum "$f" | awk '{print $1}'
  elif command -v md5 >/dev/null 2>&1; then
    md5 -q "$f"
  else
    echo "[ERRO] md5sum/md5 não disponível" >&2
    exit 1
  fi
}

NEW_MD5="$(file_md5 "${SRC}/main.dart.js")"
TODAY="$(date +%Y-%m-%d)"

echo "== Promover $MOD =="
echo "  origem: $SRC"
echo "  md5:    $NEW_MD5"

mkdir -p "$REF" "$BACKUP"
rm -rf "${REF}/${MOD}" "${BACKUP}/${MOD}"
cp -a "$SRC" "${REF}/${MOD}"
cp -a "$SRC" "${BACKUP}/${MOD}"
rm -f "${REF}/${MOD}/.just_built" "${BACKUP}/${MOD}/.just_built" "${DEST}/${MOD}/.just_built"

# Atualiza apenas o md5 do módulo no lock (sem jq)
if [ -f "$LOCK" ]; then
  TMP="${LOCK}.tmp.$$"
  awk -v mod="$MOD" -v md5="$NEW_MD5" -v today="$TODAY" '
    BEGIN { inmod=0; updated=0 }
    /"updated"/ {
      sub(/"updated"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"updated\": \"" today "\"")
    }
    $0 ~ "\"" mod "\"" { inmod=1 }
    inmod && /"md5"/ {
      sub(/"md5"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"md5\": \"" md5 "\"")
      updated=1
      inmod=0
    }
    inmod && /}/ { inmod=0 }
    { print }
    END {
      if (!updated) {
        print "[ERRO] Módulo " mod " não encontrado no lock" > "/dev/stderr"
        exit 1
      }
    }
  ' "$LOCK" > "$TMP"
  mv "$TMP" "$LOCK"
else
  echo "[ERRO] Lock não encontrado: $LOCK" >&2
  exit 1
fi

echo "[OK] $MOD promovido → REF + backend/public + lock"
echo "     Próximo rebuild usará este artefato."
