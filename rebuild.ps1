# Script para Rebuild Completo - Prefeitura App
# Rebuilda: frontend React, Agendamentos/Formularios (Flutter se entrypoint existir),
# publica Flutter pinado (servicos nunca recompilado), containers Docker.
#
# Ver docs/PORTAL-SERVICOS-WEB.md e scripts/flutter-web-builds.lock

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot
$flutterModules = @("servicos", "agendamentos", "formularios", "iluminacao")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rebuild Completo - Prefeitura App    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Guard: nao usar Dart substituto como hub /servicos/
$servicesHome = Join-Path $projectRoot "prefeitura_app-main\lib\screens\web\services_home_screen.dart"
if (Test-Path $servicesHome) {
    Write-Host "[ERRO] Detectado services_home_screen.dart em prefeitura_app-main/" -ForegroundColor Red
    Write-Host "  Esse arquivo e Dart substituto e NAO deve ser usado para publicar /servicos/." -ForegroundColor Red
    Write-Host "  Remova-o da raiz (ou nao sincronize full/prefeitura_app-main -> raiz)." -ForegroundColor Red
    Write-Host "  Hub correto: build pinado — ver docs/PORTAL-SERVICOS-WEB.md" -ForegroundColor Yellow
    exit 1
}

# ============================================
# 1. REBUILD FRONTEND (preserva modulos Flutter)
# ============================================
Write-Host "[1/6] Rebuildando Frontend..." -ForegroundColor Yellow

$frontendPath = Join-Path $projectRoot "frontend"
$preserveDir = Join-Path $env:TEMP ("flutter-web-preserve-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $preserveDir | Out-Null

Set-Location $frontendPath

Write-Host "  Preservando modulos Flutter web..." -ForegroundColor Cyan
foreach ($mod in $flutterModules) {
    $src = Join-Path "build" $mod
    $js = Join-Path $src "main.dart.js"
    if ((Test-Path $src) -and (Test-Path $js)) {
        Copy-Item -Path $src -Destination (Join-Path $preserveDir $mod) -Recurse -Force
        Write-Host "    guardado: $mod" -ForegroundColor DarkGray
    }
}

Write-Host "  Limpando build anterior..." -ForegroundColor Cyan
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
}

Write-Host "  Fazendo build do frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] Erro ao buildar frontend" -ForegroundColor Red
    Remove-Item -Recurse -Force $preserveDir -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  [OK] Frontend rebuildado" -ForegroundColor Green

Write-Host "  Restaurando modulos Flutter preservados..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "build" | Out-Null
foreach ($mod in $flutterModules) {
    $saved = Join-Path $preserveDir $mod
    if (Test-Path $saved) {
        $target = Join-Path "build" $mod
        if (Test-Path $target) { Remove-Item -Recurse -Force $target }
        Copy-Item -Path $saved -Destination $target -Recurse -Force
        Write-Host "    restaurado: $mod" -ForegroundColor DarkGray
    }
}
Remove-Item -Recurse -Force $preserveDir -ErrorAction SilentlyContinue

Set-Location $projectRoot
Write-Host ""

function Mark-JustBuilt([string]$dest) {
    Set-Content -Path (Join-Path $dest ".just_built") -Value ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString())
}

# ============================================
# 2. REBUILD AGENDA GARCA (AGENDAMENTOS)
# ============================================
Write-Host "[2/6] Rebuildando Agenda Garca (Flutter)..." -ForegroundColor Yellow

$flutterProjectPath = Join-Path $projectRoot "prefeitura_app-main"
$agendamentosBuildPath = Join-Path $projectRoot "frontend\build\agendamentos"
$flutterCmd = Get-Command flutter -ErrorAction SilentlyContinue

if ((Test-Path $flutterProjectPath) -and $flutterCmd) {
    Set-Location $flutterProjectPath

    $agTarget = "lib/main.dart"
    if (Test-Path "lib\main_agendamentos.dart") {
        $agTarget = "lib/main_agendamentos.dart"
    }

    Write-Host "  Limpando build anterior..." -ForegroundColor Cyan
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
    }

    Write-Host "  Executando flutter pub get..." -ForegroundColor Cyan
    flutter pub get

    Write-Host "  Fazendo build para web (Agendamentos, target=$agTarget)..." -ForegroundColor Cyan
    flutter build web --release --base-href=/agendamentos/ --target=$agTarget --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Copiando arquivos..." -ForegroundColor Cyan
        if (Test-Path $agendamentosBuildPath) {
            Remove-Item -Recurse -Force $agendamentosBuildPath
        }
        New-Item -ItemType Directory -Force -Path $agendamentosBuildPath | Out-Null
        Copy-Item -Path "build\web\*" -Destination $agendamentosBuildPath -Recurse -Force
        Mark-JustBuilt $agendamentosBuildPath
        Write-Host "  [OK] Agenda Garca rebuildada (promova com scripts/promover-flutter-web.sh se validada)" -ForegroundColor Green
    }
    else {
        Write-Host "  [AVISO] Erro ao buildar Agenda Garca — mantem build pinado" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  [AVISO] Flutter/projeto indisponivel — usa build pinado no passo 4" -ForegroundColor Yellow
}

