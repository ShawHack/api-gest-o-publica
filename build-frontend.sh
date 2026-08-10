#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_BUILD_DIR="$PROJECT_ROOT/frontend/build"
BACKEND_PUBLIC_DIR="$PROJECT_ROOT/backend/public"

cd "$PROJECT_ROOT/frontend"

# Backup da pasta agendamentos
if [ -d "build/agendamentos" ]; then
    echo "Fazendo backup de agendamentos..."
    cp -r build/agendamentos /tmp/agendamentos_backup
fi

# Build do React
echo "Executando build..."
npm run build

# Restaurar agendamentos
if [ -d "/tmp/agendamentos_backup" ]; then
    echo "Restaurando agendamentos..."
    cp -r /tmp/agendamentos_backup build/agendamentos
    rm -rf /tmp/agendamentos_backup
fi

echo "Build concluído!"

echo "Sincronizando frontend/build -> backend/public (modo seguro, sem --delete)..."
mkdir -p "$BACKEND_PUBLIC_DIR"
rsync -a "$FRONTEND_BUILD_DIR/" "$BACKEND_PUBLIC_DIR/"

cd "$PROJECT_ROOT"
docker compose restart nginx
echo "Nginx reiniciado!"
