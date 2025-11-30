# Script PowerShell pour sauvegarder les donnees depuis Railway
# Ce script exporte les donnees (albums, tracks, artists) depuis le backend Railway

$ErrorActionPreference = "Stop"

Write-Host "Sauvegarde des donnees depuis Railway..." -ForegroundColor Cyan

# URL du backend Railway
# MODIFIEZ CETTE URL avec votre URL Railway
$railwayUrl = "https://votre-app.up.railway.app"

# Demander l'URL si elle n'est pas modifiee
if ($railwayUrl -eq "https://votre-app.up.railway.app") {
    Write-Host "Veuillez modifier l'URL Railway dans le script ou la saisir maintenant:" -ForegroundColor Yellow
    $railwayUrl = Read-Host "URL Railway (ex: https://votre-app.up.railway.app)"
}

# Creer un dossier de sauvegarde avec timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backups\railway-$timestamp"

if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

New-Item -ItemType Directory -Path $backupDir | Out-Null

Write-Host "Dossier de sauvegarde cree: $backupDir" -ForegroundColor Green

# URL de l'endpoint d'export
$exportUrl = "$railwayUrl/api/music/export-data"

Write-Host "Telechargement des donnees depuis Railway..." -ForegroundColor Yellow
Write-Host "URL: $exportUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $exportUrl -Method Get -TimeoutSec 60
    
    if ($response.success) {
        Write-Host "Donnees telechargees avec succes!" -ForegroundColor Green
        Write-Host "   - Albums: $($response.counts.albums)" -ForegroundColor White
        Write-Host "   - Tracks: $($response.counts.tracks)" -ForegroundColor White
        Write-Host "   - Artists: $($response.counts.artists)" -ForegroundColor White
        
        # Sauvegarder les fichiers JSON
        $albumsPath = Join-Path $backupDir "albums.json"
        $tracksPath = Join-Path $backupDir "tracks.json"
        $artistsPath = Join-Path $backupDir "artists.json"
        
        $response.albums | ConvertTo-Json -Depth 10 | Set-Content -Path $albumsPath -Encoding UTF8
        $response.tracks | ConvertTo-Json -Depth 10 | Set-Content -Path $tracksPath -Encoding UTF8
        $response.artists | ConvertTo-Json -Depth 10 | Set-Content -Path $artistsPath -Encoding UTF8
        
        Write-Host ""
        Write-Host "Fichiers sauvegardes dans: $backupDir" -ForegroundColor Green
        Write-Host "   - albums.json" -ForegroundColor White
        Write-Host "   - tracks.json" -ForegroundColor White
        Write-Host "   - artists.json" -ForegroundColor White
        
        # Creer aussi un fichier zip de la sauvegarde
        $zipPath = "$backupDir.zip"
        Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -Force
        
        Write-Host ""
        Write-Host "Archive ZIP creee: $zipPath" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Sauvegarde terminee avec succes!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Pour restaurer, utilisez: .\restore-railway-data.ps1 -BackupPath `"$backupDir`"" -ForegroundColor Yellow
    } else {
        Write-Host "Erreur: La reponse du serveur indique un echec" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Erreur lors de la sauvegarde:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Verifiez que:" -ForegroundColor Yellow
    Write-Host "   1. L'URL Railway est correcte" -ForegroundColor White
    Write-Host "   2. Le backend Railway est actif" -ForegroundColor White
    Write-Host "   3. L'endpoint /api/music/export-data existe" -ForegroundColor White
    exit 1
}

