# Script para migrar dados do MongoDB do servidor Linux para Windows
# Requer: mongodump e mongorestore instalados

param(
    [string]$LinuxServer = "",
    [string]$LinuxUser = "",
    [string]$BackupPath = "C:\mongodb-backup",
    [string]$DatabaseName = "apicemiterio"
)

Write-Host "📦 Script de Migração de Dados MongoDB" -ForegroundColor Green
Write-Host ""

if ([string]::IsNullOrEmpty($LinuxServer)) {
    Write-Host "Uso: .\migrate-data-windows.ps1 -LinuxServer usuario@servidor-linux -BackupPath C:\mongodb-backup" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Cyan
    Write-Host "  -LinuxServer    Servidor Linux (ex: usuario@192.168.1.100)" -ForegroundColor White
    Write-Host "  -LinuxUser      Usuário SSH (se não especificado no LinuxServer)" -ForegroundColor White
    Write-Host "  -BackupPath     Caminho local para salvar backup (padrão: C:\mongodb-backup)" -ForegroundColor White
    Write-Host "  -DatabaseName   Nome do banco (padrão: apicemiterio)" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemplo:" -ForegroundColor Cyan
    Write-Host "  .\migrate-data-windows.ps1 -LinuxServer admin@servidor-linux -BackupPath C:\backup" -ForegroundColor White
    exit 0
}

# Verificar se mongodump está disponível (no Linux)
Write-Host "🔍 Verificando ferramentas necessárias..." -ForegroundColor Cyan

# Verificar se mongorestore está disponível (no Windows)
if (-not (Get-Command mongorestore -ErrorAction SilentlyContinue)) {
    Write-Host "❌ mongorestore não encontrado. Por favor, instale o MongoDB Database Tools." -ForegroundColor Red
    Write-Host "   Download: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
    exit 1
}

# Criar diretório de backup
if (-not (Test-Path $BackupPath)) {
    Write-Host "📁 Criando diretório de backup: $BackupPath" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

Write-Host ""
Write-Host "Escolha o método de migração:" -ForegroundColor Cyan
Write-Host "  1. Exportar do Linux via SSH e importar localmente" -ForegroundColor White
Write-Host "  2. Importar de um backup já existente" -ForegroundColor White
Write-Host "  3. Conectar diretamente ao MongoDB do Linux (requer acesso de rede)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Digite o número da opção (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📤 Exportando dados do servidor Linux..." -ForegroundColor Cyan
        
        # Comando para executar no Linux via SSH
        $exportCommand = "mongodump --uri='mongodb://localhost:27017/$DatabaseName' --out=/tmp/mongodb-backup"
        
        Write-Host "Executando no servidor Linux: $exportCommand" -ForegroundColor Yellow
        Write-Host "Por favor, execute manualmente no servidor Linux:" -ForegroundColor Yellow
        Write-Host "  ssh $LinuxServer" -ForegroundColor White
        Write-Host "  $exportCommand" -ForegroundColor White
        Write-Host "  tar -czf mongodb-backup.tar.gz /tmp/mongodb-backup" -ForegroundColor White
        Write-Host ""
        
        $continue = Read-Host "Após exportar, copie o arquivo para este servidor. Pressione Enter quando estiver pronto..."
        
        $backupFile = Read-Host "Digite o caminho completo do arquivo .tar.gz copiado"
        
        if (-not (Test-Path $backupFile)) {
            Write-Host "❌ Arquivo não encontrado: $backupFile" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "📦 Extraindo backup..." -ForegroundColor Cyan
        # Extrair usando tar (Windows 10+ tem suporte nativo)
        $extractPath = Join-Path $BackupPath "extracted"
        if (Test-Path $extractPath) {
            Remove-Item -Path $extractPath -Recurse -Force
        }
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
        
        tar -xzf $backupFile -C $extractPath
        
        $dbPath = Get-ChildItem -Path $extractPath -Recurse -Directory | Where-Object { $_.Name -eq $DatabaseName } | Select-Object -First 1
        
        if (-not $dbPath) {
            Write-Host "❌ Estrutura de backup inválida. Procurando em /tmp/mongodb-backup..." -ForegroundColor Red
            $dbPath = Get-ChildItem -Path $extractPath -Recurse -Directory | Where-Object { $_.Name -eq $DatabaseName } | Select-Object -First 1
        }
        
        if (-not $dbPath) {
            Write-Host "❌ Não foi possível encontrar o diretório do banco de dados no backup." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Backup extraído em: $($dbPath.FullName)" -ForegroundColor Green
        $restorePath = $dbPath.FullName
    }
    
    "2" {
        Write-Host ""
        $backupDir = Read-Host "Digite o caminho do diretório de backup (deve conter a pasta $DatabaseName)"
        
        if (-not (Test-Path $backupDir)) {
            Write-Host "❌ Diretório não encontrado: $backupDir" -ForegroundColor Red
            exit 1
        }
        
        $dbPath = Join-Path $backupDir $DatabaseName
        if (-not (Test-Path $dbPath)) {
            Write-Host "❌ Diretório do banco não encontrado: $dbPath" -ForegroundColor Red
            exit 1
        }
        
        $restorePath = $dbPath
    }
    
    "3" {
        Write-Host ""
        $mongoUri = Read-Host "Digite a URI de conexão MongoDB (ex: mongodb://usuario:senha@servidor:27017/$DatabaseName)"
        
        Write-Host "📤 Exportando dados do servidor remoto..." -ForegroundColor Cyan
        $exportPath = Join-Path $BackupPath "export-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $exportPath -Force | Out-Null
        
        mongodump --uri=$mongoUri --out=$exportPath
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Erro ao exportar dados." -ForegroundColor Red
            exit 1
        }
        
        $restorePath = Join-Path $exportPath $DatabaseName
    }
    
    default {
        Write-Host "❌ Opção inválida." -ForegroundColor Red
        exit 1
    }
}

# Confirmar antes de restaurar
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Esta operação vai SOBRESCREVER os dados existentes no banco local!" -ForegroundColor Red
$confirm = Read-Host "Deseja continuar? (sim/não)"

if ($confirm -ne "sim" -and $confirm -ne "s" -and $confirm -ne "yes" -and $confirm -ne "y") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

# Restaurar dados
Write-Host ""
Write-Host "📥 Restaurando dados no MongoDB local..." -ForegroundColor Cyan
Write-Host "Caminho: $restorePath" -ForegroundColor Yellow

mongorestore --uri="mongodb://localhost:27017/$DatabaseName" --drop "$restorePath"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migração concluída com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifique os dados:" -ForegroundColor Cyan
    Write-Host "  mongosh" -ForegroundColor White
    Write-Host "  use $DatabaseName" -ForegroundColor White
    Write-Host "  db.users.countDocuments()" -ForegroundColor White
    Write-Host "  db.sepultados.countDocuments()" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Erro ao restaurar dados. Verifique os logs acima." -ForegroundColor Red
    exit 1
}


