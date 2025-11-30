# Script PowerShell pour importer les donnees locales vers Railway
# Encodage: UTF-8 sans BOM

$ErrorActionPreference = "Stop"

Write-Host "Import des donnees vers Railway..." -ForegroundColor Cyan

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
    # Lire les fichiers JSON bruts
    $albumsJson = Get-Content -Path $albumsPath -Raw -Encoding UTF8
    $tracksJson = Get-Content -Path $tracksPath -Raw -Encoding UTF8
    $artistsJson = Get-Content -Path $artistsPath -Raw -Encoding UTF8
    
    # Parser les JSON pour valider et obtenir les objets
    $albumsParsed = $albumsJson | ConvertFrom-Json
    $tracksParsed = $tracksJson | ConvertFrom-Json
    $artistsParsed = $artistsJson | ConvertFrom-Json
    
    # S'assurer que ce sont des tableaux
    if ($albumsParsed -isnot [Array]) {
        $albumsArray = @($albumsParsed)
    } else {
        $albumsArray = $albumsParsed
    }
    
    if ($tracksParsed -isnot [Array]) {
        $tracksArray = @($tracksParsed)
    } else {
        $tracksArray = $tracksParsed
    }
    
    if ($artistsParsed -isnot [Array]) {
        $artistsArray = @($artistsParsed)
    } else {
        $artistsArray = $artistsParsed
    }
    
    Write-Host "Fichiers lus:" -ForegroundColor Green
    Write-Host "   - Albums: $($albumsArray.Count)" -ForegroundColor White
    Write-Host "   - Tracks: $($tracksArray.Count)" -ForegroundColor White
    Write-Host "   - Artists: $($artistsArray.Count)" -ForegroundColor White
    
    # Creer le payload en construisant manuellement le JSON pour garantir la structure
    # Cela evite les problemes de serialisation PowerShell
    $payloadJson = @"
{
  "albums": $albumsJson,
  "tracks": $tracksJson,
  "artists": $artistsJson
}
"@
    
    $payload = $payloadJson
} catch {
    Write-Host "Erreur lors de la lecture des fichiers JSON:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# URL du backend Railway
# MODIFIEZ CETTE URL si votre URL Railway est differente
$railwayUrl = "https://muzak-server-production.up.railway.app"

$url = "$railwayUrl/api/music/import-data"

Write-Host "Envoi vers Railway..." -ForegroundColor Yellow
Write-Host "URL: $url" -ForegroundColor Gray

try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $bytes -ContentType "application/json; charset=utf-8"
    
    Write-Host "Import reussi !" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
    Write-Host "   Albums: $($response.counts.albums)" -ForegroundColor White
    Write-Host "   Tracks: $($response.counts.tracks)" -ForegroundColor White
    Write-Host "   Artists: $($response.counts.artists)" -ForegroundColor White
    Write-Host ""
    Write-Host "Vos donnees sont maintenant synchronisees avec Railway !" -ForegroundColor Cyan
    Write-Host "   Rafraichissez votre site pour voir les changements" -ForegroundColor White
} catch {
    Write-Host "Erreur lors de l'import:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Verifiez que:" -ForegroundColor Yellow
    Write-Host "   1. L'URL Railway est correcte" -ForegroundColor White
    Write-Host "   2. Le backend Railway est actif" -ForegroundColor White
    Write-Host "   3. L'endpoint /api/music/import-data existe" -ForegroundColor White
    exit 1
}
