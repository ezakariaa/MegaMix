$artistsFile = Join-Path $PSScriptRoot "..\data\artists.json"

Write-Host "📖 Lecture du fichier artists.json..." -ForegroundColor Cyan
$artists = Get-Content $artistsFile -Raw | ConvertFrom-Json

Write-Host "📊 Nombre d'artistes: $($artists.Count)" -ForegroundColor Cyan

$clearedCount = 0
foreach ($artist in $artists) {
    if ($artist.coverArt) {
        $artist.PSObject.Properties.Remove('coverArt')
        $clearedCount++
    }
    if ($artist.logo) {
        $artist.PSObject.Properties.Remove('logo')
    }
}

Write-Host "🗑️  $clearedCount image(s) d'artiste(s) supprimée(s) du cache" -ForegroundColor Yellow

# Sauvegarder le fichier modifié
$artists | ConvertTo-Json -Depth 10 | Set-Content $artistsFile -Encoding UTF8

Write-Host "✅ Cache des images d'artistes supprimé avec succès!" -ForegroundColor Green
Write-Host "🔄 Les images seront rechargées lors de la prochaine requête." -ForegroundColor Green



