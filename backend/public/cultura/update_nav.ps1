$rootDir = "C:\Users\marjorie.talberg\Desktop\teatro"
$htmlFiles = Get-ChildItem -Path $rootDir -Recurse -Filter "*.html" | Where-Object { $_.Name -notmatch "_backup_corrupt" -and $_.Name -notmatch "eventos" }

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

    $relPath = Resolve-Path -Relative $file.FullName
    $depth = ($relPath.Split("\")).Count - 2
    
    $eventosPath = ""
    if ($depth -eq 0) {
        $eventosPath = "./eventos/eventos.html"
    } elseif ($depth -eq 1) {
        $eventosPath = "../eventos/eventos.html"
    } elseif ($depth -eq 2) {
        $eventosPath = "../../eventos/eventos.html"
    } else {
        continue
    }
    
    # 1. Desktop NavMenu
    $content = $content -replace '(<a href="\./museu/museu\.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: ''Rubik'', sans-serif; transition: color 0\.3s;">Museu</a>)', ("`$1`n        <a href=`"$eventosPath`" class=`"nav-link`" style=`"color: #ea580c; text-decoration: none; font-weight: 700; font-family: 'Rubik', sans-serif; transition: color 0.3s;`">Eventos</a>")
    
    $content = $content -replace '(<a href="\.\./museu/museu\.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: ''Rubik'', sans-serif; transition: color 0\.3s;">Museu</a>)', ("`$1`n        <a href=`"$eventosPath`" class=`"nav-link`" style=`"color: #ea580c; text-decoration: none; font-weight: 700; font-family: 'Rubik', sans-serif; transition: color 0.3s;`">Eventos</a>")

    $content = $content -replace '(<a href="\.\.\/\.\./museu/museu\.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: ''Rubik'', sans-serif; transition: color 0\.3s;">Museu</a>)', ("`$1`n        <a href=`"$eventosPath`" class=`"nav-link`" style=`"color: #ea580c; text-decoration: none; font-weight: 700; font-family: 'Rubik', sans-serif; transition: color 0.3s;`">Eventos</a>")

    # 2. Mobile Menu
    $content = $content -replace '(<a href="\./museu/museu\.html" class="nav-link" onclick="toggleMenu\(\)">Museu</a>)', ("`$1`n    <a href=`"$eventosPath`" class=`"nav-link`" onclick=`"toggleMenu()`">Eventos</a>")
    
    $content = $content -replace '(<a href="\.\./museu/museu\.html" class="nav-link" onclick="toggleMenu\(\)">Museu</a>)', ("`$1`n    <a href=`"$eventosPath`" class=`"nav-link`" onclick=`"toggleMenu()`">Eventos</a>")
    
    $content = $content -replace '(<a href="\.\.\/\.\./museu/museu\.html" class="nav-link" onclick="toggleMenu\(\)">Museu</a>)', ("`$1`n    <a href=`"$eventosPath`" class=`"nav-link`" onclick=`"toggleMenu()`">Eventos</a>")

    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}
Write-Output "Nav update completed!"
