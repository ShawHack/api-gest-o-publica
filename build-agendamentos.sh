#!/bin/bash
# Script para fazer build do Flutter de Agendamentos para web

set -e  # Para o script se houver erro

echo "🔨 Fazendo build do Flutter para web..."

# Verifica se Flutter está instalado
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter não encontrado. Por favor, instale o Flutter primeiro."
    exit 1
fi

# Entra no diretório do projeto Flutter
cd prefeitura_app-main

# Verifica se o pubspec.yaml existe
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Erro: pubspec.yaml não encontrado em prefeitura_app-main/"
    exit 1
fi

echo "📦 Executando flutter pub get..."
flutter pub get

echo "🔨 Fazendo build web com base-href=/agendamentos/..."
flutter build web --release --base-href=/agendamentos/

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo ""
    echo "📦 Copiando arquivos para o build do frontend..."
    cd ..
    
    # Remove a pasta antiga
    if [ -d "frontend/build/agendamentos" ]; then
        rm -rf frontend/build/agendamentos
        echo "🗑️  Pasta antiga removida"
    fi
    
    # Cria o diretório se não existir
    mkdir -p frontend/build
    
    # Copia os arquivos
    cp -r prefeitura_app-main/build/web frontend/build/agendamentos
    
    echo "✅ Arquivos copiados para frontend/build/agendamentos!"
    echo ""
    echo "🔄 Para aplicar as mudanças, reinicie o Nginx:"
    echo "   docker compose restart nginx"
    echo ""
    echo "🌐 Após reiniciar, acesse: https://api.garca.sp.gov.br/agendamentos/"
else
    echo "❌ Erro ao fazer build do Flutter"
    exit 1
fi





