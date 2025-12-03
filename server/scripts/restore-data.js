/**
 * Script simple pour restaurer les données depuis Railway
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const RAILWAY_URL = 'https://muzak-server-production.up.railway.app';
const DATA_DIR = path.join(__dirname, '..', 'data');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    log(`Requête vers: ${url}`);
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
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
          }
        } catch (error) {
          reject(new Error(`Erreur parsing: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function restoreData() {
  try {
    log('Début de la restauration depuis Railway');
    
    // Créer le dossier data
    await fs.mkdir(DATA_DIR, { recursive: true });
    log(`Dossier data créé/vérifié: ${DATA_DIR}`);
    
    // Récupérer les albums
    log('Récupération des albums...');
    const albumsData = await fetchJSON(`${RAILWAY_URL}/api/music/albums`);
    const albums = albumsData.albums || [];
    log(`✓ ${albums.length} album(s) récupéré(s)`);
    
    // Récupérer les pistes
    log('Récupération des pistes...');
    const tracksData = await fetchJSON(`${RAILWAY_URL}/api/music/tracks`);
    const tracks = tracksData.tracks || [];
    log(`✓ ${tracks.length} piste(s) récupérée(s)`);
    
    // Récupérer les artistes
    log('Récupération des artistes...');
    const artistsData = await fetchJSON(`${RAILWAY_URL}/api/music/artists`);
    const artists = artistsData.artists || [];
    log(`✓ ${artists.length} artiste(s) récupéré(s)`);
    
    // Sauvegarder
    log('Sauvegarde des fichiers...');
    await fs.writeFile(
      path.join(DATA_DIR, 'albums.json'),
      JSON.stringify(albums, null, 2),
      'utf-8'
    );
    log('✓ albums.json sauvegardé');
    
    await fs.writeFile(
      path.join(DATA_DIR, 'tracks.json'),
      JSON.stringify(tracks, null, 2),
      'utf-8'
    );
    log('✓ tracks.json sauvegardé');
    
    await fs.writeFile(
      path.join(DATA_DIR, 'artists.json'),
      JSON.stringify(artists, null, 2),
      'utf-8'
    );
    log('✓ artists.json sauvegardé');
    
    log('✅ RESTAURATION TERMINÉE AVEC SUCCÈS!');
    log(`Résumé: ${albums.length} albums, ${tracks.length} pistes, ${artists.length} artistes`);
    
  } catch (error) {
    log(`❌ ERREUR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

restoreData();


