# 📊 Guide : Importer vos Données Locales vers Koyeb

Vos albums sont stockés localement dans `server/data/`, mais le backend Koyeb a un dossier `data/` vide.

---

## ⚠️ Important : Persistance des Données sur Koyeb

**Sur le plan gratuit de Koyeb, les fichiers ne persistent PAS entre les redémarrages.**

Cela signifie que :
- ❌ Si le service redémarre, les données seront perdues
- ❌ Si le service est mis à jour, les données seront perdues
- ❌ Les données ne sont pas sauvegardées de manière permanente

**Solutions durables** (pour plus tard) :
1. Utiliser une base de données externe (MongoDB Atlas gratuit, Supabase, etc.)
2. Utiliser un service de stockage cloud (Cloudinary, AWS S3, etc.)
3. Utiliser les volumes Koyeb (plan payant)

**Pour l'instant**, utilisons l'endpoint d'import pour synchroniser vos données.

---

## 🚀 Étapes pour Importer vos Données

### Étape 1 : Exporter vos Données Locales

1. **Ouvrez** les fichiers JSON locaux :
   - `server/data/albums.json`
   - `server/data/tracks.json`
   - `server/data/artists.json`

2. **Copiez le contenu** de chaque fichier

### Étape 2 : Préparer les Données pour l'Import

Créez un objet JSON avec cette structure :

```json
{
  "albums": [...],  // Contenu de albums.json
  "tracks": [...],  // Contenu de tracks.json
  "artists": [...]  // Contenu de artists.json
}
```

### Étape 3 : Importer vers Koyeb

**Option A : Utiliser curl (PowerShell)**

```powershell
# Lire les fichiers locaux et créer le payload
$albums = Get-Content -Path "server\data\albums.json" -Raw
$tracks = Get-Content -Path "server\data\tracks.json" -Raw
$artists = Get-Content -Path "server\data\artists.json" -Raw

# Créer le payload JSON
$payload = @{
    albums = ($albums | ConvertFrom-Json)
    tracks = ($tracks | ConvertFrom-Json)
    artists = ($artists | ConvertFrom-Json)
} | ConvertTo-Json -Depth 10

# Envoyer vers Koyeb
$response = Invoke-RestMethod -Uri "https://effective-donni-opticode-1865a644.koyeb.app/api/music/import-data" -Method Post -Body $payload -ContentType "application/json"

Write-Host "Import réussi: $($response.message)"
Write-Host "Albums: $($response.counts.albums), Tracks: $($response.counts.tracks), Artists: $($response.counts.artists)"
```

**Option B : Utiliser un Script Node.js**

Créez un fichier `import-data.js` :

```javascript
const fs = require('fs');
const https = require('https');

// Lire les fichiers locaux
const albums = JSON.parse(fs.readFileSync('server/data/albums.json', 'utf-8'));
const tracks = JSON.parse(fs.readFileSync('server/data/tracks.json', 'utf-8'));
const artists = JSON.parse(fs.readFileSync('server/data/artists.json', 'utf-8'));

// Créer le payload
const payload = JSON.stringify({ albums, tracks, artists });

// Options pour la requête HTTPS
const options = {
  hostname: 'effective-donni-opticode-1865a644.koyeb.app',
  path: '/api/music/import-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

// Envoyer la requête
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('Import réussi:', response.message);
    console.log('Albums:', response.counts.albums);
    console.log('Tracks:', response.counts.tracks);
    console.log('Artists:', response.counts.artists);
  });
});

req.on('error', (error) => {
  console.error('Erreur:', error);
});

req.write(payload);
req.end();
```

Puis exécutez :
```bash
node import-data.js
```

**Option C : Utiliser Postman ou un autre outil API**

1. **Méthode** : POST
2. **URL** : `https://effective-donni-opticode-1865a644.koyeb.app/api/music/import-data`
3. **Headers** : `Content-Type: application/json`
4. **Body** (raw JSON) :
```json
{
  "albums": [...],
  "tracks": [...],
  "artists": [...]
}
```

---

## ✅ Vérification

Après l'import :

1. **Testez l'export** pour vérifier que les données sont bien là :
   ```
   https://effective-donni-opticode-1865a644.koyeb.app/api/music/export-data
   ```

2. **Rafraîchissez votre site** : https://ezakariaa.github.io/MegaMix/

3. **Vérifiez** que vos albums s'affichent

---

## 🔄 Réimporter après un Redémarrage

Si le service Koyeb redémarre et que les données sont perdues, réexécutez simplement l'import.

**Astuce** : Gardez vos fichiers JSON locaux comme sauvegarde !

---

## 📝 Note

Pour une solution permanente, il faudra migrer vers une base de données externe. Mais pour l'instant, cette solution fonctionne pour synchroniser vos données.

