#!/bin/bash
# Script para Rebuild Completo - Prefeitura App
# Rebuilda: frontend React, Agendamentos/Formularios (Flutter se entrypoint existir),
# publica Flutter pinado (servicos nunca recompilado), containers Docker.
#
# Ver docs/PORTAL-SERVICOS-WEB.md e scripts/flutter-web-builds.lock

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"
BACKEND_PUBLIC_DIR="$PROJECT_ROOT/backend/public"
FLUTTER_MODULES=(servicos agendamentos formularios iluminacao)

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Add Flutter to PATH
export PATH="$HOME/development/flutter/bin:$HOME/flutter/bin:$PATH"

echo "========================================"
echo "  Rebuild Completo - Prefeitura App    "
echo "========================================"
echo ""

# Guard: não usar Dart substituto como hub /servicos/
if [ -f "$PROJECT_ROOT/prefeitura_app-main/lib/screens/web/services_home_screen.dart" ]; then
  echo "[ERRO] Detectado services_home_screen.dart em prefeitura_app-main/"
  echo "  Esse arquivo é Dart substituto e NÃO deve ser usado para publicar /servicos/."
  echo "  Remova-o da raiz (ou não sincronize full/prefeitura_app-main → raiz)."
  echo "  Hub correto: build pinado — ver docs/PORTAL-SERVICOS-WEB.md"
  exit 1
fi

# ============================================
# 1. REBUILD FRONTEND (preserva módulos Flutter)
# ============================================
echo "[1/6] Rebuildando Frontend..."

PRESERVE_DIR="$(mktemp -d /tmp/flutter-web-preserve-XXXXXX)"
trap 'rm -rf "$PRESERVE_DIR"' EXIT

cd "$PROJECT_ROOT/frontend"

echo "  Preservando módulos Flutter web..."
for mod in "${FLUTTER_MODULES[@]}"; do
  if [ -d "build/$mod" ] && [ -f "build/$mod/main.dart.js" ]; then
    cp -a "build/$mod" "$PRESERVE_DIR/$mod"
    echo "    guardado: $mod"
  fi
done

echo "  Limpando build anterior..."
rm -rf build

echo "  Fazendo build do frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "  [OK] Frontend rebuildado"
else
    echo "  [ERRO] Erro ao buildar frontend"
    exit 1
fi

echo "  Restaurando módulos Flutter preservados..."
mkdir -p build
for mod in "${FLUTTER_MODULES[@]}"; do
  if [ -d "$PRESERVE_DIR/$mod" ]; then
    rm -rf "build/$mod"
    cp -a "$PRESERVE_DIR/$mod" "build/$mod"
    echo "    restaurado: $mod"
  fi
done

cd "$PROJECT_ROOT"
echo ""

# ============================================
# Helper: entrypoint Flutter (falha se ausente)
# ============================================
resolve_form_target() {
  local base="$PROJECT_ROOT/prefeitura_app-main/lib"
  if [ -f "$base/main_formularios.dart" ]; then
    echo "lib/main_formularios.dart"
    return 0
  fi
  if [ -f "$base/main_formulario.dart" ]; then
    echo "lib/main_formulario.dart"
    return 0
  fi
  return 1
}

mark_just_built() {
  local dest="$1"
  date +%s > "$dest/.just_built"
}

# ============================================
# 2. REBUILD AGENDA GARCA (AGENDAMENTOS)
# ============================================
echo "[2/6] Rebuildando Agenda Garca (Flutter)..."

FLUTTER_PROJECT_PATH="$PROJECT_ROOT/prefeitura_app-main"
AGENDAMENTOS_BUILD_PATH="$PROJECT_ROOT/frontend/build/agendamentos"

