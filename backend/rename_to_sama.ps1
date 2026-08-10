$ErrorActionPreference = "Stop"

$publicDir = "c:\Users\saulo.lima\Documents\projetos\api-semit\full\project\backend\public"
$oldDir = "$publicDir\semit-a-pet"
$newDir = "$publicDir\sama"

# 1. Renomear diretório
if (Test-Path $oldDir) {
    Write-Host "Renomeando pasta de $oldDir para $newDir..."
    Rename-Item -Path $oldDir -NewName "sama"
}
elseif (-not (Test-Path $newDir)) {
    Write-Host "Pasta original não encontrada e nova pasta não existe. Verifique se o caminho está correto."
    exit 1
}

# 2. Substituir strings nos arquivos do frontend
Write-Host "Atualizando referências nos arquivos do frontend..."
$files = Get-ChildItem -Path $newDir -Recurse -Include "*.html", "*.js", "*.css", "*.json", "*.map"

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        if ($content -match "/semit-a-pet/") {
            $newContent = $content -replace "/semit-a-pet/", "/sama/"
            Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8 -Force
            Write-Host "Atualizado: $($file.Name)"
        }
    }
    catch {
        Write-Host "Erro ao processar $($file.Name): $_"
    }
}

# 3. Atualizar dashboard.html
$dashboard = "$publicDir\dashboard.html"
if (Test-Path $dashboard) {
    Write-Host "Atualizando dashboard.html..."
    $content = Get-Content -Path $dashboard -Raw
    $content = $content -replace 'href="/semit-a-pet"', 'href="/sama"'
    $content = $content -replace 'class="card card-semit-a-pet"', 'class="card card-sama"'
    $content = $content -replace '<h2 class="card-title">SEMIT A PET</h2>', '<h2 class="card-title">SAMA</h2>'
    $content = $content -replace '--card-color-1: #f093fb;', '--card-color-1: #ff9a9e;' # Nova cor opcional
    $content = $content -replace '--card-color-2: #f5576c;', '--card-color-2: #fecfef;' 
    $content = $content -replace '.card-semit-a-pet', '.card-sama'
    
    Set-Content -Path $dashboard -Value $content -Encoding UTF8
}

Write-Host "Concluído!"
