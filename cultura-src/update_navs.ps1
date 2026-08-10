
$files = Get-ChildItem -Path . -Recurse -Filter *.html

foreach ($file in $files) {
    $text = Get-Content $file.FullName -Raw
    
    if ($text -match '<nav class="nav-menu"(.*?)>(.*?)</nav>') {
        $navContent = $matches[2]
        if ($navContent -notmatch 'Museu') {
            $isRoot = ($file.DirectoryName -eq (Get-Location).Path)
            $prefix = if ($isRoot) { "./" } else { "../" }
            
            if ($navContent -match '<a href="[^"]+" class="nav-link" style="([^"]+)">(In..cio|EMCA|Biblioteca)</a>') {
                $style = $matches[1]
                $newLink = "`n        <a href=`"$prefix`museu/museu.html`" class=`"nav-link`" style=`"$style`">Museu</a>`n      "
                $newNavContent = $navContent -replace '\s+$', $newLink
                $text = $text -replace '(?s)(<nav class="nav-menu"[^>]*>).*?(</nav>)', "`$1$newNavContent`$2"
                Set-Content $file.FullName $text -NoNewline
                Write-Host "Updated $($file.Name)"
            }
        }
    }
    
    # Also update mobile menu if present
    if ($text -match '<div class="mobile-menu" id="mobile-menu">(.*?)</div>') {
        $mobileContent = $matches[1]
        if ($mobileContent -notmatch 'Museu') {
            $isRoot = ($file.DirectoryName -eq (Get-Location).Path)
            $prefix = if ($isRoot) { "./" } else { "../" }
            
            $newLink = "`n    <a href=`"$prefix`museu/museu.html`" class=`"nav-link`" onclick=`"toggleMenu()`">Museu</a>`n  "
            $newMobileContent = $mobileContent -replace '\s+$', $newLink
            $text = $text -replace '(?s)(<div class="mobile-menu" id="mobile-menu">).*?(</div>)', "`$1$newMobileContent`$2"
            Set-Content $file.FullName $text -NoNewline
            Write-Host "Updated Mobile Menu in $($file.Name)"
        }
    }
}

