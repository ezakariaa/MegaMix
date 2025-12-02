// Test simple de connexion à Railway
const https = require('https');

console.log('Test de connexion à Railway...');

https.get('https://muzak-server-production.up.railway.app/api/music/albums', (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`Albums trouvés: ${json.albums ? json.albums.length : 0}`);
      if (json.albums && json.albums.length > 0) {
        console.log(`Premier album: ${json.albums[0].title}`);
      }
    } catch (e) {
      console.error('Erreur parsing:', e.message);
      console.log('Réponse brute:', data.substring(0, 200));
    }
  });
}).on('error', (e) => {
  console.error('Erreur:', e.message);
});

