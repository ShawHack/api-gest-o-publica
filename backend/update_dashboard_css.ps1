$path = "c:\Users\saulo.lima\Documents\projetos\api-semit\full\project\backend\public\dashboard.html"
$content = Get-Content -Path $path -Raw -Encoding UTF8

if (-not ($content -match ".card-prefeitura")) {
    $css = "
        .card-prefeitura {
            --card-color-1: #4facfe;
            --card-color-2: #00f2fe;
        }
    "
    $content = $content -replace "(\.card-docs \{)", "$css`n        `$1"
    Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline
    Write-Host "CSS adicionado."
}
else {
    Write-Host "CSS já existe."
}
