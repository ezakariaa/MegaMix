import * as fs from 'fs/promises'
import * as path from 'path'
import { Album, Track, Artist } from '../types'

// Le fichier dataPersistence.ts est dans server/src/utils, donc on remonte de 2 niveaux pour arriver à server/
// En CommonJS, on peut utiliser require pour obtenir __dirname
// Mais comme on est en TypeScript, on utilise path.resolve avec process.cwd()
// Si le serveur est lancé depuis server/, alors process.cwd() pointe vers server/
// Sinon, on utilise __dirname depuis le fichier compilé
const DATA_DIR = path.resolve(process.cwd(), 'data')
const ALBUMS_FILE = path.join(DATA_DIR, 'albums.json')
const TRACKS_FILE = path.join(DATA_DIR, 'tracks.json')
const ARTISTS_FILE = path.join(DATA_DIR, 'artists.json')

/**
 * Assure que le dossier de données existe
 */
export async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Erreur lors de la création du dossier de données:', error)
  }
}

/**
 * Sauvegarde les albums dans un fichier JSON
 */
export async function saveAlbums(albums: Album[]): Promise<void> {
  try {
    await ensureDataDirectory()
    await fs.writeFile(ALBUMS_FILE, JSON.stringify(albums, null, 2), 'utf-8')
    console.log(`[PERSISTENCE] ${albums.length} album(s) sauvegardé(s)`)
  } catch (error) {
    console.error('[PERSISTENCE] Erreur lors de la sauvegarde des albums:', error)
  }
}

/**
 * Charge les albums depuis un fichier JSON
 */
export async function loadAlbums(): Promise<Album[]> {
  try {
    const data = await fs.readFile(ALBUMS_FILE, 'utf-8')
    // Vérifier si le fichier est vide ou ne contient que des espaces
    const trimmedData = data.trim()
    if (!trimmedData || trimmedData === '') {
      console.log('[PERSISTENCE] Fichier d\'albums vide, retour d\'un tableau vide (NE PAS ÉCRASER)')
      return []
    }
    const albums = JSON.parse(trimmedData) as Album[]
    if (!Array.isArray(albums)) {
      console.warn('[PERSISTENCE] Format invalide dans albums.json')
      return []
    }
    console.log(`[PERSISTENCE] ${albums.length} album(s) chargé(s)`)
    return albums
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier d\'albums trouvé')
      return []
    }
    // Si erreur de parsing (fichier corrompu), ne pas écraser, juste retourner vide
    if (error instanceof SyntaxError) {
      console.warn('[PERSISTENCE] Fichier albums.json corrompu (ne sera pas écrasé)')
      return []
    }
    console.error('[PERSISTENCE] Erreur lors du chargement des albums:', error)
    return []
  }
}

/**
 * Sauvegarde les pistes dans un fichier JSON
 */
export async function saveTracks(tracks: Track[]): Promise<void> {
  try {
    await ensureDataDirectory()
    await fs.writeFile(TRACKS_FILE, JSON.stringify(tracks, null, 2), 'utf-8')
    console.log(`[PERSISTENCE] ${tracks.length} piste(s) sauvegardée(s)`)
  } catch (error) {
    console.error('[PERSISTENCE] Erreur lors de la sauvegarde des pistes:', error)
  }
}

/**
 * Charge les pistes depuis un fichier JSON
 */
export async function loadTracks(): Promise<Track[]> {
  try {
    const data = await fs.readFile(TRACKS_FILE, 'utf-8')
    // Vérifier si le fichier est vide ou ne contient que des espaces
    const trimmedData = data.trim()
    if (!trimmedData || trimmedData === '') {
      console.log('[PERSISTENCE] Fichier de pistes vide')
      return []
    }
    const tracks = JSON.parse(trimmedData) as Track[]
    if (!Array.isArray(tracks)) {
      console.warn('[PERSISTENCE] Format invalide dans tracks.json')
      return []
    }
    console.log(`[PERSISTENCE] ${tracks.length} piste(s) chargée(s)`)
    return tracks
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier de pistes trouvé')
      return []
    }
    // Si erreur de parsing (fichier corrompu), ne pas écraser, juste retourner vide
    if (error instanceof SyntaxError) {
      console.warn('[PERSISTENCE] Fichier tracks.json corrompu (ne sera pas écrasé)')
      return []
    }
    console.error('[PERSISTENCE] Erreur lors du chargement des pistes:', error)
    return []
  }
}

/**
 * Sauvegarde les artistes dans un fichier JSON
 */
export async function saveArtists(artists: Artist[]): Promise<void> {
  try {
    await ensureDataDirectory()
    await fs.writeFile(ARTISTS_FILE, JSON.stringify(artists, null, 2), 'utf-8')
    console.log(`[PERSISTENCE] ${artists.length} artiste(s) sauvegardé(s)`)
  } catch (error) {
    console.error('[PERSISTENCE] Erreur lors de la sauvegarde des artistes:', error)
  }
}

/**
 * Charge les artistes depuis un fichier JSON
 */
