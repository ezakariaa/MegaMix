const fs = require('fs')
const path = require('path')

const artistsFile = path.join(__dirname, '../data/artists.json')

console.log('📖 Lecture du fichier artists.json...')
let data
try {
  const fileContent = fs.readFileSync(artistsFile, 'utf-8')
  data = JSON.parse(fileContent)
} catch (error) {
  console.error('❌ Erreur lors de la lecture:', error)
  process.exit(1)
}

console.log(`📊 Nombre d'artistes: ${data.length}`)

let clearedCount = 0
const cleanedData = data.map(artist => {
  const cleaned = { ...artist }
  if (cleaned.coverArt) {
    delete cleaned.coverArt
    clearedCount++
  }
  if (cleaned.logo) {
    delete cleaned.logo
  }
  return cleaned
})

console.log(`🗑️  ${clearedCount} image(s) d'artiste(s) supprimée(s) du cache`)

// Sauvegarder le fichier modifié
try {
  fs.writeFileSync(artistsFile, JSON.stringify(cleanedData, null, 2), 'utf-8')
  console.log('✅ Cache des images d\'artistes supprimé avec succès!')
  console.log('🔄 Les images seront rechargées depuis iTunes lors de la prochaine requête.')
} catch (error) {
  console.error('❌ Erreur lors de l\'écriture:', error)
  process.exit(1)
}



