# Script PowerShell pour restaurer les donnees vers Railway
# Ce script restaure les donnees sauvegardees vers le backend Railway

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"

Write-Host "Restauration des donnees vers Railway..." -ForegroundColor Cyan

# URL du backend Railway
# MODIFIEZ CETTE URL avec votre URL Railway
$railwayUrl = "https://votre-app.up.railway.app"

# Demander l'URL si elle n'est pas modifiee
if ($railwayUrl -eq "https://votre-app.up.railway.app") {
    Write-Host "Veuillez modifier l'URL Railway dans le script ou la saisir maintenant:" -ForegroundColor Yellow
    $railwayUrl = Read-Host "URL Railway (ex: https://votre-app.up.railway.app)"
}

# Verifier que le dossier de sauvegarde existe
if (-not (Test-Path $BackupPath)) {
    Write-Host "Erreur: Le dossier de sauvegarde n'existe pas: $BackupPath" -ForegroundColor Red
    exit 1
}

# Chemin des fichiers JSON
$albumsPath = Join-Path $BackupPath "albums.json"
$tracksPath = Join-Path $BackupPath "tracks.json"
$artistsPath = Join-Path $BackupPath "artists.json"

# Si c'est un fichier ZIP, le decompresser d'abord
if ($BackupPath.EndsWith(".zip")) {
    Write-Host "Decompression de l'archive ZIP..." -ForegroundColor Yellow
    $tempDir = "backups\temp-restore-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Expand-Archive -Path $BackupPath -DestinationPath $tempDir -Force
    $BackupPath = $tempDir
    $albumsPath = Join-Path $BackupPath "albums.json"
    $tracksPath = Join-Path $BackupPath "tracks.json"
    $artistsPath = Join-Path $BackupPath "artists.json"
}

Write-Host "Verification des fichiers de sauvegarde..." -ForegroundColor Yellow

if (-not (Test-Path $albumsPath)) {
    Write-Host "Erreur: albums.json introuvable dans: $BackupPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $tracksPath)) {
    Write-Host "Erreur: tracks.json introuvable dans: $BackupPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $artistsPath)) {
    Write-Host "Erreur: artists.json introuvable dans: $BackupPath" -ForegroundColor Red
    exit 1
}

Write-Host "Fichiers de sauvegarde trouves!" -ForegroundColor Green

# Lire les fichiers JSON
Write-Host "Lecture des fichiers de sauvegarde..." -ForegroundColor Yellow

try {
    $albumsJson = Get-Content -Path $albumsPath -Raw -Encoding UTF8
    $tracksJson = Get-Content -Path $tracksPath -Raw -Encoding UTF8
    $artistsJson = Get-Content -Path $artistsPath -Raw -Encoding UTF8
    
    $albums = $albumsJson | ConvertFrom-Json
    $tracks = $tracksJson | ConvertFrom-Json
    $artists = $artistsJson | ConvertFrom-Json
    
    Write-Host "Fichiers lus:" -ForegroundColor Green
    Write-Host "   - Albums: $($albums.Count)" -ForegroundColor White
    Write-Host "   - Tracks: $($tracks.Count)" -ForegroundColor White
    Write-Host "   - Artists: $($artists.Count)" -ForegroundColor White
} catch {
    Write-Host "Erreur lors de la lecture des fichiers JSON:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$importUrl = "$railwayUrl/api/music/import-data"

# Construire le payload JSON directement
$payloadJson = @"
{
  "albums": $albumsJson,
  "tracks": $tracksJson,
  "artists": $artistsJson
}
"@

Write-Host "Envoi vers Railway..." -ForegroundColor Yellow
Write-Host "URL: $importUrl" -ForegroundColor Gray

try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
    $response = Invoke-RestMethod -Uri $importUrl -Method Post -Body $bytes -ContentType "application/json; charset=utf-8" -TimeoutSec 300
    
    Write-Host "Restauration reussie !" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
    Write-Host "   Albums: $($response.counts.albums)" -ForegroundColor White
    Write-Host "   Tracks: $($response.counts.tracks)" -ForegroundColor White
    Write-Host "   Artists: $($response.counts.artists)" -ForegroundColor White
    Write-Host ""
    Write-Host "Vos donnees ont ete restaurees avec succes sur Railway !" -ForegroundColor Cyan
    Write-Host "   Rafraichissez votre site pour voir les changements" -ForegroundColor White
    
    # Nettoyer le dossier temporaire si c'etait un ZIP
    if ($tempDir -and (Test-Path $tempDir)) {
        Remove-Item -Path $tempDir -Recurse -Force
    }
} catch {
    Write-Host "Erreur lors de la restauration:" -ForegroundColor Red
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