export async function loadArtists(): Promise<Artist[]> {
  try {
    const data = await fs.readFile(ARTISTS_FILE, 'utf-8')
    // Vérifier si le fichier est vide ou ne contient que des espaces
    const trimmedData = data.trim()
    if (!trimmedData || trimmedData === '') {
      console.log('[PERSISTENCE] Fichier d\'artistes vide')
      return []
    }
    const artists = JSON.parse(trimmedData) as Artist[]
    if (!Array.isArray(artists)) {
      console.warn('[PERSISTENCE] Format invalide dans artists.json')
      return []
    }
    console.log(`[PERSISTENCE] ${artists.length} artiste(s) chargé(s)`)
    return artists
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier d\'artistes trouvé')
      return []
    }
    // Si erreur de parsing (fichier corrompu), ne pas écraser, juste retourner vide
    if (error instanceof SyntaxError) {
      console.warn('[PERSISTENCE] Fichier artists.json corrompu (ne sera pas écrasé)')
      return []
    }
    console.error('[PERSISTENCE] Erreur lors du chargement des artistes:', error)
    return []
  }
}

/**
 * Sauvegarde toutes les données (albums, tracks, artists)
 */
export async function saveAllData(albums: Album[], tracks: Track[], artists: Artist[]): Promise<void> {
  await Promise.all([
    saveAlbums(albums),
    saveTracks(tracks),
    saveArtists(artists),
  ])
}

/**
 * Récupère les données depuis Railway si les fichiers locaux sont vides
 * ⚠️ SÉCURITÉ : Cette fonction ne fait QUE LIRE depuis Railway (requêtes GET uniquement)
 * Elle ne modifie JAMAIS les données sur Railway, seulement les fichiers locaux
 */
async function fetchFromRailwayIfEmpty(albums: Album[], tracks: Track[], artists: Artist[]): Promise<{ albums: Album[]; tracks: Track[]; artists: Artist[] }> {
  // Si on a déjà des données locales, ne rien faire (protection contre l'écrasement)
  if (albums.length > 0 || tracks.length > 0 || artists.length > 0) {
    console.log('[PERSISTENCE] Données locales présentes, pas de restauration depuis Railway')
    return { albums, tracks, artists }
  }

  // Vérifier si Railway est configuré
  const railwayUrl = process.env.RAILWAY_URL || process.env.KOYEB_URL
  if (!railwayUrl) {
    console.log('[PERSISTENCE] Aucune URL Railway configurée, pas de restauration automatique')
    return { albums, tracks, artists }
  }

  console.log('[PERSISTENCE] Fichiers locaux vides, tentative de restauration depuis Railway...')
  
  try {
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')

    // Fonction pour LIRE uniquement depuis Railway (GET uniquement, jamais POST/PUT/DELETE)
    function fetchJSON(endpoint: string): Promise<any> {
      return new Promise((resolve, reject) => {
        const url = new URL(`${railwayUrl.replace(/\/$/, '')}/api/music/${endpoint}`)
        const client = url.protocol === 'https:' ? https : http

        // ⚠️ SÉCURITÉ : Utilisation de GET uniquement (lecture seule)
        const req = client.request({
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET', // LECTURE SEULE - ne modifie jamais les données sur Railway
          timeout: 30000,
        }, (res) => {
          let data = ''
          res.on('data', (chunk: Buffer) => { data += chunk.toString() })
          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(data))
              } else {
                reject(new Error(`HTTP ${res.statusCode}`))
              }
            } catch (error) {
              reject(error)
            }
          })
        })

        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Timeout'))
        })
        req.end()
      })
    }

    // Récupérer les données
    const [albumsData, tracksData, artistsData] = await Promise.all([
      fetchJSON('albums'),
      fetchJSON('tracks'),
      fetchJSON('artists'),
    ])

    const fetchedAlbums = albumsData.albums || []
    const fetchedTracks = tracksData.tracks || []
    const fetchedArtists = artistsData.artists || []

    if (fetchedAlbums.length > 0 || fetchedTracks.length > 0 || fetchedArtists.length > 0) {
      console.log(`[PERSISTENCE] ✅ Données restaurées depuis Railway: ${fetchedAlbums.length} albums, ${fetchedTracks.length} pistes, ${fetchedArtists.length} artistes`)
      // ⚠️ SÉCURITÉ : Sauvegarder UNIQUEMENT localement (pas de syncToKoyeb ici)
      // saveAllData ne fait que sauvegarder dans les fichiers JSON locaux, jamais sur Railway
      await saveAllData(fetchedAlbums, fetchedTracks, fetchedArtists)
      console.log('[PERSISTENCE] Données sauvegardées localement uniquement (Railway non modifié)')
      return { albums: fetchedAlbums, tracks: fetchedTracks, artists: fetchedArtists }
    } else {
      console.log('[PERSISTENCE] Railway ne contient pas de données non plus')
      return { albums, tracks, artists }
    }
  } catch (error: any) {
    console.warn('[PERSISTENCE] Erreur lors de la restauration depuis Railway:', error.message)
    return { albums, tracks, artists }
  }
}

/**
 * Charge toutes les données (albums, tracks, artists)
 */
export async function loadAllData(): Promise<{ albums: Album[]; tracks: Track[]; artists: Artist[] }> {
  const [albums, tracks, artists] = await Promise.all([
    loadAlbums(),
    loadTracks(),
    loadArtists(),
  ])
  
  // Si les fichiers sont vides, essayer de récupérer depuis Railway
  const result = await fetchFromRailwayIfEmpty(albums, tracks, artists)
  return result
}

