# Script PowerShell pour importer les données locales vers Koyeb

Write-Host "📊 Import des données vers Koyeb..." -ForegroundColor Cyan

# Vérifier que les fichiers existent
$albumsPath = "server\data\albums.json"
$tracksPath = "server\data\tracks.json"
$artistsPath = "server\data\artists.json"

if (-not (Test-Path $albumsPath)) {
    Write-Host "❌ Erreur: $albumsPath introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $tracksPath)) {
    Write-Host "❌ Erreur: $tracksPath introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $artistsPath)) {
    Write-Host "❌ Erreur: $artistsPath introuvable" -ForegroundColor Red
    exit 1
}

# Lire les fichiers JSON
Write-Host "📖 Lecture des fichiers locaux..." -ForegroundColor Yellow
$albums = Get-Content -Path $albumsPath -Raw | ConvertFrom-Json
$tracks = Get-Content -Path $tracksPath -Raw | ConvertFrom-Json
$artists = Get-Content -Path $artistsPath -Raw | ConvertFrom-Json

Write-Host "✅ Fichiers lus:" -ForegroundColor Green
Write-Host "   - Albums: $($albums.Count)" -ForegroundColor White
Write-Host "   - Tracks: $($tracks.Count)" -ForegroundColor White
Write-Host "   - Artists: $($artists.Count)" -ForegroundColor White

# Créer le payload
$payload = @{
    albums = $albums
    tracks = $tracks
    artists = $artists
} | ConvertTo-Json -Depth 10

# URL du backend Koyeb
$url = "https://effective-donni-opticode-1865a644.koyeb.app/api/music/import-data"

Write-Host "🚀 Envoi vers Koyeb..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json"
    
    Write-Host "✅ Import réussi !" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
    Write-Host "   Albums: $($response.counts.albums)" -ForegroundColor White
    Write-Host "   Tracks: $($response.counts.tracks)" -ForegroundColor White
    Write-Host "   Artists: $($response.counts.artists)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Vos données sont maintenant synchronisées !" -ForegroundColor Cyan
    Write-Host "   Rafraîchissez votre site: https://ezakariaa.github.io/MegaMix/" -ForegroundColor White
} catch {
    Write-Host "❌ Erreur lors de l'import:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}

