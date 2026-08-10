# Script para instalar a API como serviço do Windows usando PM2
# Requer: npm install -g pm2 pm2-windows-startup

Write-Host "🔧 Instalando API como serviço do Windows..." -ForegroundColor Green

# Verificar se PM2 está instalado
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PM2 não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g pm2 pm2-windows-startup
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar PM2." -ForegroundColor Red
        exit 1
    }
}

# Verificar se estamos no diretório correto
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Arquivo index.js não encontrado. Execute este script no diretório backend." -ForegroundColor Red
    exit 1
}

# Parar processo existente se houver
Write-Host "🛑 Parando processos existentes..." -ForegroundColor Cyan
pm2 delete api-semit -s 2>$null

# Iniciar a API com PM2
Write-Host "🚀 Iniciando API com PM2..." -ForegroundColor Cyan
pm2 start index.js --name "api-semit" --interpreter node

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao iniciar a API com PM2." -ForegroundColor Red
    exit 1
}

# Salvar configuração do PM2
Write-Host "💾 Salvando configuração do PM2..." -ForegroundColor Cyan
pm2 save

# Configurar para iniciar com Windows
Write-Host "⚙️  Configurando para iniciar com Windows..." -ForegroundColor Cyan
pm2-startup install

Write-Host ""
Write-Host "✅ API instalada como serviço!" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Cyan
Write-Host "  pm2 status          - Ver status da API" -ForegroundColor White
Write-Host "  pm2 logs api-semit  - Ver logs" -ForegroundColor White
Write-Host "  pm2 restart api-semit - Reiniciar API" -ForegroundColor White
Write-Host "  pm2 stop api-semit  - Parar API" -ForegroundColor White
Write-Host "  pm2 delete api-semit - Remover do PM2" -ForegroundColor White
Write-Host ""


