#!/bin/bash
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Add Flutter to PATH
export PATH="$HOME/development/flutter/bin:$HOME/flutter/bin:$PATH"

echo "[3/5] Rebuildando Formularios (Flutter)..."

FLUTTER_PROJECT_PATH="$PROJECT_ROOT/prefeitura_app-main"
FORMULARIOS_BUILD_PATH="$PROJECT_ROOT/frontend/build/formularios"

if [ -d "$FLUTTER_PROJECT_PATH" ]; then
    cd "$FLUTTER_PROJECT_PATH"
    
    echo "  Limpando build anterior..."
    rm -rf build
    
    echo "  Fazendo build para web (Formularios)..."
    flutter build web --release --base-href=/formularios/ --target=lib/main_formulario.dart --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api
    
    if [ $? -eq 0 ]; then
        echo "  Copiando arquivos..."
        rm -rf "$FORMULARIOS_BUILD_PATH"
        mkdir -p "$FORMULARIOS_BUILD_PATH"
        cp -r build/web/* "$FORMULARIOS_BUILD_PATH/"
        echo "  [OK] Formularios rebuildado"
    else
        echo "  [AVISO] Erro ao buildar Formularios"
        exit 1
    fi
else
    echo "  [AVISO] Projeto Flutter nao encontrado"
fi

cd "$PROJECT_ROOT"

# ============================================
# 4. REBUILD CONTAINERS DOCKER
# ============================================
echo "[4/5] Rebuildando containers Docker..."

echo "  Parando servicos..."
docker compose down

echo "  Rebuildando e iniciando servicos..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "  [ERRO] Erro ao rebuildar containers"
    exit 1
fi

echo "  Aguardando servicos iniciarem..."
sleep 10

echo "  [OK] Containers rebuildados"