if [ -d "$FLUTTER_PROJECT_PATH" ] && command -v flutter >/dev/null 2>&1; then
    cd "$FLUTTER_PROJECT_PATH"

    # Prefer entrypoint dedicado se existir; senão main.dart
    AG_TARGET="lib/main.dart"
    if [ -f "lib/main_agendamentos.dart" ]; then
      AG_TARGET="lib/main_agendamentos.dart"
    fi

    echo "  Limpando build anterior..."
    rm -rf build

    echo "  Executando flutter pub get..."
    flutter pub get

    echo "  Fazendo build para web (Agendamentos, target=$AG_TARGET)..."
    if flutter build web --release --base-href=/agendamentos/ --target="$AG_TARGET" --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api; then
        echo "  Copiando arquivos..."
        rm -rf "$AGENDAMENTOS_BUILD_PATH"
        mkdir -p "$AGENDAMENTOS_BUILD_PATH"
        cp -r build/web/* "$AGENDAMENTOS_BUILD_PATH/"
        mark_just_built "$AGENDAMENTOS_BUILD_PATH"
        echo "  [OK] Agenda Garca rebuildada (promova com ./scripts/promover-flutter-web.sh agendamentos se validada)"
    else
        echo "  [AVISO] Erro ao buildar Agenda Garca — mantém build pinado"
    fi
else
    echo "  [AVISO] Flutter/projeto indisponível — usa build pinado no passo 4"
fi

cd "$PROJECT_ROOT"
echo ""

# ============================================
# 3. REBUILD FORMULARIOS (FLUTTER)
# ============================================
echo "[3/6] Rebuildando Formularios (Flutter)..."

FORMULARIOS_BUILD_PATH="$PROJECT_ROOT/frontend/build/formularios"

if [ -d "$FLUTTER_PROJECT_PATH" ] && command -v flutter >/dev/null 2>&1; then
    FORM_TARGET="$(resolve_form_target || true)"
    if [ -z "$FORM_TARGET" ]; then
        echo "  [AVISO] Sem main_formularios.dart / main_formulario.dart — usa build pinado"
    else
        cd "$FLUTTER_PROJECT_PATH"

        echo "  Limpando build anterior..."
        rm -rf build

        echo "  Fazendo build para web (Formularios, target=$FORM_TARGET)..."
        if flutter build web --release --base-href=/formularios/ --target="$FORM_TARGET" --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api; then
            echo "  Copiando arquivos..."
            rm -rf "$FORMULARIOS_BUILD_PATH"
            mkdir -p "$FORMULARIOS_BUILD_PATH"
            cp -r build/web/* "$FORMULARIOS_BUILD_PATH/"
            mark_just_built "$FORMULARIOS_BUILD_PATH"
            echo "  [OK] Formularios rebuildado (promova com ./scripts/promover-flutter-web.sh formularios se validada)"
        else
            echo "  [AVISO] Erro ao buildar Formularios — mantém build pinado"
        fi
    fi
else
    echo "  [AVISO] Flutter/projeto indisponível — usa build pinado no passo 4"
fi

cd "$PROJECT_ROOT"
echo ""

# ============================================
# 4. PUBLICAR FLUTTER WEB (pin + não sobrescrever .just_built)
# ============================================
echo "[4/6] Publicando Flutter web (servicos pinado; demais sem downgrade)..."
echo "  Ver docs/PORTAL-SERVICOS-WEB.md — hub /servicos/ NUNCA é recompilado via Dart substituto."

if [ -f "$PROJECT_ROOT/scripts/publicar-flutter-web.sh" ]; then
    bash "$PROJECT_ROOT/scripts/publicar-flutter-web.sh"
else
    echo "  [ERRO] Falta scripts/publicar-flutter-web.sh"
    exit 1
fi
echo ""

# ============================================
# 5. PUBLICAR FRONTEND COM SYNC SEGURO
# ============================================
echo "[5/6] Publicando frontend em backend/public (sem apagar outros servicos)..."
mkdir -p "$BACKEND_PUBLIC_DIR"
rsync -a "$PROJECT_ROOT/frontend/build/" "$BACKEND_PUBLIC_DIR/"
# Remove flags internas do espelho
find "$BACKEND_PUBLIC_DIR" -name '.just_built' -delete 2>/dev/null || true
echo "  [OK] Publicacao segura concluida"
echo ""

# ============================================
# 6. REBUILD CONTAINERS DOCKER + STATUS
# ============================================
echo "[6/6] Rebuildando containers Docker..."

if [ "${FULL_STACK_DOWN:-0}" = "1" ]; then
    echo "  Janela de manutencao solicitada (FULL_STACK_DOWN=1)."
    echo "  Parando todos os servicos..."
    docker compose down
else
    echo "  Atualizacao sem parada geral; containers inalterados permanecem ativos."
fi

echo "  Rebuildando e atualizando os containers..."
docker compose up -d --build --remove-orphans

if [ $? -ne 0 ]; then
    echo "  [ERRO] Erro ao rebuildar containers"
    exit 1
fi

echo "  Aguardando servicos iniciarem..."
sleep 10

echo "  [OK] Containers rebuildados"
echo ""

echo "  Verificando status dos containers..."
sleep 5
docker compose ps

echo ""
echo "========================================"
echo "  Rebuild Concluido!                    "
echo "========================================"
echo ""
echo "Servicos disponiveis:"
echo "  - Frontend:        http://localhost"
echo "  - Agendamentos:    http://localhost/agendamentos/"
echo "  - Formularios:     http://localhost/formularios/"
echo "  - Servicos:        http://localhost/servicos/"
echo "  - API:             http://localhost/api"
echo ""
echo "Flutter: builds pinados em scripts/flutter-web-builds.lock"
echo "Para tornar um build novo a referência oficial:"
echo "  ./scripts/promover-flutter-web.sh <agendamentos|formularios|iluminacao>"
echo ""
