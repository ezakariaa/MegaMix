/**
 * Script pour restaurer les données depuis Railway avec logs détaillés
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const RAILWAY_URL = 'https://muzak-server-production.up.railway.app';
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(__dirname, '..', 'restore-log.txt');

async function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  await fs.appendFile(LOG_FILE, logMessage, 'utf-8');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function restoreData() {
  // Nettoyer le log précédent
  await fs.writeFile(LOG_FILE, '', 'utf-8');
  
  try {
    await writeLog('=== DÉBUT DE LA RESTAURATION ===');
    await writeLog(`URL Railway: ${RAILWAY_URL}`);
    
    // Créer le dossier data
    await fs.mkdir(DATA_DIR, { recursive: true });
    await writeLog(`Dossier data: ${DATA_DIR}`);
    
    // Récupérer les albums
    await writeLog('Récupération des albums...');
    const albumsData = await fetchJSON(`${RAILWAY_URL}/api/music/albums`);
    const albums = albumsData.albums || [];
    await writeLog(`✓ ${albums.length} album(s) récupéré(s)`);
    if (albums.length > 0) {
      await writeLog(`  Exemple: ${albums[0].title} - ${albums[0].artist}`);
    }
    
    // Récupérer les pistes
    await writeLog('Récupération des pistes...');
    const tracksData = await fetchJSON(`${RAILWAY_URL}/api/music/tracks`);
    const tracks = tracksData.tracks || [];
    await writeLog(`✓ ${tracks.length} piste(s) récupérée(s)`);
    
    // Récupérer les artistes
    await writeLog('Récupération des artistes...');
    const artistsData = await fetchJSON(`${RAILWAY_URL}/api/music/artists`);
    const artists = artistsData.artists || [];
    await writeLog(`✓ ${artists.length} artiste(s) récupéré(s)`);
    
    // Sauvegarder
    await writeLog('Sauvegarde des fichiers...');
    await fs.writeFile(
      path.join(DATA_DIR, 'albums.json'),
      JSON.stringify(albums, null, 2),
      'utf-8'
    );
    await writeLog('✓ albums.json sauvegardé');
    
    await fs.writeFile(
      path.join(DATA_DIR, 'tracks.json'),
      JSON.stringify(tracks, null, 2),
      'utf-8'
    );
    await writeLog('✓ tracks.json sauvegardé');
    
    await fs.writeFile(
      path.join(DATA_DIR, 'artists.json'),
      JSON.stringify(artists, null, 2),
      'utf-8'
    );
    await writeLog('✓ artists.json sauvegardé');
    
    await writeLog('✅ RESTAURATION TERMINÉE AVEC SUCCÈS!');
    await writeLog(`Résumé: ${albums.length} albums, ${tracks.length} pistes, ${artists.length} artistes`);
    await writeLog('=== FIN DE LA RESTAURATION ===');
    
  } catch (error) {
    await writeLog(`❌ ERREUR: ${error.message}`);
    await writeLog(`Stack: ${error.stack}`);
    console.error(error);
    process.exit(1);
  }
}

restoreData();

