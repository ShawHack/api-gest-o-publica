# Script PowerShell para iniciar a API no Windows
# Uso: .\start-windows.ps1

Write-Host "🚀 Iniciando API Semit no Windows..." -ForegroundColor Green

# Verificar se Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se estamos no diretório correto
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Arquivo index.js não encontrado. Execute este script no diretório backend." -ForegroundColor Red
    exit 1
}

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado. Criando a partir do .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Arquivo .env criado. Por favor, configure as variáveis de ambiente." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Arquivo .env.example não encontrado. Por favor, crie o arquivo .env manualmente." -ForegroundColor Red
        exit 1
    }
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências." -ForegroundColor Red
        exit 1
    }
}

# Verificar se MongoDB está rodando
Write-Host "🔍 Verificando conexão com MongoDB..." -ForegroundColor Cyan
try {
    $mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
    if (-not $mongoProcess) {
        Write-Host "⚠️  MongoDB não parece estar rodando. Verifique se o serviço está iniciado." -ForegroundColor Yellow
    } else {
        Write-Host "✅ MongoDB detectado." -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Não foi possível verificar o MongoDB. Continuando..." -ForegroundColor Yellow
}

# Verificar/criar diretório de uploads
$uploadDir = $env:UPLOAD_DIR
if (-not $uploadDir) {
    $uploadDir = "C:\api-semit\uploads"
}

if (-not (Test-Path $uploadDir)) {
    Write-Host "📁 Criando diretório de uploads: $uploadDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $uploadDir -Force | Out-Null
    New-Item -ItemType Directory -Path "$uploadDir\users" -Force | Out-Null
    New-Item -ItemType Directory -Path "$uploadDir\sepultados" -Force | Out-Null
    Write-Host "✅ Diretórios criados." -ForegroundColor Green
}

# Iniciar a API
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host "📍 API estará disponível em: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📍 Healthcheck: http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor." -ForegroundColor Yellow
Write-Host ""

node index.js


