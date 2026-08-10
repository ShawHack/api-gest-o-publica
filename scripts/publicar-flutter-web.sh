#!/usr/bin/env bash
# Publica módulos Flutter web no caminho do nginx (frontend/build/).
# - /servicos/: SEMPRE do artefato pinado (REF) + MD5 do lock. Nunca recompilar.
# - Demais: se DEST já tem build (ex.: .just_built), NÃO sobrescrever com REF antigo.
#   Se DEST vazio, restaura do REF e valida MD5 do lock.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${PROJECT_ROOT}/full/project/frontend/build"
DEST="${PROJECT_ROOT}/frontend/build"
BACKUP="${PROJECT_ROOT}/backend/public"
LOCK="${PROJECT_ROOT}/scripts/flutter-web-builds.lock"
MARKER='Serviços Web Integrados'

MODULES=(servicos agendamentos formularios iluminacao)

mkdir -p "$DEST" "$REF" "$BACKUP"

file_md5() {
  local f="$1"
  if command -v md5sum >/dev/null 2>&1; then
    md5sum "$f" | awk '{print $1}'
  elif command -v md5 >/dev/null 2>&1; then
    md5 -q "$f"
  else
    echo ""
  fi
}

lock_md5() {
  local mod="$1"
  if [ ! -f "$LOCK" ]; then
    echo ""
    return 0
  fi
  # JSON simples sem jq (compatível com servidor mínimo)
  sed -n "/\"$mod\"/,/}/p" "$LOCK" | grep -m1 '"md5"' | sed 's/.*"md5"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

resolve_ref() {
  local mod="$1"
  if [ -f "${REF}/${mod}/main.dart.js" ]; then
    echo "$REF/$mod"
    return 0
  fi
  if [ -f "${BACKUP}/${mod}/main.dart.js" ]; then
    echo "$BACKUP/$mod"
    return 0
  fi
  return 1
}

verify_md5() {
  local mod="$1"
  local path="$2"
  local expected
  expected="$(lock_md5 "$mod")"
  if [ -z "$expected" ]; then
    echo "  [AVISO] Sem MD5 no lock para $mod — pulando verificação"
    return 0
  fi
  local actual
  actual="$(file_md5 "$path/main.dart.js")"
  if [ -z "$actual" ]; then
    echo "  [AVISO] md5sum indisponível — pulando verificação de $mod"
    return 0
  fi
  if [ "$actual" != "$expected" ]; then
    echo "[ERRO] MD5 de $mod não bate com o lock." >&2
    echo "  esperado: $expected" >&2
    echo "  obtido:   $actual" >&2
    echo "  arquivo:  $path/main.dart.js" >&2
    echo "  Se esta versão for a correta, rode: ./scripts/promover-flutter-web.sh $mod" >&2
    return 1
  fi
  return 0
}

copy_mod() {
  local src="$1"
  local dest_mod="$2"
  rm -rf "${DEST}/${dest_mod}"
  cp -a "$src" "${DEST}/${dest_mod}"
  rm -f "${DEST}/${dest_mod}/.just_built"
}

echo "== Publicar Flutter web → frontend/build =="
echo "  Lock: $LOCK"

for mod in "${MODULES[@]}"; do
  dest_js="${DEST}/${mod}/main.dart.js"
  just_built=0
  if [ -f "${DEST}/${mod}/.just_built" ] && [ -f "$dest_js" ]; then
    just_built=1
  fi

  if [ "$mod" = "servicos" ]; then
    # Hub: NUNCA usar DEST recém-compilado / Dart substituto — só REF pinado
    src="$(resolve_ref "$mod" || true)"
    if [ -z "$src" ]; then
      echo "[ERRO] Sem build pinado para servicos (REF/BACKUP)" >&2
      exit 1
    fi
    if ! grep -q 'Web Integrados' "${src}/main.dart.js"; then
      echo "[ERRO] $src/main.dart.js não contém «${MARKER}» — abortando." >&2
      exit 1
    fi
    verify_md5 "$mod" "$src" || exit 1
    echo "  servicos ← $src (pinado)"
    copy_mod "$src" "servicos"
    continue
  fi

  if [ "$just_built" -eq 1 ]; then
    echo "  $mod ← $DEST/$mod (recém-compilado, não sobrescrever)"
    # Espelhar em backend/public sem alterar REF/lock (promote é explícito)
    rm -rf "${BACKUP}/${mod}"
    mkdir -p "$BACKUP"
    cp -a "${DEST}/${mod}" "${BACKUP}/${mod}"
    rm -f "${BACKUP}/${mod}/.just_built"
    continue
  fi

  if [ -f "$dest_js" ]; then
    # Já existe no DEST (ex.: preservado após npm build) — manter se MD5 ok
    if verify_md5 "$mod" "${DEST}/${mod}"; then
      echo "  $mod ← $DEST/$mod (já presente, MD5 OK)"
      continue
    fi
    echo "  [AVISO] $mod em DEST com MD5 divergente — restaurando do pin"
  fi

  src="$(resolve_ref "$mod" || true)"
  if [ -z "$src" ]; then
    echo "[ERRO] Sem build para: $mod (nem em $REF nem em $BACKUP)" >&2
    exit 1
  fi
  verify_md5 "$mod" "$src" || exit 1
  echo "  $mod ← $src (pinado)"
  copy_mod "$src" "$mod"
done

echo "[OK] Publicado: ${MODULES[*]}"
echo "     Nginx (volume): frontend/build → /usr/share/nginx/html"
echo "     Promover nova versão: ./scripts/promover-flutter-web.sh <modulo>"
