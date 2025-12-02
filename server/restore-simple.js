const https = require('https');
const fs = require('fs');

const RAILWAY = 'https://muzak-server-production.up.railway.app';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    // Créer le dossier data
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data', { recursive: true });
    }
    
    // Récupérer et sauvegarder
    const albums = await get(`${RAILWAY}/api/music/albums`);
    fs.writeFileSync('./data/albums.json', JSON.stringify(albums.albums || [], null, 2));
    console.log(`✓ ${albums.albums?.length || 0} albums sauvegardés`);
    
    const tracks = await get(`${RAILWAY}/api/music/tracks`);
    fs.writeFileSync('./data/tracks.json', JSON.stringify(tracks.tracks || [], null, 2));
    console.log(`✓ ${tracks.tracks?.length || 0} pistes sauvegardées`);
    
    const artists = await get(`${RAILWAY}/api/music/artists`);
    fs.writeFileSync('./data/artists.json', JSON.stringify(artists.artists || [], null, 2));
    console.log(`✓ ${artists.artists?.length || 0} artistes sauvegardés`);
    
    console.log('✅ Restauration terminée!');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();

