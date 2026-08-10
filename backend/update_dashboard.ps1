$ErrorActionPreference = "Stop"
$path = "c:\Users\saulo.lima\Documents\projetos\api-semit\full\project\backend\public\dashboard.html"

# Ler conteúdo. Tentar UTF8.
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Substituir DLOC por PrefeituraApp
# Usar regex para evitar problemas com caracteres estranhos
$content = $content -replace 'href="/dloc"', 'href="/servicos"'
$content = $content -replace 'class="card card-dloc"', 'class="card card-prefeitura"'
$content = $content -replace '<h2 class="card-title">DLOC.*</h2>', '<h2 class="card-title">PrefeituraApp</h2>'
$content = $content -replace '(?s)<p class="card-description">\s*Sistema de geolocaliz.*?\s*</p>', '<p class="card-description">Acesso aos serviços digitais da Prefeitura.</p>'
$content = $content -replace '(?s)<!-- Card 3: DLOC -->', '<!-- Card 3: PrefeituraApp -->'

# Remover Card Formulários
# Regex para pegar o bloco inteiro
$patternForms = '(?s)<!-- Card 4:.*?\s*<a href="/forms-garca".*?</a>'
$content = $content -replace $patternForms, ''

Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline
Write-Host "Dashboard atualizado com sucesso."
