# Script PowerShell pour synchroniser les données depuis Railway
$RAILWAY_URL = "https://muzak-server-production.up.railway.app"
$DATA_DIR = Join-Path $PSScriptRoot "..\data"

Write-Host "[SYNC] Synchronisation depuis Railway: $RAILWAY_URL" -ForegroundColor Cyan

# Créer le dossier data s'il n'existe pas
if (-not (Test-Path $DATA_DIR)) {
    New-Item -ItemType Directory -Path $DATA_DIR -Force | Out-Null
}

# Fonction pour récupérer les données depuis Railway
function Get-RailwayData {
    param([string]$Endpoint)
    
    $url = "$RAILWAY_URL/api/music/$Endpoint"
    Write-Host "[SYNC] Requête vers: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30
        return $response
    } catch {
        Write-Host "[SYNC] Erreur lors de la récupération de $Endpoint : $_" -ForegroundColor Red
        throw
    }
}

try {
    # Récupérer les albums
    Write-Host "[SYNC] Récupération des albums..." -ForegroundColor Yellow
    $albumsResponse = Get-RailwayData "albums"
    $albums = $albumsResponse.albums
    Write-Host "[SYNC] $($albums.Count) album(s) récupéré(s)" -ForegroundColor Green
    
    # Récupérer les pistes
    Write-Host "[SYNC] Récupération des pistes..." -ForegroundColor Yellow
    $tracksResponse = Get-RailwayData "tracks"
    $tracks = $tracksResponse.tracks
    Write-Host "[SYNC] $($tracks.Count) piste(s) récupérée(s)" -ForegroundColor Green
    
    # Récupérer les artistes
    Write-Host "[SYNC] Récupération des artistes..." -ForegroundColor Yellow
    $artistsResponse = Get-RailwayData "artists"
    $artists = $artistsResponse.artists
    Write-Host "[SYNC] $($artists.Count) artiste(s) récupéré(s)" -ForegroundColor Green
    
    # Sauvegarder localement
    Write-Host "[SYNC] Sauvegarde locale..." -ForegroundColor Yellow
    $albums | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $DATA_DIR "albums.json") -Encoding UTF8
    $tracks | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $DATA_DIR "tracks.json") -Encoding UTF8
    $artists | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $DATA_DIR "artists.json") -Encoding UTF8
    
    Write-Host "[SYNC] ✅ Synchronisation terminée avec succès!" -ForegroundColor Green
    Write-Host "[SYNC] Résumé: $($albums.Count) album(s), $($tracks.Count) piste(s), $($artists.Count) artiste(s)" -ForegroundColor Cyan
} catch {
    Write-Host "[SYNC] ❌ Erreur lors de la synchronisation: $_" -ForegroundColor Red
    exit 1
}


