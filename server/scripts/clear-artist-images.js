const fs = require('fs')
const path = require('path')

const artistsFile = path.join(__dirname, '../data/artists.json')

console.log('📖 Lecture du fichier artists.json...')
const data = JSON.parse(fs.readFileSync(artistsFile, 'utf-8'))

console.log(`📊 Nombre d'artistes: ${data.length}`)

let clearedCount = 0
data.forEach(artist => {
  if (artist.coverArt) {
    delete artist.coverArt
    clearedCount++
  }
  if (artist.logo) {
    delete artist.logo
  }
})

console.log(`🗑️  ${clearedCount} image(s) d'artiste(s) supprimée(s) du cache`)

// Sauvegarder le fichier modifié
fs.writeFileSync(artistsFile, JSON.stringify(data, null, 2), 'utf-8')

console.log('✅ Cache des images d\'artistes supprimé avec succès!')
console.log('🔄 Les images seront rechargées lors de la prochaine requête.')
