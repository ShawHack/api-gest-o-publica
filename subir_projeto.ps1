# =============================================================================
# SUBIR PROJETO COMPLETO - Prefeitura de Garca
# =============================================================================
# Este script builda e sobe TODOS os modulos do sistema:
#   - Frontend principal (React - Memorial/Cemiterio)
#   - SAMA (React - SEMIT_A_PET - Pets e Arvores)
#   - Agendamentos (Flutter Web)
#   - Formularios (Flutter Web)
#   - Iluminacao Publica (Flutter Web)
#   - Servicos / PrefeituraApp (Flutter Web)
#   - Containers Docker (API + MongoDB + Nginx)
#
# Uso:
#   .\subir_projeto.ps1              -> Inicia (rebuilda apenas o que falta)
#   .\subir_projeto.ps1 -Rebuild     -> Forca o rebuild COMPLETO de tudo
#   .\subir_projeto.ps1 -SkipFlutter -> Pula builds Flutter (mais rapido)
#   .\subir_projeto.ps1 -SkipSama    -> Pula build do SAMA
# =============================================================================

param (
    [switch]$Rebuild = $false,
    [switch]$SkipFlutter = $false,
    [switch]$SkipSama = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# =============================================================================
# CAMINHOS
# =============================================================================
$paths = @{
    # Projeto Backend e Frontend principal
    Frontend      = Join-Path $projectRoot "frontend"
    BuildFront    = Join-Path $projectRoot "frontend\build"
    Backend       = Join-Path $projectRoot "backend"

    # SAMA (React - outro repositorio)
    SamaSource    = "c:\Users\saulo.lima\Documents\projetos\SEMT_A_PET\SEMT_A_PET\frontend"
    SamaDest      = Join-Path $projectRoot "backend\public\sama"

    # Flutter App (outro diretorio irmao)
    FlutterApp    = $null  # Resolvido abaixo

    # Builds Flutter (destinos dentro do frontend/build)
    BuildAgenda   = Join-Path $projectRoot "frontend\build\agendamentos"
    BuildForms    = Join-Path $projectRoot "frontend\build\formularios"
    BuildLight    = Join-Path $projectRoot "frontend\build\iluminacao"
    BuildServicos = Join-Path $projectRoot "frontend\build\servicos"
}

# Resolver caminho do Flutter App
try {
    $paths.FlutterApp = Resolve-Path (Join-Path $projectRoot "..\prefeitura_app-main") -ErrorAction Stop
}
catch {
    $paths.FlutterApp = Join-Path $projectRoot "..\prefeitura_app-main"
}

# Apps Flutter recompilaveis (hub /servicos/ = build de referencia — ver docs/PORTAL-SERVICOS-WEB.md)
$flutterApps = @(
    @{ Name = "Agendamentos"; Target = "lib/main_agendamentos.dart"; BaseHref = "/agendamentos/"; Dest = $paths.BuildAgenda },
    @{ Name = "Formularios"; Target = "lib/main_formularios.dart"; BaseHref = "/formularios/"; Dest = $paths.BuildForms },
    @{ Name = "Iluminacao"; Target = "lib/main_iluminacao.dart"; BaseHref = "/iluminacao/"; Dest = $paths.BuildLight }
)
$refFlutterBuild = Join-Path $projectRoot "full\project\frontend\build"

# Contadores
$totalSteps = 8  # Frontend + SAMA + Servicos(ref) + 3 Flutter + Docker + Verificacao
$currentStep = 0
$startTime = Get-Date
$errors = @()

# =============================================================================
# FUNCOES AUXILIARES
# =============================================================================

function Show-Header {
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host "     SUBIR PROJETO COMPLETO - Prefeitura de Garca                " -ForegroundColor Cyan
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Modulos: Frontend, SAMA, Agendamentos, Formularios," -ForegroundColor Gray
    Write-Host "           Iluminacao, Servicos, Docker (API+Mongo+Nginx)" -ForegroundColor Gray
    Write-Host ""
    if ($Rebuild) { Write-Host "  Modo: REBUILD FORCADO" -ForegroundColor Magenta }
    if ($SkipFlutter) { Write-Host "  Modo: Flutter IGNORADO" -ForegroundColor Yellow }
    if ($SkipSama) { Write-Host "  Modo: SAMA IGNORADO" -ForegroundColor Yellow }
    Write-Host ""
}

function Show-Step {
    param ([string]$Message)
    $script:currentStep++
    Write-Host ""
    Write-Host "  [$currentStep/$totalSteps] $Message" -ForegroundColor Yellow
    Write-Host "  $('-' * 50)" -ForegroundColor DarkGray
}

function Show-OK {
    param ([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Show-Skip {
    param ([string]$Message)
    Write-Host "  [SKIP] $Message" -ForegroundColor DarkYellow
}

function Show-Error {
    param ([string]$Message)
    Write-Host "  [ERRO] $Message" -ForegroundColor Red
}

function Show-Info {
    param ([string]$Message)
    Write-Host "  $Message" -ForegroundColor Cyan
}

function Check-Requirements {
    Show-Step "Verificando requisitos"

    # Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker nao encontrado! Instale o Docker Desktop."
    }
    Show-Info "Docker: OK"

    # docker-compose
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        # Tentar 'docker compose' (v2)
        try { docker compose version 2>&1 | Out-Null } catch {
            throw "docker-compose nao encontrado!"
        }
    }
    Show-Info "docker-compose: OK"

    # Node.js / npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm nao encontrado! Instale o Node.js."
    }
    $nodeVersion = node --version 2>&1
    Show-Info "Node.js: $nodeVersion"

    # Flutter (se nao estiver pulando)
    if (-not $SkipFlutter) {
        if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
            throw "Flutter nao encontrado! Instale o Flutter SDK."
        }
        $flutterVersion = (flutter --version 2>&1 | Select-Object -First 1) -replace 'ÔÇó', '-'
        Show-Info "Flutter: $flutterVersion"

        if (-not (Test-Path $paths.FlutterApp)) {
            throw "Projeto Flutter nao encontrado em: $($paths.FlutterApp)"
        }
        Show-Info "Flutter App: $($paths.FlutterApp)"
    }

    # SAMA Source (se nao estiver pulando)
    if (-not $SkipSama) {
        if (-not (Test-Path $paths.SamaSource)) {
            throw "Fonte SAMA nao encontrada em: $($paths.SamaSource)"
        }
        Show-Info "SAMA Source: $($paths.SamaSource)"
    }

    Show-OK "Todos os requisitos verificados!"
}

