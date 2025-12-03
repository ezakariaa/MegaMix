/**
 * Script pour synchroniser les données depuis Railway vers le serveur local
 * Usage: node server/scripts/syncFromRailway.js
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')
const fs = require('fs').promises
const path = require('path')

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://muzak-server-production.up.railway.app'
const DATA_DIR = path.resolve(__dirname, '../data')

async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Erreur lors de la création du dossier de données:', error)
  }
}

async function saveAllData(albums, tracks, artists) {
  await ensureDataDirectory()
  await Promise.all([
    fs.writeFile(path.join(DATA_DIR, 'albums.json'), JSON.stringify(albums, null, 2), 'utf-8'),
    fs.writeFile(path.join(DATA_DIR, 'tracks.json'), JSON.stringify(tracks, null, 2), 'utf-8'),
    fs.writeFile(path.join(DATA_DIR, 'artists.json'), JSON.stringify(artists, null, 2), 'utf-8'),
  ])
}

function fetchFromRailway(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${RAILWAY_URL.replace(/\/$/, '')}/api/music/${endpoint}`)
    const client = url.protocol === 'https:' ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'MegaMix-Sync-Script',
      },
    }

    console.log(`[SYNC] Requête vers: ${url.toString()}`)

    const req = client.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk.toString()
      })

      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const json = JSON.parse(data)
            resolve(json)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`))
          }
        } catch (error) {
          reject(new Error(`Erreur de parsing JSON: ${error.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Timeout de la requête'))
    })

    req.end()
  })
}

async function syncFromRailway() {
  console.log(`[SYNC] Synchronisation depuis Railway: ${RAILWAY_URL}`)
  console.log('[SYNC] Récupération des albums...')

  try {
    // Récupérer les albums
    const albumsResponse = await fetchFromRailway('albums')
    const albums = albumsResponse.albums || []
    console.log(`[SYNC] ${albums.length} album(s) récupéré(s)`)

    // Récupérer toutes les pistes directement
    console.log('[SYNC] Récupération des pistes...')
    const tracksResponse = await fetchFromRailway('tracks')
    const allTracks = tracksResponse.tracks || []
    console.log(`[SYNC] ${allTracks.length} piste(s) récupérée(s)`)

    // Récupérer les artistes
    console.log('[SYNC] Récupération des artistes...')
    const artistsResponse = await fetchFromRailway('artists')
    const artists = artistsResponse.artists || []
    console.log(`[SYNC] ${artists.length} artiste(s) récupéré(s)`)

    // Sauvegarder localement
    console.log('[SYNC] Sauvegarde locale...')
    await saveAllData(albums, allTracks, artists)
    console.log('[SYNC] ✅ Synchronisation terminée avec succès!')
    console.log(`[SYNC] Résumé: ${albums.length} album(s), ${allTracks.length} piste(s), ${artists.length} artiste(s)`)
  } catch (error) {
    console.error('[SYNC] ❌ Erreur lors de la synchronisation:', error.message)
    console.error('[SYNC] Stack:', error.stack)
    process.exit(1)
  }
}

// Exécuter le script
syncFromRailway().catch(error => {
  console.error('Erreur fatale:', error)
  process.exit(1)
})


