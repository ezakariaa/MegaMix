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
    const albums = JSON.parse(data) as Album[]
    console.log(`[PERSISTENCE] ${albums.length} album(s) chargé(s)`)
    return albums
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier d\'albums trouvé, initialisation avec un tableau vide')
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
    const tracks = JSON.parse(data) as Track[]
    console.log(`[PERSISTENCE] ${tracks.length} piste(s) chargée(s)`)
    return tracks
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier de pistes trouvé, initialisation avec un tableau vide')
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
    const artists = JSON.parse(data) as Artist[]
    console.log(`[PERSISTENCE] ${artists.length} artiste(s) chargé(s)`)
    return artists
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Le fichier n'existe pas encore, retourner un tableau vide
      console.log('[PERSISTENCE] Aucun fichier d\'artistes trouvé, initialisation avec un tableau vide')
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
 * Charge toutes les données (albums, tracks, artists)
 */
export async function loadAllData(): Promise<{ albums: Album[]; tracks: Track[]; artists: Artist[] }> {
  const [albums, tracks, artists] = await Promise.all([
    loadAlbums(),
    loadTracks(),
    loadArtists(),
  ])
  return { albums, tracks, artists }
}