# =============================================================================
# BUILD FUNCTIONS
# =============================================================================

function Build-Frontend-React {
    Show-Step "Buildando Frontend Principal (React)"

    $indexExists = Test-Path (Join-Path $paths.BuildFront "index.html")
    if ($indexExists -and -not $Rebuild) {
        Show-Skip "Frontend ja esta buildado. Use -Rebuild para forcar."
        return
    }

    Set-Location $paths.Frontend
    Show-Info "npm install..."
    npm install --silent 2>&1 | Out-Null
    Show-Info "npm run build..."
    npm run build

    if ($LASTEXITCODE -ne 0) { throw "Falha no build do Frontend React" }

    Set-Location $projectRoot
    Show-OK "Frontend Principal buildado!"
}

function Build-SAMA {
    Show-Step "Buildando SAMA (React - SEMIT_A_PET)"

    if ($SkipSama) {
        Show-Skip "SAMA ignorado (flag -SkipSama)"
        return
    }

    $samaIndexExists = Test-Path (Join-Path $paths.SamaDest "index.html")
    if ($samaIndexExists -and -not $Rebuild) {
        Show-Skip "SAMA ja esta buildado. Use -Rebuild para forcar."
        return
    }

    # 1. Build
    Set-Location $paths.SamaSource
    Show-Info "npm install..."
    npm install --silent 2>&1 | Out-Null
    Show-Info "npm run build..."
    npm run build

    if ($LASTEXITCODE -ne 0) { throw "Falha no build do SAMA" }

    # 2. Backup config.js e patch.js
    $configFile = Join-Path $paths.SamaDest "config.js"
    $patchFile = Join-Path $paths.SamaDest "patch.js"
    $configBackup = $null
    $patchBackup = $null

    if (Test-Path $configFile) { $configBackup = Get-Content $configFile -Raw }
    if (Test-Path $patchFile) { $patchBackup = Get-Content $patchFile -Raw }

    # 3. Copiar build
    $buildPath = Join-Path $paths.SamaSource "build"
    if (Test-Path $paths.SamaDest) { Remove-Item -Recurse -Force $paths.SamaDest }
    New-Item -ItemType Directory -Force -Path $paths.SamaDest | Out-Null
    Copy-Item -Path "$buildPath\*" -Destination $paths.SamaDest -Recurse -Force

    # 4. Restaurar config.js e patch.js
    if ($configBackup) {
        Set-Content -Path $configFile -Value $configBackup -Encoding UTF8 -NoNewline
        Show-Info "config.js restaurado"
    }
    if ($patchBackup) {
        Set-Content -Path $patchFile -Value $patchBackup -Encoding UTF8 -NoNewline
        Show-Info "patch.js restaurado"
    }

    # 5. Injetar config.js e patch.js no index.html
    $indexPath = Join-Path $paths.SamaDest "index.html"
    if (Test-Path $indexPath) {
        $indexContent = Get-Content $indexPath -Raw
        if ($indexContent -notmatch "config\.js") {
            $indexContent = $indexContent -replace "(<script)", '<script src="/sama/config.js"></script><script src="/sama/patch.js"></script>$1'
            Set-Content -Path $indexPath -Value $indexContent -Encoding UTF8 -NoNewline
            Show-Info "config.js e patch.js injetados no index.html"
        }
    }

    Set-Location $projectRoot
    Show-OK "SAMA buildado e configurado!"
}

