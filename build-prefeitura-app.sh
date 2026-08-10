#!/bin/bash
# Script para fazer build do Flutter prefeitura_app-main com base-href correto

echo "🔨 Fazendo build do Flutter para web..."

cd prefeitura_app-main

# Verifica se Flutter está instalado
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter não encontrado. Por favor, instale o Flutter primeiro."
    exit 1
fi

# Faz o build com base-href correto e variáveis de ambiente
echo "📦 Fazendo build com base-href=/agendamentos/..."
flutter build web --release \
  --base-href=/agendamentos/ \
  --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api \
  --dart-define=EMAIL_API_KEY=flutter

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo ""
    echo "📦 Copiando arquivos para o build do frontend..."
    cd ..
    
    # Remove a pasta antiga
    rm -rf frontend/build/agendamentos
    
    # Copia os arquivos
    cp -r prefeitura_app-main/build/web frontend/build/agendamentos
    
    # Força atualização do service worker modificando o version.json
    # Isso faz o Flutter detectar uma nova versão e atualizar o cache
    TIMESTAMP=$(date +%s)
    if [ -f "frontend/build/agendamentos/version.json" ]; then
        echo "🔄 Forçando atualização do service worker..."
        echo "{\"timestamp\":\"$TIMESTAMP\",\"version\":\"$(date +%Y%m%d-%H%M%S)\"}" > frontend/build/agendamentos/version.json
    fi
    
    echo "✅ Arquivos copiados para frontend/build/agendamentos!"
    echo ""
    echo "🔄 Reinicie o Nginx:"
    echo "   docker compose restart nginx"
    echo ""
    echo "✨ Deploy concluído! Acesse: https://api.garca.sp.gov.br/agendamentos/"
    echo ""
    echo "⚠️  IMPORTANTE: Para ver as alterações no navegador:"
    echo "   1. Limpe o cache do navegador (Ctrl+Shift+Delete)"
    echo "   2. Ou faça um hard refresh (Ctrl+Shift+R ou Ctrl+F5)"
    echo "   3. Ou desregistre o Service Worker em DevTools (F12 > Application > Service Workers)"
else
    echo "❌ Erro ao fazer build do Flutter"
    exit 1
fi




