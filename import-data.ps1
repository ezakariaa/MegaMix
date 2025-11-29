# Script PowerShell pour importer les donnees locales vers Koyeb
# Encodage: UTF-8 sans BOM

$ErrorActionPreference = "Stop"

Write-Host "Import des donnees vers Koyeb..." -ForegroundColor Cyan

# Verifier que les fichiers existent
$albumsPath = Join-Path $PSScriptRoot "server\data\albums.json"
$tracksPath = Join-Path $PSScriptRoot "server\data\tracks.json"
$artistsPath = Join-Path $PSScriptRoot "server\data\artists.json"

# Si execute depuis la racine du projet
if (-not (Test-Path $albumsPath)) {
    $albumsPath = "server\data\albums.json"
    $tracksPath = "server\data\tracks.json"
    $artistsPath = "server\data\artists.json"
}

Write-Host "Verification des fichiers..." -ForegroundColor Yellow

if (-not (Test-Path $albumsPath)) {
    Write-Host "Erreur: $albumsPath introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $tracksPath)) {
    Write-Host "Erreur: $tracksPath introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $artistsPath)) {
    Write-Host "Erreur: $artistsPath introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Fichiers trouves!" -ForegroundColor Green

# Lire les fichiers JSON avec encodage UTF-8
Write-Host "Lecture des fichiers locaux..." -ForegroundColor Yellow

try {
    $albumsJson = Get-Content -Path $albumsPath -Raw -Encoding UTF8
    $tracksJson = Get-Content -Path $tracksPath -Raw -Encoding UTF8
    $artistsJson = Get-Content -Path $artistsPath -Raw -Encoding UTF8

    $albums = $albumsJson | ConvertFrom-Json
    $tracks = $tracksJson | ConvertFrom-Json
    $artists = $artistsJson | ConvertFrom-Json
} catch {
    Write-Host "Erreur lors de la lecture des fichiers JSON:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "Fichiers lus:" -ForegroundColor Green
Write-Host "   - Albums: $($albums.Count)" -ForegroundColor White
Write-Host "   - Tracks: $($tracks.Count)" -ForegroundColor White
Write-Host "   - Artists: $($artists.Count)" -ForegroundColor White

# Creer le payload
$payload = @{
    albums = $albums
    tracks = $tracks
    artists = $artists
} | ConvertTo-Json -Depth 10 -Compress

# URL du backend Koyeb
$url = "https://effective-donni-opticode-1865a644.koyeb.app/api/music/import-data"

Write-Host "Envoi vers Koyeb..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    
    Write-Host "Import reussi !" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
    Write-Host "   Albums: $($response.counts.albums)" -ForegroundColor White
    Write-Host "   Tracks: $($response.counts.tracks)" -ForegroundColor White
    Write-Host "   Artists: $($response.counts.artists)" -ForegroundColor White
    Write-Host ""
    Write-Host "Vos donnees sont maintenant synchronisees !" -ForegroundColor Cyan
    Write-Host "   Rafraichissez votre site: https://ezakariaa.github.io/MegaMix/" -ForegroundColor White
} catch {
    Write-Host "Erreur lors de l'import:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