function Build-Flutter-Apps {
    if ($SkipFlutter) {
        foreach ($app in $flutterApps) {
            $script:currentStep++
            Show-Info "[$currentStep/$totalSteps] Flutter $($app.Name) ignorado (flag -SkipFlutter)"
        }
        return
    }

    # flutter pub get (uma vez so)
    Set-Location $paths.FlutterApp
    Show-Info "flutter pub get..."
    flutter pub get 2>&1 | Out-Null

    foreach ($app in $flutterApps) {
        Show-Step "Buildando $($app.Name) (Flutter Web)"

        $appIndexExists = Test-Path (Join-Path $app.Dest "index.html")
        if ($appIndexExists -and -not $Rebuild) {
            Show-Skip "$($app.Name) ja esta buildado. Use -Rebuild para forcar."
            continue
        }

        # Verificar se o target existe
        $targetPath = Join-Path $paths.FlutterApp $app.Target
        if (-not (Test-Path $targetPath)) {
            Show-Error "Target nao encontrado: $($app.Target)"
            $script:errors += "Flutter $($app.Name): target nao encontrado"
            continue
        }

        Set-Location $paths.FlutterApp
        Show-Info "flutter build web --release --base-href=$($app.BaseHref) --target=$($app.Target)"

        flutter build web --release `
            --base-href=$($app.BaseHref) `
            --target=$($app.Target) `
            --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api 2>&1

        if ($LASTEXITCODE -ne 0) {
            Show-Error "Falha no build de $($app.Name)"
            $script:errors += "Flutter $($app.Name): build falhou"
            continue
        }

        # Copiar build
        if (Test-Path $app.Dest) { Remove-Item -Recurse -Force $app.Dest }
        New-Item -ItemType Directory -Force -Path $app.Dest | Out-Null
        Copy-Item -Path "build\web\*" -Destination $app.Dest -Recurse -Force

        Show-OK "$($app.Name) buildado e copiado!"
    }

    Set-Location $projectRoot
}

function Start-Docker {
    Show-Step "Iniciando Containers Docker"

    Show-Info "docker-compose up -d --build ..."
    docker-compose up -d --build 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao iniciar containers Docker"
    }

    Show-Info "Aguardando containers ficarem saudaveis (30s max)..."

    # Esperar API ficar saudavel
    $maxWait = 30
    $waited = 0
    $healthy = $false

    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2

        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        }
        catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }

    Write-Host ""
    if ($healthy) {
        Show-OK "API saudavel (respondeu em ${waited}s)"
    }
    else {
        Show-Error "API nao respondeu no tempo limite. Verifique os logs: docker logs api"
        $script:errors += "API nao ficou saudavel"
    }
}

function Verify-Services {
    Show-Step "Verificando todos os servicos"

    $services = @(
        @{ Name = "API Health"; URL = "http://localhost:5000/health" },
        @{ Name = "Nginx"; URL = "http://localhost/nginx-health" },
        @{ Name = "Frontend"; URL = "http://localhost/" },
        @{ Name = "SAMA"; URL = "http://localhost/sama/" },
        @{ Name = "Servicos"; URL = "http://localhost/servicos/" },
        @{ Name = "Agendamentos"; URL = "http://localhost/agendamentos/" },
        @{ Name = "Formularios"; URL = "http://localhost/formularios/" },
        @{ Name = "Iluminacao"; URL = "http://localhost/iluminacao/" }
    )

    $okCount = 0
    $failCount = 0

    foreach ($svc in $services) {
        try {
            $r = Invoke-WebRequest -Uri $svc.URL -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Host "    [OK]   $($svc.Name.PadRight(20)) $($svc.URL)" -ForegroundColor Green
                $okCount++
            }
            else {
                Write-Host "    [??]   $($svc.Name.PadRight(20)) Status: $($r.StatusCode)" -ForegroundColor Yellow
                $failCount++
            }
        }
        catch {
            Write-Host "    [FAIL] $($svc.Name.PadRight(20)) $($svc.URL)" -ForegroundColor Red
            $failCount++
            $script:errors += "$($svc.Name) inacessivel"
        }
    }

    Write-Host ""
    Show-Info "$okCount servicos OK, $failCount com problema"
}

# =============================================================================
# EXECUCAO PRINCIPAL
# =============================================================================

Show-Header
Check-Requirements

# --- 1. Frontend Principal (React) ---
Build-Frontend-React

# --- 2. SAMA (React) ---
Build-SAMA

# --- 3-6. Apps Flutter ---
Build-Flutter-Apps

# --- 7. Docker ---
Start-Docker

# --- 8. Verificacao ---
Verify-Services

# =============================================================================
# RESULTADO FINAL
# =============================================================================

$elapsed = (Get-Date) - $startTime
$minutes = [math]::Floor($elapsed.TotalMinutes)
$seconds = $elapsed.Seconds

Write-Host ""
Write-Host "  ================================================================" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Yellow" })

if ($errors.Count -eq 0) {
    Write-Host "     PROJETO 100% ONLINE!                                      " -ForegroundColor Green
}
else {
    Write-Host "     PROJETO ONLINE (com $($errors.Count) aviso(s))            " -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "       - $err" -ForegroundColor Yellow
    }
}

Write-Host "  ================================================================" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "  Tempo total: ${minutes}m ${seconds}s" -ForegroundColor Gray
Write-Host ""
Write-Host "  Enderecos de Acesso:" -ForegroundColor Cyan
Write-Host "    Dashboard:     http://localhost/dashboard.html" -ForegroundColor White
Write-Host "    Frontend:      http://localhost" -ForegroundColor White
Write-Host "    SAMA:          http://localhost/sama/" -ForegroundColor White
Write-Host "    Servicos:      http://localhost/servicos/" -ForegroundColor White
Write-Host "    Agendamentos:  http://localhost/agendamentos/" -ForegroundColor White
Write-Host "    Formularios:   http://localhost/formularios/" -ForegroundColor White
Write-Host "    Iluminacao:    http://localhost/iluminacao/" -ForegroundColor White
Write-Host "    API:           http://localhost/api" -ForegroundColor White
Write-Host "    API Health:    http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "  Comandos uteis:" -ForegroundColor Gray
Write-Host "    Parar tudo:         docker-compose down" -ForegroundColor DarkGray
Write-Host "    Rebuild completo:   .\subir_projeto.ps1 -Rebuild" -ForegroundColor DarkGray
Write-Host "    Rebuild so SAMA:    .\rebuild_sama.ps1" -ForegroundColor DarkGray
Write-Host "    Logs API:           docker logs api --tail 50" -ForegroundColor DarkGray
Write-Host "    Logs Nginx:         docker logs nginx --tail 50" -ForegroundColor DarkGray
Write-Host ""