Set-Location $projectRoot
Write-Host ""

# ============================================
# 3. REBUILD FORMULARIOS (FLUTTER)
# ============================================
Write-Host "[3/6] Rebuildando Formularios (Flutter)..." -ForegroundColor Yellow

$formulariosBuildPath = Join-Path $projectRoot "frontend\build\formularios"
$formTarget = $null
if (Test-Path (Join-Path $flutterProjectPath "lib\main_formularios.dart")) {
    $formTarget = "lib/main_formularios.dart"
}
elseif (Test-Path (Join-Path $flutterProjectPath "lib\main_formulario.dart")) {
    $formTarget = "lib/main_formulario.dart"
}

if ((Test-Path $flutterProjectPath) -and $flutterCmd -and $formTarget) {
    Set-Location $flutterProjectPath

    Write-Host "  Limpando build anterior..." -ForegroundColor Cyan
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
    }

    Write-Host "  Fazendo build para web (Formularios, target=$formTarget)..." -ForegroundColor Cyan
    flutter build web --release --base-href=/formularios/ --target=$formTarget --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Copiando arquivos..." -ForegroundColor Cyan
        if (Test-Path $formulariosBuildPath) {
            Remove-Item -Recurse -Force $formulariosBuildPath
        }
        New-Item -ItemType Directory -Force -Path $formulariosBuildPath | Out-Null
        Copy-Item -Path "build\web\*" -Destination $formulariosBuildPath -Recurse -Force
        Mark-JustBuilt $formulariosBuildPath
        Write-Host "  [OK] Formularios rebuildado (promova com scripts/promover-flutter-web.sh se validada)" -ForegroundColor Green
    }
    else {
        Write-Host "  [AVISO] Erro ao buildar Formularios — mantem build pinado" -ForegroundColor Yellow
    }
}
elseif (-not $formTarget) {
    Write-Host "  [AVISO] Sem main_formularios.dart / main_formulario.dart — usa build pinado" -ForegroundColor Yellow
}
else {
    Write-Host "  [AVISO] Flutter/projeto indisponivel — usa build pinado no passo 4" -ForegroundColor Yellow
}

Set-Location $projectRoot
Write-Host ""

# ============================================
# 4. PUBLICAR FLUTTER WEB
# ============================================
Write-Host "[4/6] Publicar Flutter web (servicos pinado; demais sem downgrade)..." -ForegroundColor Yellow
$pubScript = Join-Path $projectRoot "scripts\publicar-flutter-web.sh"
if (Test-Path $pubScript) {
    bash $pubScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERRO] Falha em publicar-flutter-web.sh" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "  [ERRO] Falta scripts/publicar-flutter-web.sh" -ForegroundColor Red
    exit 1
}
Write-Host "  Ver docs/PORTAL-SERVICOS-WEB.md" -ForegroundColor Cyan
Set-Location $projectRoot
Write-Host ""

# ============================================
# 5. REBUILD CONTAINERS DOCKER
# ============================================
Write-Host "[5/6] Rebuildando containers Docker..." -ForegroundColor Yellow

Write-Host "  Parando servicos..." -ForegroundColor Cyan
docker compose down

Write-Host "  Rebuildando e iniciando servicos..." -ForegroundColor Cyan
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] Erro ao rebuildar containers" -ForegroundColor Red
    exit 1
}

Write-Host "  Aguardando servicos iniciarem..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "  [OK] Containers rebuildados" -ForegroundColor Green
Write-Host ""

# ============================================
# 6. VERIFICAR STATUS
# ============================================
Write-Host "[6/6] Verificando status..." -ForegroundColor Yellow

Start-Sleep -Seconds 5
docker compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Rebuild Concluido!                    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Servicos disponiveis:" -ForegroundColor Cyan
Write-Host "  - Frontend:        http://localhost" -ForegroundColor White
Write-Host "  - Agenda Garca:    http://localhost/agendamentos/" -ForegroundColor White
Write-Host "  - Formularios:     http://localhost/formularios/" -ForegroundColor White
Write-Host "  - Servicos:        http://localhost/servicos/" -ForegroundColor White
Write-Host "  - API:             http://localhost/api" -ForegroundColor White
Write-Host ""
Write-Host "Flutter pinado: scripts/flutter-web-builds.lock" -ForegroundColor Cyan
Write-Host "Promover versao nova: bash scripts/promover-flutter-web.sh <modulo>" -ForegroundColor Cyan
Write-Host ""
