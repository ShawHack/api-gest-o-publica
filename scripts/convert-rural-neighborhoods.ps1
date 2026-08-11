param(
  [Parameter(Mandatory = $true)][string]$KmzPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("rural-neighborhoods-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  tar -xf $KmzPath -C $temporaryDirectory
  [xml]$document = Get-Content -LiteralPath (Join-Path $temporaryDirectory 'doc.kml') -Raw -Encoding UTF8
  $namespace = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
  $namespace.AddNamespace('k', 'http://www.opengis.net/kml/2.2')

  $features = foreach ($placemark in $document.SelectNodes('//k:Placemark[k:Polygon or k:MultiGeometry/k:Polygon]', $namespace)) {
    $rawName = $placemark.SelectSingleNode('./k:name', $namespace).InnerText.Trim()
    if ($rawName -like 'Divisa de munic*') { continue }

    $name = ($rawName -replace '^Bairro\s+', '' -replace '\s+', ' ').Trim()
    $name = switch -Regex ($name) {
      '^9 de julho$' { '9 de Julho'; break }
      'Prata\s*/?\s*Adrianita$' { 'Água da Prata / Adrianita'; break }
      default { $name }
    }

    $polygons = @($placemark.SelectNodes('.//k:Polygon', $namespace) | ForEach-Object {
      $rings = @($_.SelectNodes('.//k:LinearRing/k:coordinates', $namespace) | ForEach-Object {
        $values = @($_.InnerText.Trim() -split '\s+' | Where-Object { $_ } | ForEach-Object {
          $parts = $_ -split ','
          @([double]::Parse($parts[0], [Globalization.CultureInfo]::InvariantCulture), [double]::Parse($parts[1], [Globalization.CultureInfo]::InvariantCulture))
        })
        ,$values
      })
      ,$rings
    })

    [ordered]@{
      type = 'Feature'
      properties = [ordered]@{ name = $name }
      geometry = if ($polygons.Count -eq 1) {
        [ordered]@{ type = 'Polygon'; coordinates = $polygons[0] }
      } else {
        [ordered]@{ type = 'MultiPolygon'; coordinates = $polygons }
      }
    }
  }

  $unique = @($features | Group-Object { $_.properties.name } | ForEach-Object { $_.Group[0] })
  [ordered]@{ type = 'FeatureCollection'; features = $unique } |
    ConvertTo-Json -Depth 20 -Compress |
    Set-Content -LiteralPath $OutputPath -Encoding UTF8
} finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    [System.IO.Directory]::Delete([string]$temporaryDirectory, $true)
  }
}
