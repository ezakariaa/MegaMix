/**
 * Script pour synchroniser les données depuis Railway vers le serveur local
 * Usage: npx ts-node server/scripts/syncFromRailway.ts
 */

import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import { saveAllData } from '../src/utils/dataPersistence'

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://muzak-server-production.up.railway.app'

interface RailwayData {
  albums: any[]
  tracks: any[]
  artists: any[]
}

async function fetchFromRailway(endpoint: string): Promise<any> {
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

    const req = client.request(options, (res) => {
      let data = ''

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })

      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const json = JSON.parse(data)
            resolve(json)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        } catch (error) {
          reject(new Error(`Erreur de parsing JSON: ${error}`))
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
  } catch (error: any) {
    console.error('[SYNC] ❌ Erreur lors de la synchronisation:', error.message)
    process.exit(1)
  }
}

// Exécuter le script
syncFromRailway()

