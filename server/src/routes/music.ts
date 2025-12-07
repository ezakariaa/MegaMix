import express, { Request, Response } from 'express'
import multer from 'multer'
import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { scanMusicFolder } from '../services/musicScanner'
import { parseFile } from 'music-metadata'
import { Album, Track, Artist, Genre } from '../types'
import { loadAllData, saveAllData, saveAlbums, saveTracks, saveArtists } from '../utils/dataPersistence'
import { searchArtistImage, searchLastFm } from '../utils/artistImageSearch'
import { getArtistBiography } from '../utils/artistBiography'
import { syncToKoyeb } from '../utils/syncToKoyeb'

// Import conditionnel de sharp (peut ne pas être installé)
let sharp: any = null
try {
  sharp = require('sharp')
} catch (error) {
  console.warn('Sharp n\'est pas installé. Les images ne seront pas optimisées.')
}

const router = express.Router()

// Configuration multer pour les fichiers
const uploadDir = path.join(process.cwd(), 'uploads', 'temp')
// Plus besoin de musicLibraryDir - les fichiers restent dans uploads/temp pour éviter la duplication

// Créer le dossier temporaire au démarrage (les fichiers y restent)
fs.mkdir(uploadDir, { recursive: true }).catch(() => {})

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  },
})

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max par fichier
})

// Stockage en mémoire (persisté dans des fichiers JSON)
let albums: Album[] = []
let tracks: Track[] = []
let artists: Artist[] = []
let dataLoaded = false // Flag pour indiquer si les données sont chargées
let genresCache: Genre[] | null = null // Cache pour les genres calculés

// Suivi des utilisateurs actifs (Map<sessionId, timestamp>)
const activeUsers = new Map<string, number>()
const ACTIVE_USER_TIMEOUT = 2 * 60 * 1000 // 2 minutes
let genresCacheTimestamp = 0 // Timestamp du cache
// Cache valide pendant 1 minute
const GENRES_CACHE_DURATION_MS = (60 * 1000) as number

// Charger les données au démarrage de manière PRIORITAIRE
// Essayer de charger immédiatement, mais ne pas bloquer le serveur plus de 2 secondes
(async () => {
  try {
    const startTime = Date.now()
    // Timeout de 2 secondes maximum pour le chargement initial
    const loadPromise = loadAllData()
    const timeoutPromise = new Promise<{ albums: Album[]; tracks: Track[]; artists: Artist[] }>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout chargement initial')), 2000)
    )
    
    try {
      const { albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists } = await Promise.race([
        loadPromise,
        timeoutPromise
      ])
      albums = loadedAlbums
      tracks = loadedTracks
      artists = loadedArtists
      dataLoaded = true
      const loadTime = Date.now() - startTime
      console.log(`[INIT] ✅ Données chargées en ${loadTime}ms: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)
    } catch (timeoutError) {
      // Si timeout, continuer le chargement en arrière-plan
      console.warn('[INIT] ⚠️ Chargement initial lent, continuation en arrière-plan...')
      dataLoaded = false // Les données ne sont pas encore chargées
      loadPromise.then(({ albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists }) => {
        albums = loadedAlbums
        tracks = loadedTracks
        artists = loadedArtists
        dataLoaded = true
        const loadTime = Date.now() - startTime
        console.log(`[INIT] ✅ Données chargées en arrière-plan en ${loadTime}ms: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)
      }).catch((error) => {
        console.error('[INIT] ❌ Erreur lors du chargement en arrière-plan:', error)
        dataLoaded = true
      })
    }
  } catch (error) {
    console.error('[INIT] ❌ Erreur lors du chargement des données:', error)
    dataLoaded = true // Marquer comme chargé même en cas d'erreur pour éviter de bloquer indéfiniment
  }
})()

/**
 * Route pour scanner des fichiers audio uploadés
 */
router.post('/scan-files', upload.array('files', 100), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' })
    }

    console.log(`Début du traitement de ${files.length} fichier(s)`)

    const albumsMap = new Map<string, Album>()
    const newTracks: Track[] = []
    const artistsMap = new Map<string, Artist>()

    // Traiter chaque fichier en parallèle (par batches pour éviter la surcharge)
    const BATCH_SIZE = 5 // Traiter 5 fichiers en parallèle
    const processFile = async (file: Express.Multer.File) => {
      try {
        // Extraire les métadonnées ET la couverture en une seule passe
        const { track, coverArt } = await extractTrackMetadataAndCover(file.path)
        
        if (track) {
          // NE PAS COPIER : conserver le fichier dans uploads/temp et servir depuis là
          // Le fichier reste dans uploads/temp et sera servi directement depuis cet emplacement
          // Cela évite de dupliquer 2To de musique
          track.filePath = file.path // Utiliser le chemin du fichier temporaire
          
          newTracks.push(track)

          // Créer ou mettre à jour l'album
          // Utiliser l'artiste de l'album (albumArtist) pour créer l'album, pas l'artiste de la piste
          const albumArtistForAlbum = track.albumArtist || track.artist
          const albumArtistIdForAlbum = track.albumArtistId || track.artistId
          const isCompilation = albumArtistForAlbum.toLowerCase().includes('various') || 
                                albumArtistForAlbum.toLowerCase().includes('compilation') ||
                                albumArtistForAlbum.toLowerCase().includes('various artists') ||
                                albumArtistForAlbum.toLowerCase() === 'various'
          const albumKey = isCompilation ? track.albumId : `${albumArtistIdForAlbum}-${track.albumId}`
          if (!albumsMap.has(albumKey)) {
            albumsMap.set(albumKey, {
              id: track.albumId,
              title: track.album || 'Album Inconnu',
              artist: albumArtistForAlbum, // Artiste de l'album (Album Artist)
              artistId: albumArtistIdForAlbum,
              year: track.year,
              genre: track.genre,
              trackCount: 1,
              coverArt: coverArt ?? undefined,
            })
          } else {
            const album = albumsMap.get(albumKey)!
            album.trackCount = (album.trackCount || 0) + 1
            // Ne mettre à jour la couverture que si l'album n'en a pas encore
            if (!album.coverArt && coverArt) {
              album.coverArt = coverArt
            }
          }

          // Créer ou mettre à jour les artistes (séparer les artistes multiples)
          const artistNames = splitArtists(track.artist)
          artistNames.forEach((artistName: string) => {
            const artistId = generateId(artistName)
            if (!artistsMap.has(artistId)) {
              artistsMap.set(artistId, {
                id: artistId,
                name: artistName,
                trackCount: 1,
              })
            } else {
              const artist = artistsMap.get(artistId)!
              artist.trackCount = (artist.trackCount || 0) + 1
            }
          })
        }

        // NE PAS SUPPRIMER le fichier temporaire - il sera servi directement depuis là
        // Les fichiers restent dans uploads/temp pour éviter la duplication
      } catch (error: any) {
        console.error(`Erreur lors du traitement de ${file.originalname}:`, error?.message || error)
        // Ne pas supprimer même en cas d'erreur pour permettre la récupération
      }
    }

    // Traiter par batches pour éviter la surcharge mémoire
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(processFile))
      console.log(`Traités ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} fichiers`)
    }

    const newAlbums = Array.from(albumsMap.values())
    const newArtists = Array.from(artistsMap.values())

    // Ajouter les nouveaux albums (éviter les doublons)
    newAlbums.forEach(newAlbum => {
      const existingIndex = albums.findIndex(a => a.id === newAlbum.id)
      if (existingIndex >= 0) {
        albums[existingIndex] = newAlbum
      } else {
        albums.push(newAlbum)
      }
    })

    // Ajouter les nouvelles pistes
    tracks.push(...newTracks)

    // Ajouter les nouveaux artistes
    newArtists.forEach(newArtist => {
      const existingIndex = artists.findIndex(a => a.id === newArtist.id)
      if (existingIndex >= 0) {
        artists[existingIndex] = newArtist
      } else {
        artists.push(newArtist)
      }
    })

    // Sauvegarder les données après modification
    try {
      await saveAllData(albums, tracks, artists)
      console.log('[PERSISTENCE] Données sauvegardées avec succès après scan de fichiers locaux')
      
      // Synchroniser avec Koyeb/Railway en arrière-plan (ne pas bloquer la réponse)
      syncToKoyeb(albums, tracks, artists).catch((error) => {
        console.error('[SYNC] Erreur lors de la synchronisation après scan de fichiers locaux:', error)
      })
    } catch (error) {
      console.error('[PERSISTENCE] Erreur lors de la sauvegarde après scan de fichiers locaux:', error)
      // Ne pas échouer la requête si la sauvegarde échoue, mais logger l'erreur
    }

    res.json({
      success: true,
      albums: newAlbums,
      tracksCount: newTracks.length,
      artistsCount: newArtists.length,
      message: `${newAlbums.length} album(s) ajouté(s), ${newTracks.length} piste(s) analysée(s)`,
    })
  } catch (error: any) {
    console.error('Erreur lors du scan:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Détecte le numéro de disque depuis le chemin du fichier
 * Cherche les patterns: CD1, CD2, CD 1, Disc 1, Disc1, etc.
 */
function detectDiscNumber(filePath: string): number | undefined {
  const normalizedPath = filePath.replace(/\\/g, '/') // Normaliser les séparateurs
  const pathParts = normalizedPath.split('/')
  
  for (const part of pathParts) {
    const name = part.toLowerCase().trim()
    // Patterns: cd1, cd2, cd 1, disc 1, disc1, etc.
    const cdMatch = name.match(/^(cd|disc)\s*(\d+)$/i)
    if (cdMatch) {
      const discNum = parseInt(cdMatch[2], 10)
      if (discNum > 0) {
        return discNum
      }
    }
  }
  
  return undefined
}

/**
 * Extrait les métadonnées ET la couverture d'un fichier audio en une seule passe (optimisé)
 */
async function extractTrackMetadataAndCover(filePath: string): Promise<{ track: Track | null; coverArt: string | null }> {
  try {
    // Parser le fichier une seule fois pour tout extraire
    const metadata = await parseFile(filePath)
    const common = metadata.common

    // Artist (TPE1) = Artiste de la piste individuelle
    const trackArtist = common.artist || 'Artiste Inconnu'
    // Album Artist (TPE2 ou common.albumartist) = Artiste de l'album (pour les compilations)
    const albumArtist = common.albumartist || undefined
    const album = common.album || path.basename(path.dirname(filePath))
    const title = common.title || path.basename(filePath, path.extname(filePath))
    
    // Détecter le numéro de disque depuis le chemin
    const discNumber = detectDiscNumber(filePath)

    // Extraire les tags ID3 additionnels (TPE2, TPE3, TPE4) depuis metadata.native
    let band: string | undefined = undefined // TPE2 (peut être Album Artist ou Band)
    let conductor: string | undefined = undefined // TPE3
    let remixer: string | undefined = undefined // TPE4
    
    // Si TPE2 existe et qu'il n'y a pas d'albumartist dans common, utiliser TPE2 comme Album Artist
    let albumArtistFromTPE2: string | undefined = undefined

    try {
      if (metadata.native) {
        // Log pour déboguer
        console.log(`[METADATA] metadata.native existe, type: ${Array.isArray(metadata.native) ? 'array' : typeof metadata.native}`)
        
        if (Array.isArray(metadata.native)) {
          console.log(`[METADATA] Nombre de tags natifs: ${metadata.native.length}`)
          // Chercher dans les tags natifs
          for (const tag of metadata.native) {
            try {
              if (tag && tag.id && tag.value) {
                // Log tous les tags pour voir ce qui est disponible
                if (tag.id.startsWith('TPE')) {
                  console.log(`[METADATA] Tag trouvé: ${tag.id} = ${Array.isArray(tag.value) ? tag.value[0] : tag.value}`)
                }
                
                if (tag.id === 'TPE2') {
                  // TPE2 - Band/Orchestra/Accompaniment (ou Album Artist dans certains cas)
                  const tpe2Value = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                  band = tpe2Value
                  // Si pas d'albumartist dans common, TPE2 est probablement l'Album Artist
                  if (!albumArtist) {
                    albumArtistFromTPE2 = tpe2Value
                  }
                  console.log(`[METADATA] ✓ TPE2 extrait: ${band}`)
                } else if (tag.id === 'TPE3') {
                  // TPE3 - Conductor/Performer refinement
                  conductor = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                  console.log(`[METADATA] ✓ TPE3 extrait: ${conductor}`)
                } else if (tag.id === 'TPE4') {
                  // TPE4 - Interpreted, remixed, or otherwise modified by
                  remixer = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                  console.log(`[METADATA] ✓ TPE4 extrait: ${remixer}`)
                }
              }
            } catch (tagError) {
              // Ignorer les erreurs sur un tag individuel et continuer
              console.warn(`[METADATA] Erreur lors de l'extraction du tag ${tag?.id}:`, tagError)
            }
          }
        } else {
          // Si ce n'est pas un tableau, peut-être que c'est un objet avec des clés
          console.log(`[METADATA] metadata.native n'est pas un tableau, structure:`, Object.keys(metadata.native || {}))
        }
      } else {
        console.log(`[METADATA] metadata.native n'existe pas pour ${filePath}`)
      }
      
      // Log final des valeurs extraites
      if (band || conductor || remixer) {
        console.log(`[METADATA] Tags additionnels extraits - TPE2: ${band || 'N/A'}, TPE3: ${conductor || 'N/A'}, TPE4: ${remixer || 'N/A'}`)
      } else {
        console.log(`[METADATA] Aucun tag additionnel (TPE2/TPE3/TPE4) trouvé pour ${filePath}`)
      }
    } catch (nativeError) {
      // Si l'extraction des tags natifs échoue, on continue sans ces tags additionnels
      console.warn(`[METADATA] Erreur lors de l'extraction des tags natifs (non bloquant):`, nativeError)
    }

    // Déterminer l'artiste de l'album : Album Artist > TPE2 > Artist
    const finalAlbumArtist = albumArtist || albumArtistFromTPE2 || trackArtist
    
    // Générer des IDs
    const trackArtistId = generateId(trackArtist) // ID pour l'artiste de la piste
    const albumArtistId = generateId(finalAlbumArtist) // ID pour l'artiste de l'album
    
    // Pour les albums compilation (Various Artists, Compilation, etc.), utiliser uniquement le nom de l'album
    // Sinon, utiliser albumArtist-album pour éviter les conflits
    const isCompilation = finalAlbumArtist.toLowerCase().includes('various') || 
                          finalAlbumArtist.toLowerCase().includes('compilation') ||
                          finalAlbumArtist.toLowerCase().includes('various artists') ||
                          finalAlbumArtist.toLowerCase() === 'various'
    const albumId = isCompilation ? generateId(album) : generateId(`${finalAlbumArtist}-${album}`)
    const trackId = generateId(`${trackArtist}-${album}-${title}`)

    const track: Track = {
      id: trackId,
      title,
      artist: trackArtist, // Artiste de la piste individuelle (TPE1)
      artistId: trackArtistId, // ID de l'artiste de la piste
      album,
      albumId,
      albumArtist: finalAlbumArtist, // Artiste de l'album (Album Artist)
      albumArtistId: albumArtistId, // ID de l'artiste de l'album
      duration: Math.round(metadata.format.duration || 0),
      genre: common.genre?.[0],
      filePath: filePath,
      trackNumber: common.track?.no || undefined,
      year: common.year || undefined,
      discNumber, // Numéro du disque détecté depuis le chemin
      band,
      conductor,
      remixer,
    }

    // Extraire la couverture en même temps (si disponible)
    let coverArt: string | null = null
    const picture = metadata.common.picture?.[0]
    if (picture && picture.data) {
      try {
        // Optimiser l'image : redimensionner et compresser
        coverArt = await optimizeCoverImage(picture.data, picture.format)
      } catch (error) {
        console.error('Erreur lors de l\'optimisation de la couverture:', error)
        // Fallback : utiliser l'image originale si l'optimisation échoue
        const base64 = picture.data.toString('base64')
        const mimeType = picture.format || 'image/jpeg'
        coverArt = `data:${mimeType};base64,${base64}`
      }
    }

    return { track, coverArt }
  } catch (error: any) {
    console.error(`[METADATA] ✗ Erreur lors de l'extraction des métadonnées de ${filePath}:`, error)
    console.error(`[METADATA] Type d'erreur:`, error?.name)
    console.error(`[METADATA] Message:`, error?.message)
    if (error?.stack) {
      console.error(`[METADATA] Stack trace:`, error.stack.substring(0, 500))
    }
    return { track: null, coverArt: null }
  }
}

/**
 * Optimise une image de couverture : redimensionne et compresse
 */
async function optimizeCoverImage(imageBuffer: Buffer, originalFormat?: string): Promise<string> {
  try {
    // Si sharp n'est pas disponible, utiliser l'image originale
    if (!sharp) {
      const base64 = imageBuffer.toString('base64')
      const mimeType = originalFormat || 'image/jpeg'
      return `data:${mimeType};base64,${base64}`
    }

    // Taille maximale pour les couvertures (carré)
    const MAX_SIZE = 400
    const QUALITY = 100 // Qualité JPEG (0-100) - qualité maximale
    
    // Utiliser sharp pour redimensionner et compresser
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(MAX_SIZE, MAX_SIZE, {
        fit: 'inside',
        withoutEnlargement: true, // Ne pas agrandir si l'image est plus petite
      })
      .jpeg({ 
        quality: QUALITY,
        mozjpeg: true, // Utiliser mozjpeg pour une meilleure compression
      })
      .toBuffer()
    
    // Convertir en base64
    const base64 = optimizedBuffer.toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } catch (error) {
    console.error('Erreur lors de l\'optimisation de l\'image:', error)
    // Fallback : retourner l'image originale
    const base64 = imageBuffer.toString('base64')
    const mimeType = originalFormat || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  }
}

/**
 * Génère un ID simple à partir d'une chaîne
 */
function generateId(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Route pour scanner un dossier via son chemin (depuis le frontend)
 */
router.post('/scan-path', async (req: Request, res: Response) => {
  try {
    const { folderPath } = req.body

    if (!folderPath || typeof folderPath !== 'string') {
      return res.status(400).json({ error: 'Chemin du dossier requis' })
    }

    // Vérifier que le chemin existe
    try {
      const stats = await fs.stat(folderPath)
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Le chemin fourni n\'est pas un dossier' })
      }
    } catch (error) {
      return res.status(400).json({ error: 'Dossier introuvable ou inaccessible' })
    }

    // Scanner le dossier
    const result = await scanMusicFolder(folderPath)

    // Ajouter les nouveaux albums (éviter les doublons)
    result.albums.forEach(newAlbum => {
      const existingIndex = albums.findIndex(a => a.id === newAlbum.id)
      if (existingIndex >= 0) {
        albums[existingIndex] = newAlbum
      } else {
        albums.push(newAlbum)
      }
    })

    // Ajouter les nouvelles pistes
    result.tracks.forEach(newTrack => {
      const existingIndex = tracks.findIndex(t => t.id === newTrack.id)
      if (existingIndex >= 0) {
        tracks[existingIndex] = newTrack
      } else {
        tracks.push(newTrack)
      }
    })

    // Ajouter les nouveaux artistes
    result.artists.forEach(newArtist => {
      const existingIndex = artists.findIndex(a => a.id === newArtist.id)
      if (existingIndex >= 0) {
        artists[existingIndex] = newArtist
      } else {
        artists.push(newArtist)
      }
    })

    // Sauvegarder les données après modification
    genresCache = null // Invalider le cache des genres après ajout
    await saveAllData(albums, tracks, artists).catch((error) => {
      console.error('[PERSISTENCE] Erreur lors de la sauvegarde après scan-path:', error)
    })
    
    // Synchroniser avec Railway/Koyeb en arrière-plan (ne pas bloquer la réponse)
    syncToKoyeb(albums, tracks, artists).catch((error) => {
      console.error('[SYNC] Erreur lors de la synchronisation après scan-path:', error)
    })

    res.json({
      success: true,
      albums: result.albums,
      tracksCount: result.tracks.length,
      artistsCount: result.artists.length,
      message: `${result.albums.length} album(s) ajouté(s)`,
    })
  } catch (error: any) {
    console.error('Erreur lors du scan:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route pour obtenir tous les albums
 * Répond IMMÉDIATEMENT sans attendre le chargement
 */
router.get('/albums', (req: Request, res: Response) => {
  // Retourner IMMÉDIATEMENT les albums en mémoire (même si vides)
  // Le chargement se fera en arrière-plan si nécessaire
  res.json({ albums })
  
  // Charger les données en arrière-plan si ce n'est pas déjà fait
  if (!dataLoaded) {
    console.log('[ALBUMS] Chargement des données en arrière-plan...')
    loadAllData()
      .then(({ albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists }) => {
        albums = loadedAlbums
        tracks = loadedTracks
        artists = loadedArtists
        dataLoaded = true
        console.log(`[ALBUMS] Données chargées en arrière-plan: ${albums.length} album(s)`)
      })
      .catch((error) => {
        console.error('[ALBUMS] Erreur lors du chargement en arrière-plan:', error)
        dataLoaded = true // Marquer comme chargé pour éviter de réessayer indéfiniment
      })
  }
})

/**
 * Route pour supprimer des albums
 */
router.delete('/albums', async (req: Request, res: Response) => {
  try {
    const { albumIds } = req.body

    if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'IDs d\'albums requise' })
    }

    console.log(`[DELETE] Suppression de ${albumIds.length} album(s):`, albumIds)

    // Supprimer les albums
    const albumsToDelete = albums.filter(album => albumIds.includes(album.id))
    albums = albums.filter(album => !albumIds.includes(album.id))

    // Supprimer les pistes associées
    const tracksToDelete = tracks.filter(track => albumIds.includes(track.albumId))
    tracks = tracks.filter(track => !albumIds.includes(track.albumId))

    // Mettre à jour les artistes (réduire le nombre de pistes/albums)
    const affectedArtistIds = new Set<string>()
    albumsToDelete.forEach(album => affectedArtistIds.add(album.artistId))
    tracksToDelete.forEach(track => affectedArtistIds.add(track.artistId))

    affectedArtistIds.forEach(artistId => {
      const artist = artists.find(a => a.id === artistId)
      if (artist) {
        // Recalculer le nombre de pistes et d'albums
        const artistTracks = tracks.filter(t => t.artistId === artistId)
        const artistAlbums = albums.filter(a => a.artistId === artistId)
        artist.trackCount = artistTracks.length
        artist.albumCount = artistAlbums.length

        // Si l'artiste n'a plus d'albums ni de pistes, le supprimer
        if (artist.trackCount === 0 && artist.albumCount === 0) {
          artists = artists.filter(a => a.id !== artistId)
        }
      }
    })

    // Sauvegarder les données
    await saveAllData(albums, tracks, artists)
    console.log('[PERSISTENCE] Données sauvegardées après suppression d\'albums.')
    
    // Synchroniser avec Koyeb en arrière-plan (ne pas bloquer la réponse)
    syncToKoyeb(albums, tracks, artists).catch((error) => {
      console.error('[SYNC KOYEB] Erreur lors de la synchronisation après suppression d\'albums:', error)
    })

    res.json({
      success: true,
      message: `${albumsToDelete.length} album(s) supprimé(s) avec succès`,
      deletedAlbums: albumsToDelete.length,
      deletedTracks: tracksToDelete.length,
      albums: albums, // Retourner les albums restants pour mise à jour immédiate du cache
    })
  } catch (error: any) {
    console.error('Erreur lors de la suppression des albums:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route pour obtenir toutes les pistes
 */
router.get('/tracks', (req: Request, res: Response) => {
  res.json({ tracks })
})

/**
 * Route pour obtenir tous les artistes
 * Répond IMMÉDIATEMENT sans attendre le chargement
 */
router.get('/artists', (req: Request, res: Response) => {
  // Si les données ne sont pas chargées, retourner un tableau vide immédiatement
  if (!dataLoaded) {
    res.json({ artists: [] })
    
    // Charger les données en arrière-plan
    console.log('[ARTISTS] Chargement des données en arrière-plan...')
    loadAllData()
      .then(({ albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists }) => {
        albums = loadedAlbums
        tracks = loadedTracks
        artists = loadedArtists
        dataLoaded = true
        console.log(`[ARTISTS] Données chargées en arrière-plan: ${artists.length} artiste(s)`)
      })
      .catch((error) => {
        console.error('[ARTISTS] Erreur lors du chargement en arrière-plan:', error)
        dataLoaded = true
      })
    return
  }
  
  // Calculer le nombre d'albums par artiste de manière optimisée (O(n) au lieu de O(n*m))
  // Créer un Map pour éviter de filtrer pour chaque artiste
  const albumCountByArtist = new Map<string, number>()
  albums.forEach(album => {
    albumCountByArtist.set(album.artistId, (albumCountByArtist.get(album.artistId) || 0) + 1)
  })
  
  // Calculer le nombre d'albums par artiste et INCLURE les images en cache
  const artistsWithAlbumCount = artists.map(artist => {
    return {
      ...artist,
      albumCount: albumCountByArtist.get(artist.id) || 0,
      coverArt: artist.coverArt || undefined,
    }
  })
  
  // Envoyer la réponse immédiatement
  const artistsWithImages = artistsWithAlbumCount.filter(a => a.coverArt).length
  console.log(`[ARTISTS] Réponse: ${artistsWithAlbumCount.length} artiste(s), ${artistsWithImages} avec image(s)`)
  res.json({ artists: artistsWithAlbumCount })
  
  // Rechercher automatiquement les fanarts en arrière-plan pour les artistes sans image
  // (après l'envoi de la réponse pour ne pas bloquer)
  setTimeout(() => {
    const artistsToUpdate = artistsWithAlbumCount
      .filter(artist => !artist.coverArt) // Seulement ceux sans image
      .slice(0, 10) // Traiter jusqu'à 10 artistes à la fois pour ne pas surcharger
    
    if (artistsToUpdate.length === 0) {
      return
    }
    
    console.log(`[ARTISTS] Recherche automatique de fanarts pour ${artistsToUpdate.length} artiste(s) sans image...`)
    
    // Rechercher en parallèle depuis les APIs automatiques (iTunes, Last.fm, Fanart.tv, etc.)
    Promise.all(
      artistsToUpdate.map(async (artist) => {
        try {
          const artistImage = await searchArtistImage(artist.name)
          
          if (artistImage) {
            const encodedUrl = encodeURIComponent(artistImage)
            const proxyUrl = `/api/music/image-proxy?url=${encodedUrl}`
            
            const artistIndex = artists.findIndex(a => a.id === artist.id)
            if (artistIndex >= 0) {
              artists[artistIndex].coverArt = proxyUrl
              saveArtists(artists).catch(() => {})
              console.log(`[ARTISTS] ✓ Image automatique trouvée et sauvegardée pour ${artist.name}`)
            }
          }
        } catch (error) {
          // Ignorer silencieusement les erreurs
        }
      })
    ).catch(() => {})
  }, 0)
})

/**
 * Route pour obtenir les détails d'un artiste par ID
 */
router.get('/artists/:artistId', async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params
    const artist = artists.find(a => a.id === artistId)
    
    if (!artist) {
      return res.status(404).json({ error: 'Artiste non trouvé' })
    }
    
    // Trouver les albums de l'artiste
    const artistAlbums = albums.filter(album => album.artistId === artistId)
    const albumCount = artistAlbums.length
    
    // Récupérer le genre le plus fréquent parmi les albums de l'artiste
    const genreCounts = new Map<string, number>()
    artistAlbums.forEach(album => {
      if (album.genre) {
        genreCounts.set(album.genre, (genreCounts.get(album.genre) || 0) + 1)
      }
    })
    let mostCommonGenre: string | undefined = undefined
    let maxCount = 0
    genreCounts.forEach((count, genre) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonGenre = genre
      }
    })
    
    // Utiliser l'image en cache si elle existe, sinon rechercher automatiquement en arrière-plan
    let artistBackground: string | null = artist.coverArt || null
    
    // Si pas d'image, rechercher automatiquement en arrière-plan (iTunes, Last.fm, Fanart.tv, etc.)
    if (!artist.coverArt) {
      searchArtistImage(artist.name)
        .then((image) => {
          if (image) {
            const encodedUrl = encodeURIComponent(image)
            const proxyUrl = `/api/music/image-proxy?url=${encodedUrl}`
            
            const artistIndex = artists.findIndex(a => a.id === artistId)
            if (artistIndex >= 0) {
              artists[artistIndex].coverArt = proxyUrl
              saveArtists(artists).catch(() => {})
            }
          }
        })
        .catch(() => {})
    }
    
    // Rechercher la biographie de l'artiste sur Last.fm
    // Essayer de récupérer de manière synchrone avec un timeout court (2 secondes max)
    let biography: string | null = artist.biography || null
    if (!artist.biography) {
      try {
        // Essayer de récupérer la biographie avec un timeout de 2 secondes
        const biographyPromise = getArtistBiography(artist.name)
        const timeoutPromise = new Promise<string | null>((resolve) => 
          setTimeout(() => resolve(null), 2000)
        )
        
        const bio = await Promise.race([biographyPromise, timeoutPromise])
        if (bio) {
          biography = bio
          // Sauvegarder immédiatement
          const artistIndex = artists.findIndex(a => a.id === artistId)
          if (artistIndex >= 0) {
            artists[artistIndex].biography = bio
            saveArtists(artists).catch(() => {})
          }
        } else {
          // Si timeout, continuer la recherche en arrière-plan
          getArtistBiography(artist.name)
            .then((bio) => {
              if (bio) {
                const artistIndex = artists.findIndex(a => a.id === artistId)
                if (artistIndex >= 0) {
                  artists[artistIndex].biography = bio
                  saveArtists(artists).catch(() => {})
                }
              }
            })
            .catch(() => {})
        }
      } catch (error) {
        // En cas d'erreur, continuer sans biographie mais rechercher en arrière-plan
        getArtistBiography(artist.name)
          .then((bio) => {
            if (bio) {
              const artistIndex = artists.findIndex(a => a.id === artistId)
              if (artistIndex >= 0) {
                artists[artistIndex].biography = bio
                saveArtists(artists).catch(() => {})
              }
            }
          })
          .catch(() => {})
      }
    }
    
    const coverArt = artistBackground
    
    const responseData = {
      ...artist,
      albumCount,
      coverArt,
      genre: mostCommonGenre,
      biography,
      // logo supprimé comme demandé
    }
    
    console.log(`[ARTIST] Réponse finale pour ${artist.name}:`)
    console.log(`  - CoverArt: ${responseData.coverArt ? 'OUI (' + responseData.coverArt.substring(0, 50) + '...)' : 'NON'}`)
    console.log(`  - ArtistBackground trouvé: ${artistBackground ? 'OUI' : 'NON'}`)
    console.log(`  - Artist.coverArt original: ${artist.coverArt ? 'OUI' : 'NON'}`)
    console.log(`  - AlbumCount: ${responseData.albumCount}`)
    console.log(`  - TrackCount: ${responseData.trackCount}`)
    console.log(`  - Genre: ${responseData.genre || 'N/A'}`)
    console.log(`  - Biography: ${responseData.biography ? 'OUI' : 'NON'}`)
    
    res.json(responseData)
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'artiste:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Fonction utilitaire pour séparer les genres multiples (séparés par virgule)
 * et normaliser chaque genre
 */
function splitGenres(genreString: string): string[] {
  if (!genreString || genreString.trim() === '') {
    return []
  }
  // Séparer par virgule et nettoyer chaque genre
  return genreString
    .split(',')
    .map(genre => genre.trim())
    .filter(genre => genre.length > 0)
}

/**
 * Fonction utilitaire pour séparer les artistes multiples (séparés par virgule)
 * Exemple: "Bryan Adams, Keith Scott, Mickey Curry" -> ["Bryan Adams", "Keith Scott", "Mickey Curry"]
 */
function splitArtists(artistString: string): string[] {
  if (!artistString || artistString.trim() === '') {
    return []
  }
  return artistString
    .split(',')
    .map(artist => artist.trim())
    .filter(artist => artist.length > 0)
}

/**
 * Fonction utilitaire pour générer un ID de genre à partir d'un nom
 */
function generateGenreId(genreName: string): string {
  return genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Route pour obtenir tous les genres
 * Répond IMMÉDIATEMENT sans attendre le chargement
 */
router.get('/genres', (req: Request, res: Response) => {
  // Si les données ne sont pas chargées, retourner un tableau vide immédiatement
  if (!dataLoaded) {
    res.json({ genres: [] })
    
    // Charger les données en arrière-plan
    console.log('[GENRES] Chargement des données en arrière-plan...')
    loadAllData()
      .then(({ albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists }) => {
        albums = loadedAlbums
        tracks = loadedTracks
        artists = loadedArtists
        dataLoaded = true
        console.log(`[GENRES] Données chargées en arrière-plan: ${albums.length} album(s), ${tracks.length} piste(s)`)
      })
      .catch((error) => {
        console.error('[GENRES] Erreur lors du chargement en arrière-plan:', error)
        dataLoaded = true
      })
    return
  }
  
  // Extraire les genres uniques depuis les albums et pistes
  const genresMap = new Map<string, { id: string; name: string; trackCount: number; albumIds: Set<string> }>()
  
  // Parcourir les albums pour extraire les genres
  albums.forEach(album => {
    if (album.genre) {
      // Séparer les genres multiples (ex: "Rock, Pop" -> ["Rock", "Pop"])
      const genreList = splitGenres(album.genre)
      
      genreList.forEach(genreName => {
        const genreId = generateGenreId(genreName)
        if (!genresMap.has(genreId)) {
          genresMap.set(genreId, {
            id: genreId,
            name: genreName,
            trackCount: 0,
            albumIds: new Set(),
          })
        }
        const genre = genresMap.get(genreId)!
        genre.albumIds.add(album.id)
      })
    }
  })
  
  // Compter les pistes par genre
  tracks.forEach(track => {
    if (track.genre) {
      // Séparer les genres multiples
      const genreList = splitGenres(track.genre)
      
      genreList.forEach(genreName => {
        const genreId = generateGenreId(genreName)
        if (!genresMap.has(genreId)) {
          genresMap.set(genreId, {
            id: genreId,
            name: genreName,
            trackCount: 0,
            albumIds: new Set(),
          })
        }
        const genre = genresMap.get(genreId)!
        genre.trackCount++
        // Ajouter l'album de la piste si disponible
        if (track.albumId) {
          genre.albumIds.add(track.albumId)
        }
      })
    }
  })
  
  // Convertir en tableau et calculer albumCount
  const genresList = Array.from(genresMap.values()).map(genre => ({
    id: genre.id,
    name: genre.name,
    trackCount: genre.trackCount,
    albumCount: genre.albumIds.size,
  }))
  
  res.json({ genres: genresList })
})

/**
 * Route pour obtenir les pistes d'un album
 */
router.get('/albums/:albumId/tracks', (req: Request, res: Response) => {
  try {
    const { albumId } = req.params
    const albumTracks = tracks.filter(track => track.albumId === albumId)
    res.json({ tracks: albumTracks })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des pistes:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route pour servir un fichier audio par ID
 */
router.get('/track/:trackId', async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params
    
    console.log(`[TRACK] Recherche de la piste avec ID: ${trackId}`)
    console.log(`[TRACK] Nombre total de pistes: ${tracks.length}`)
    
    // Trouver la piste par ID
    const track = tracks.find(t => t.id === trackId)
    
    if (!track) {
      console.error(`[TRACK] Piste non trouvée avec ID: ${trackId}`)
      return res.status(404).json({ error: 'Piste non trouvée' })
    }

    console.log(`[TRACK] Piste trouvée: ${track.title}`)
    console.log(`[TRACK] filePath: ${track.filePath}`)
    console.log(`[TRACK] googleDriveId: ${track.googleDriveId}`)

    // Si c'est un fichier Google Drive, streamer directement depuis Google Drive
    if (track.googleDriveId) {
      console.log(`[TRACK] Fichier Google Drive détecté, streaming depuis Google Drive...`)
      
      const https = require('https')
      const http = require('http')
      
      // URL de téléchargement Google Drive
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${track.googleDriveId}`
      
      // Fonction pour suivre les redirections et streamer
      const streamFromGoogleDrive = (url: string, redirectCount = 0): void => {
        if (redirectCount > 5) {
          res.status(500).json({ error: 'Trop de redirections depuis Google Drive' })
          return
        }
        
        const protocol = url.startsWith('https') ? https : http
        
        protocol.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*'
          }
        }, (response: any) => {
          // Gérer les redirections
          if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 303) {
            const location = response.headers.location
            if (location) {
              console.log(`[TRACK] Redirection ${redirectCount + 1} vers: ${location.substring(0, 100)}`)
              return streamFromGoogleDrive(location, redirectCount + 1)
            }
          }
          
          // Vérifier le type de contenu
          const contentType = response.headers['content-type'] || ''
          if (contentType.includes('text/html')) {
            console.error(`[TRACK] Réponse HTML au lieu d'un fichier audio`)
            res.status(500).json({ error: 'Le fichier Google Drive n\'est pas accessible publiquement' })
            return
          }
          
          if (response.statusCode !== 200) {
            res.status(response.statusCode).json({ error: `Erreur HTTP: ${response.statusCode}` })
            return
          }
          
          // Déterminer le type MIME
          let mimeType = contentType
          if (!mimeType || mimeType.includes('text/html')) {
            // Essayer de deviner depuis le filePath ou utiliser audio/mpeg par défaut
            const ext = track.filePath ? path.extname(track.filePath).toLowerCase() : ''
            const mimeTypes: { [key: string]: string } = {
              '.mp3': 'audio/mpeg',
              '.m4a': 'audio/mp4',
              '.flac': 'audio/flac',
              '.wav': 'audio/wav',
              '.ogg': 'audio/ogg',
              '.aac': 'audio/aac',
              '.wma': 'audio/x-ms-wma',
            }
            mimeType = mimeTypes[ext] || 'audio/mpeg'
          }
          
          console.log(`[TRACK] Streaming depuis Google Drive, type MIME: ${mimeType}`)
          
          // Configurer les headers pour le streaming
          res.setHeader('Content-Type', mimeType)
          res.setHeader('Accept-Ranges', 'bytes')
          res.setHeader('Content-Length', response.headers['content-length'] || '')
          
          // Streamer le fichier directement au client
          response.pipe(res)
          
          response.on('error', (err: Error) => {
            console.error(`[TRACK] Erreur lors du streaming depuis Google Drive:`, err)
            if (!res.headersSent) {
              res.status(500).json({ error: 'Erreur lors du streaming depuis Google Drive' })
            }
          })
        }).on('error', (err: Error) => {
          console.error(`[TRACK] Erreur réseau lors du streaming depuis Google Drive:`, err)
          if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur réseau lors du streaming depuis Google Drive' })
          }
        })
      }
      
      streamFromGoogleDrive(downloadUrl)
      return
    }

    // Sinon, servir depuis le système de fichiers local
    // Vérifier que le fichier existe
    if (!existsSync(track.filePath)) {
      console.error(`[TRACK] Fichier non trouvé: ${track.filePath}`)
      return res.status(404).json({ error: `Fichier audio non trouvé: ${track.filePath}` })
    }

    console.log(`[TRACK] Fichier local trouvé, envoi en cours...`)

    // Déterminer le type MIME selon l'extension
    const ext = path.extname(track.filePath).toLowerCase()
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.wma': 'audio/x-ms-wma',
    }
    const contentType = mimeTypes[ext] || 'audio/mpeg'

    console.log(`[TRACK] Type MIME: ${contentType}`)

    // Envoyer le fichier avec les bons headers pour le streaming
    res.setHeader('Content-Type', contentType)
    res.setHeader('Accept-Ranges', 'bytes')
    res.sendFile(path.resolve(track.filePath))
  } catch (error: any) {
    console.error('[TRACK] Erreur lors de la lecture du fichier:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

/**
 * Route pour ajouter un album depuis Google Drive
 */
router.post('/add-from-google-drive', async (req: Request, res: Response) => {
  try {
    const { url, isCompilation: isCompilationParam } = req.body
    const forceCompilation = Boolean(isCompilationParam) // Forcer le traitement comme compilation si la checkbox est cochée

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL Google Drive requise' })
    }

    console.log(`[GOOGLE DRIVE] URL reçue: ${url}`)

    // Extraire l'ID du fichier depuis l'URL Google Drive
    // Support de multiples formats d'URL Google Drive
    let fileId: string | null = null
    
    // Pattern 1: /file/d/FILE_ID/ (le plus commun)
    // Exemples: 
    // - https://drive.google.com/file/d/FILE_ID/view
    // - https://drive.google.com/file/d/FILE_ID/edit
    // - https://drive.google.com/file/d/FILE_ID/preview
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match1) {
      fileId = match1[1]
    }
    
    // Pattern 2: ?id=FILE_ID ou &id=FILE_ID
    // Exemples:
    // - https://drive.google.com/open?id=FILE_ID
    // - https://drive.google.com/uc?id=FILE_ID
    // - https://docs.google.com/uc?export=download&id=FILE_ID
    if (!fileId) {
      const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
      if (match2) {
        fileId = match2[1]
      }
    }
    
    // Pattern 3: /drive/folders/FILE_ID ou /folders/FILE_ID (pour les dossiers)
    let isFolder = false
    if (!fileId) {
      const match3 = url.match(/\/(?:drive\/)?folders\/([a-zA-Z0-9_-]+)/)
      if (match3) {
        fileId = match3[1]
        isFolder = true
      }
    }
    
    // Pattern 4: Format court avec juste l'ID (si l'utilisateur colle juste l'ID)
    if (!fileId) {
      const simpleIdMatch = url.match(/^([a-zA-Z0-9_-]{20,})$/)
      if (simpleIdMatch) {
        fileId = simpleIdMatch[1]
      }
    }

    if (!fileId) {
      console.error('[GOOGLE DRIVE] URL non reconnue:', url)
      return res.status(400).json({ 
        error: 'URL Google Drive invalide. Formats acceptés:\n' +
               '- https://drive.google.com/file/d/FILE_ID/view\n' +
               '- https://drive.google.com/open?id=FILE_ID\n' +
               '- Ou simplement l\'ID du fichier'
      })
    }
    
    console.log(`[GOOGLE DRIVE] ID extrait: ${fileId} depuis l'URL: ${url}`)
    console.log(`[GOOGLE DRIVE] Type: ${isFolder ? 'Dossier' : 'Fichier'}`)

    // Si c'est un dossier, on doit lister et télécharger tous les fichiers
    if (isFolder) {
      try {
        console.log(`[GOOGLE DRIVE] Traitement du dossier ID: ${fileId}`)
        
        // Utiliser l'API Google Drive pour lister les fichiers du dossier
        // Pour les dossiers publics, on peut utiliser l'API avec supportsAllDrives=true
        const https = require('https')
        
        const listFiles = (folderIdToScan?: string): Promise<{files: any[], folders: any[]}> => {
          const targetFolderId = folderIdToScan || fileId
          return new Promise((resolve, reject) => {
            // Utiliser l'API Google Drive avec la clé API
            const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
            
            if (!GOOGLE_API_KEY) {
              console.log('[GOOGLE DRIVE] Pas de clé API configurée, tentative de scraping HTML')
              return scrapeFolderPage(targetFolderId).then(files => resolve({files, folders: []})).catch(reject)
            }
            
            const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${GOOGLE_API_KEY}`
            
            console.log(`[GOOGLE DRIVE] Tentative API avec clé API (URL masquée pour sécurité)`)
            
            https.get(apiUrl, (response: any) => {
              let data = ''
              
              response.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              
              response.on('end', () => {
                try {
                  const json = JSON.parse(data)
                  
                  if (json.error) {
                    console.error('[GOOGLE DRIVE] Erreur API:', json.error)
                    console.log('[GOOGLE DRIVE] Détails:', JSON.stringify(json.error, null, 2))
                    console.log('[GOOGLE DRIVE] Fallback vers scraping HTML')
                    return scrapeFolderPage(targetFolderId).then(files => resolve({files, folders: []})).catch(reject)
                  }
                  
                  if (!json.files || json.files.length === 0) {
                    console.log('[GOOGLE DRIVE] API réussie mais aucun fichier trouvé dans le dossier')
                    console.log('[GOOGLE DRIVE] Réponse complète:', JSON.stringify(json, null, 2))
                    resolve({files: [], folders: []})
                    return
                  }
                  
                  // Séparer les fichiers et les dossiers
                  const files: any[] = []
                  const folders: any[] = []
                  
                  json.files.forEach((f: any) => {
                    if (f.mimeType === 'application/vnd.google-apps.folder') {
                      folders.push(f)
                    } else {
                      files.push(f)
                    }
                  })
                  
                  console.log(`[GOOGLE DRIVE] API réussie: ${files.length} fichier(s) et ${folders.length} dossier(s) trouvé(s)`)
                  console.log('[GOOGLE DRIVE] Exemples de fichiers:', files.slice(0, 3).map((f: any) => `${f.name} (${f.mimeType})`))
                  if (folders.length > 0) {
                    console.log('[GOOGLE DRIVE] Dossiers trouvés:', folders.map((f: any) => `${f.name} (${f.id})`))
                  }
                  resolve({files, folders})
                } catch (error: any) {
                  console.error('[GOOGLE DRIVE] Erreur parsing API:', error)
                  console.log('[GOOGLE DRIVE] Réponse brute:', data.substring(0, 1000))
                  console.log('[GOOGLE DRIVE] Fallback vers scraping HTML')
                  return scrapeFolderPage(targetFolderId).then(files => resolve({files, folders: []})).catch(reject)
                }
              })
            }).on('error', (err: Error) => {
              console.error('[GOOGLE DRIVE] Erreur réseau API:', err)
              console.log('[GOOGLE DRIVE] Fallback vers scraping HTML')
              scrapeFolderPage(targetFolderId).then(files => resolve({files, folders: []})).catch(reject)
            })
          })
        }
        
        // Fonction pour scraper la page HTML du dossier (fallback)
        const scrapeFolderPage = (folderId: string): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            const folderPageUrl = `https://drive.google.com/drive/folders/${folderId}`
            console.log(`[GOOGLE DRIVE] Scraping de la page: ${folderPageUrl}`)
            
            https.get(folderPageUrl, { 
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
              } 
            }, (response: any) => {
              let html = ''
              
              response.on('data', (chunk: Buffer) => {
                html += chunk.toString()
              })
              
              response.on('end', () => {
                console.log(`[GOOGLE DRIVE] HTML reçu, taille: ${html.length} caractères`)
                
                const fileMatches: any[] = []
                
                // Pattern 1: Rechercher dans les données JSON embarquées
                // Google Drive stocke souvent les données dans des scripts JSON
                const jsonDataPattern = /\[null,null,"([^"]+\.(mp3|m4a|flac|wav|ogg|aac))"[^\]]*"([a-zA-Z0-9_-]{20,})"/g
                let match
                while ((match = jsonDataPattern.exec(html)) !== null) {
                  fileMatches.push({
                    id: match[3],
                    name: match[1],
                    mimeType: 'audio/mpeg'
                  })
                }
                
                // Pattern 2: Rechercher les IDs dans les attributs data
                if (fileMatches.length === 0) {
                  const dataIdPattern = /data-id="([a-zA-Z0-9_-]{20,})"[^>]*>[\s\S]*?([^<>]+\.(mp3|m4a|flac|wav|ogg|aac))/gi
                  while ((match = dataIdPattern.exec(html)) !== null) {
                    fileMatches.push({
                      id: match[1],
                      name: match[2].trim(),
                      mimeType: 'audio/mpeg'
                    })
                  }
                }
                
                // Pattern 3: Rechercher dans les structures de données JavaScript
                if (fileMatches.length === 0) {
                  const jsDataPattern = /"([a-zA-Z0-9_-]{20,})"[^"]*"[^"]*"([^"]+\.(mp3|m4a|flac|wav|ogg|aac))"/g
                  while ((match = jsDataPattern.exec(html)) !== null) {
                    if (match[1].length >= 20 && match[2]) {
                      fileMatches.push({
                        id: match[1],
                        name: match[2],
                        mimeType: 'audio/mpeg'
                      })
                    }
                  }
                }
                
                // Pattern 4: Rechercher les liens directs vers les fichiers
                if (fileMatches.length === 0) {
                  const linkPattern = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})[^"]*"[^>]*>([^<]+\.(mp3|m4a|flac|wav|ogg|aac))/gi
                  while ((match = linkPattern.exec(html)) !== null) {
                    fileMatches.push({
                      id: match[1],
                      name: match[2].trim(),
                      mimeType: 'audio/mpeg'
                    })
                  }
                }
                
                // Pattern 5: Rechercher dans les données JSON embarquées (format différent)
                if (fileMatches.length === 0) {
                  // Chercher les structures JSON dans les scripts
                  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi
                  let scriptMatch
                  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
                    const scriptContent = scriptMatch[1]
                    // Chercher les patterns avec des IDs de fichiers
                    const jsonPattern = /"([a-zA-Z0-9_-]{25,})"[^"]*"[^"]*"([^"]*\.(mp3|m4a|flac|wav|ogg|aac))"/g
                    let jsonMatch
                    while ((jsonMatch = jsonPattern.exec(scriptContent)) !== null) {
                      fileMatches.push({
                        id: jsonMatch[1],
                        name: jsonMatch[2],
                        mimeType: 'audio/mpeg'
                      })
                    }
                  }
                }
                
                // Pattern 6: Rechercher les IDs dans les attributs aria-label ou title avec noms de fichiers
                if (fileMatches.length === 0) {
                  const ariaPattern = /(?:aria-label|title)="([^"]*\.(mp3|m4a|flac|wav|ogg|aac))"[^>]*data-id="([a-zA-Z0-9_-]{20,})"/gi
                  while ((match = ariaPattern.exec(html)) !== null) {
                    fileMatches.push({
                      id: match[3],
                      name: match[1],
                      mimeType: 'audio/mpeg'
                    })
                  }
                }
                
                // Pattern 7: Rechercher dans les structures de données JavaScript complexes
                // Google Drive stocke souvent les données dans des tableaux JavaScript
                if (fileMatches.length === 0) {
                  // Chercher des patterns comme ["FILE_ID", [...], "filename.mp3"]
                  const complexPattern = /\["([a-zA-Z0-9_-]{25,})"[\s\S]{0,500}?"([^"]*\.(mp3|m4a|flac|wav|ogg|aac))"/g
                  while ((match = complexPattern.exec(html)) !== null) {
                    if (match[1].length >= 25 && match[2]) {
                      fileMatches.push({
                        id: match[1],
                        name: match[2],
                        mimeType: 'audio/mpeg'
                      })
                    }
                  }
                }
                
                // Pattern 8: Rechercher dans les scripts avec des données JSON sérialisées
                if (fileMatches.length === 0) {
                  // Chercher des patterns avec des IDs suivis de noms de fichiers
                  const serializedPattern = /"([a-zA-Z0-9_-]{25,})"[^"]{0,200}"([^"]{1,100}\.(mp3|m4a|flac|wav|ogg|aac))"/g
                  while ((match = serializedPattern.exec(html)) !== null) {
                    if (match[1] && match[2] && match[1].length >= 25) {
                      fileMatches.push({
                        id: match[1],
                        name: match[2],
                        mimeType: 'audio/mpeg'
                      })
                    }
                  }
                }
                
                // Pattern 9: Rechercher les IDs dans les attributs data avec des noms de fichiers proches
                if (fileMatches.length === 0) {
                  // Chercher data-id avec des noms de fichiers dans les 500 caractères suivants
                  const dataIdWithNamePattern = /data-id="([a-zA-Z0-9_-]{25,})"[\s\S]{0,500}?([^<>]{1,100}\.(mp3|m4a|flac|wav|ogg|aac))/gi
                  while ((match = dataIdWithNamePattern.exec(html)) !== null) {
                    fileMatches.push({
                      id: match[1],
                      name: match[2].trim(),
                      mimeType: 'audio/mpeg'
                    })
                  }
                }
                
                // Dédupliquer par ID
                const uniqueFiles = new Map<string, any>()
                fileMatches.forEach(file => {
                  if (file.id && file.id.length >= 20 && !uniqueFiles.has(file.id)) {
                    uniqueFiles.set(file.id, file)
                  }
                })
                
                const finalFiles = Array.from(uniqueFiles.values())
                
                console.log(`[GOOGLE DRIVE] ${finalFiles.length} fichier(s) unique(s) trouvé(s) dans le dossier`)
                
                if (finalFiles.length > 0) {
                  console.log(`[GOOGLE DRIVE] Exemples de fichiers trouvés:`, finalFiles.slice(0, 3).map(f => `${f.name} (${f.id})`))
                  resolve(finalFiles)
                } else {
                  console.error('[GOOGLE DRIVE] Aucun fichier trouvé dans le HTML')
                  
                  // Chercher des indices dans le HTML
                  const hasMp3 = html.includes('.mp3') || html.includes('mp3')
                  const hasDriveData = html.includes('_DRIVE_') || html.includes('drive.google.com/file/d/')
                  const hasFolderId = html.includes(fileId)
                  console.log(`[GOOGLE DRIVE] Indices: contient .mp3=${hasMp3}, contient données Drive=${hasDriveData}, contient folder ID=${hasFolderId}`)
                  
                  // Dernière tentative : chercher tous les IDs possibles et essayer de les télécharger
                  // Si on trouve des IDs de 25+ caractères dans le HTML, on peut essayer
                  const allIdsPattern = /([a-zA-Z0-9_-]{25,})/g
                  const potentialIds = new Set<string>()
                  let idMatch
                  while ((idMatch = allIdsPattern.exec(html)) !== null) {
                    const id = idMatch[1]
                    // Filtrer les IDs qui ressemblent à des IDs Google Drive (commencent souvent par des lettres)
                    if (id.length >= 25 && /^[a-zA-Z]/.test(id)) {
                      potentialIds.add(id)
                    }
                  }
                  
                  console.log(`[GOOGLE DRIVE] ${potentialIds.size} ID(s) potentiel(s) trouvé(s) dans le HTML`)
                  
                  if (potentialIds.size > 0 && potentialIds.size < 100) {
                    // Si on a un nombre raisonnable d'IDs, on peut essayer de les tester
                    // Mais pour l'instant, on va plutôt suggérer une solution alternative
                    console.log('[GOOGLE DRIVE] IDs potentiels trouvés mais non associés à des noms de fichiers')
                  }
                  
                  // Sauvegarder un extrait du HTML pour déboguer (chercher les zones avec "mp3" ou "ABBA")
                  const mp3Index = html.toLowerCase().indexOf('mp3')
                  if (mp3Index > 0) {
                    const contextStart = Math.max(0, mp3Index - 2000)
                    const contextEnd = Math.min(html.length, mp3Index + 2000)
                    console.log('[GOOGLE DRIVE] Contexte autour de "mp3":', html.substring(contextStart, contextEnd))
                  }
                  
                  reject(new Error('Impossible de lister les fichiers du dossier. Google Drive charge le contenu dynamiquement via JavaScript. Pour les dossiers, veuillez partager chaque fichier individuellement ou utilisez l\'API Google Drive.'))
                }
              })
            }).on('error', (err: Error) => {
              console.error('[GOOGLE DRIVE] Erreur réseau lors du scraping:', err)
              reject(err)
            })
          })
        }
        
        // Fonction pour détecter si un nom de dossier ressemble à un CD (CD1, CD2, Disc 1, etc.)
        const isCDFolder = (folderName: string): boolean => {
          const name = folderName.toLowerCase().trim()
          // Patterns: CD1, CD2, CD 1, Disc 1, Disc1, Disc 2, etc.
          return /^(cd|disc)\s*\d+$/i.test(name) || 
                 /^cd\d+$/i.test(name) || 
                 /^disc\d+$/i.test(name)
        }
        
        // Fonction récursive pour scanner un dossier et collecter tous les fichiers audio
        const scanFolderRecursively = async (folderId: string, folderName: string = '', depth: number = 0): Promise<{files: any[], cdFolders: any[]}> => {
          console.log(`[GOOGLE DRIVE] Scan du dossier "${folderName}" (ID: ${folderId}, profondeur: ${depth})`)
          const result = await listFiles(folderId)
          
          const allFiles: any[] = []
          const cdFolders: any[] = []
          
          // Ajouter les fichiers audio du dossier actuel
          const audioFiles = result.files.filter((f: any) => {
            const name = f.name?.toLowerCase() || ''
            return name.endsWith('.mp3') || name.endsWith('.m4a') || name.endsWith('.flac') || 
                   name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.aac') ||
                   f.mimeType?.startsWith('audio/')
          })
          allFiles.push(...audioFiles)
          
          // Détecter les sous-dossiers qui sont des CDs
          for (const folder of result.folders) {
            if (isCDFolder(folder.name)) {
              console.log(`[GOOGLE DRIVE] CD détecté: "${folder.name}" (ID: ${folder.id})`)
              cdFolders.push(folder)
              // Scanner récursivement le CD
              const cdResult = await scanFolderRecursively(folder.id, folder.name, depth + 1)
              allFiles.push(...cdResult.files)
              cdFolders.push(...cdResult.cdFolders)
            } else if (depth === 0) {
              // Au niveau racine, scanner aussi les autres sous-dossiers (peut-être des CDs avec d'autres noms)
              console.log(`[GOOGLE DRIVE] Sous-dossier trouvé: "${folder.name}" (ID: ${folder.id})`)
              const subResult = await scanFolderRecursively(folder.id, folder.name, depth + 1)
              allFiles.push(...subResult.files)
              cdFolders.push(...subResult.cdFolders)
            }
          }
          
          return {files: allFiles, cdFolders}
        }
        
        // Scanner le dossier racine récursivement
        const scanResult = await scanFolderRecursively(fileId, 'Racine', 0)
        const audioFiles = scanResult.files
        const cdFolders = scanResult.cdFolders
        
        if (audioFiles.length === 0) {
          return res.status(400).json({ 
            error: 'Aucun fichier audio trouvé dans le dossier.' 
          })
        }
        
        console.log(`[GOOGLE DRIVE] ${audioFiles.length} fichier(s) audio trouvé(s) au total`)
        if (cdFolders.length > 0) {
          console.log(`[GOOGLE DRIVE] ${cdFolders.length} CD(s) détecté(s):`, cdFolders.map(f => f.name))
        }
        console.log(`[GOOGLE DRIVE] Liste des fichiers audio:`, audioFiles.map((f: any) => `${f.name} (${f.id})`).slice(0, 5))
        
        // Vérifier si ce dossier Google Drive a déjà été ajouté
        // Chercher les albums qui proviennent de ce dossier
        const existingAlbumsFromFolder = albums.filter(a => a.googleDriveFolderId === fileId)
        const existingGoogleDriveIds = new Set<string>()
        
        console.log(`[GOOGLE DRIVE] Recherche d'albums existants pour le dossier ID: ${fileId}`)
        console.log(`[GOOGLE DRIVE] Albums existants trouvés: ${existingAlbumsFromFolder.length}`)
        
        // Récupérer tous les IDs Google Drive des pistes existantes de ces albums
        if (existingAlbumsFromFolder.length > 0) {
          console.log(`[GOOGLE DRIVE] Dossier déjà ajouté, ${existingAlbumsFromFolder.length} album(s) existant(s)`)
          existingAlbumsFromFolder.forEach(album => {
            const albumTracks = tracks.filter(t => t.albumId === album.id)
            console.log(`[GOOGLE DRIVE] Album "${album.title}": ${albumTracks.length} piste(s)`)
            albumTracks.forEach(track => {
              if (track.googleDriveId) {
                existingGoogleDriveIds.add(track.googleDriveId)
              }
            })
          })
          console.log(`[GOOGLE DRIVE] ${existingGoogleDriveIds.size} fichier(s) déjà présent(s) dans la bibliothèque`)
          console.log(`[GOOGLE DRIVE] IDs existants (premiers 5):`, Array.from(existingGoogleDriveIds).slice(0, 5))
        }
        
        // Filtrer uniquement les nouveaux fichiers (ceux qui ne sont pas déjà dans la bibliothèque)
        const newAudioFiles = audioFiles.filter((f: any) => !existingGoogleDriveIds.has(f.id))
        
        console.log(`[GOOGLE DRIVE] Fichiers après filtrage: ${newAudioFiles.length} nouveau(x) fichier(s) sur ${audioFiles.length} au total`)
        
        if (newAudioFiles.length === 0) {
          console.log(`[GOOGLE DRIVE] Tous les fichiers sont déjà dans la bibliothèque`)
          return res.json({
            success: true,
            message: `Tous les fichiers de ce dossier sont déjà présents dans la bibliothèque. Aucun nouveau fichier à ajouter.`,
            albums: existingAlbumsFromFolder,
            tracksCount: 0,
            artistsCount: 0,
          })
        }
        
        console.log(`[GOOGLE DRIVE] ${newAudioFiles.length} nouveau(x) fichier(s) à ajouter sur ${audioFiles.length} au total`)
        console.log(`[GOOGLE DRIVE] Nouveaux fichiers à traiter:`, newAudioFiles.map((f: any) => `${f.name} (${f.id})`).slice(0, 5))
        
        // Télécharger chaque fichier
        const albumsMap = new Map<string, Album>()
        const newTracks: Track[] = []
        const artistsMap = new Map<string, Artist>()
        
        // Compteurs pour le suivi du traitement
        let processedCount = 0
        let successCount = 0
        let errorCount = 0
        
        const downloadFile = (fileId: string, dest: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
            const file = require('fs').createWriteStream(dest)
            let redirectCount = 0
            const MAX_REDIRECTS = 5
            
            const download = (url: string): void => {
              if (redirectCount > MAX_REDIRECTS) {
                require('fs').unlink(dest, () => {})
                reject(new Error('Trop de redirections'))
                return
              }
              
              https.get(url, { 
                headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': '*/*'
                } 
              }, (response: any) => {
                // Gérer les redirections
                if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 303) {
                  redirectCount++
                  const location = response.headers.location
                  if (location) {
                    console.log(`[GOOGLE DRIVE] Redirection ${redirectCount} vers: ${location.substring(0, 100)}`)
                    return download(location)
                  }
                }
                
                // Vérifier le type de contenu
                const contentType = response.headers['content-type'] || ''
                if (contentType.includes('text/html')) {
                  console.error(`[GOOGLE DRIVE] Réponse HTML au lieu d'un fichier audio. Le fichier n'est peut-être pas partagé publiquement.`)
                  require('fs').unlink(dest, () => {})
                  reject(new Error('Le fichier téléchargé est une page HTML au lieu d\'un fichier audio. Le fichier doit être partagé publiquement.'))
                  return
                }
                
                if (response.statusCode !== 200) {
                  require('fs').unlink(dest, () => {})
                  reject(new Error(`Erreur HTTP: ${response.statusCode} - ${response.statusMessage}`))
                  return
                }
                
                response.pipe(file)
                
                file.on('finish', () => {
                  file.close()
                  resolve()
                })
              }).on('error', (err: Error) => {
                require('fs').unlink(dest, () => {})
                reject(err)
              })
            }
            
            download(downloadUrl)
          })
        }
        
        // Traiter les nouveaux fichiers : télécharger temporairement pour extraire les métadonnées, puis supprimer
        console.log(`[GOOGLE DRIVE] Début du traitement de ${newAudioFiles.length} nouveau(x) fichier(s) audio`)
        const BATCH_SIZE = 3
        for (let i = 0; i < newAudioFiles.length; i += BATCH_SIZE) {
          const batch = newAudioFiles.slice(i, i + BATCH_SIZE)
          console.log(`[GOOGLE DRIVE] Traitement du batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} fichier(s)`)
          await Promise.all(batch.map(async (file: any) => {
            let tempFilePath: string | null = null
            try {
              // Télécharger temporairement uniquement pour extraire les métadonnées
              tempFilePath = path.join(uploadDir, `gdrive-temp-${Date.now()}-${file.id}-${file.name || 'file'}`)
              console.log(`[GOOGLE DRIVE] Téléchargement temporaire de ${file.name} (${file.id}) pour extraction métadonnées...`)
              await downloadFile(file.id, tempFilePath)
              
              // Vérifier que le fichier existe et a une taille > 0
              const stats = await fs.stat(tempFilePath)
              console.log(`[GOOGLE DRIVE] Fichier téléchargé: ${file.name}, taille: ${stats.size} octets`)
              
              if (stats.size === 0) {
                console.error(`[GOOGLE DRIVE] Fichier vide: ${file.name}`)
                await fs.unlink(tempFilePath).catch(() => {})
                return
              }
              
              // Vérifier que c'est bien un fichier audio (par extension)
              const ext = path.extname(file.name || tempFilePath).toLowerCase()
              const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma']
              if (!audioExtensions.includes(ext)) {
                console.warn(`[GOOGLE DRIVE] Extension non audio: ${ext} pour ${file.name}`)
                // On continue quand même, peut-être que le fichier est audio malgré l'extension
              }
              
              console.log(`[GOOGLE DRIVE] Extraction des métadonnées de ${file.name}...`)
              let track: Track | null = null
              let coverArt: string | null = null
              
              try {
                const result = await extractTrackMetadataAndCover(tempFilePath)
                track = result.track
                coverArt = result.coverArt
              } catch (extractError: any) {
                console.error(`[GOOGLE DRIVE] ✗ Erreur lors de l'extraction des métadonnées pour ${file.name}:`, extractError)
                console.error(`[GOOGLE DRIVE] Stack trace:`, extractError.stack)
                errorCount++
                if (tempFilePath) {
                  await fs.unlink(tempFilePath).catch(() => {})
                }
                return
              }
              
              if (track) {
                console.log(`[GOOGLE DRIVE] ✓ Métadonnées extraites avec succès: ${track.title} - ${track.artist} (${track.album})`)
                
                // Stocker l'ID Google Drive au lieu du chemin local
                // Le fichier sera servi directement depuis Google Drive
                track.googleDriveId = file.id
                track.filePath = `gdrive://${file.id}` // Format spécial pour identifier les fichiers Google Drive
                
                // Supprimer le fichier temporaire après extraction des métadonnées
                await fs.unlink(tempFilePath).catch((err) => {
                  console.warn(`[GOOGLE DRIVE] Impossible de supprimer le fichier temporaire ${tempFilePath}:`, err)
                })
                tempFilePath = null // Marquer comme supprimé
                console.log(`[GOOGLE DRIVE] Fichier temporaire supprimé, lecture directe depuis Google Drive activée`)
                
                // Si forceCompilation est activé, recalculer l'albumId pour utiliser uniquement le nom de l'album
                if (forceCompilation) {
                  track.albumId = generateId(track.album)
                  // Mettre à jour l'artiste de l'album pour "Various Artists" si ce n'est pas déjà le cas
                  if (!track.albumArtist?.toLowerCase().includes('various') && 
                      !track.albumArtist?.toLowerCase().includes('compilation')) {
                    track.albumArtist = 'Various Artists'
                    track.albumArtistId = generateId('Various Artists')
                  }
                }
                
                newTracks.push(track)
                successCount++
                
                // Utiliser l'artiste de l'album (albumArtist) pour créer l'album, pas l'artiste de la piste
                const albumArtistForAlbum = track.albumArtist || track.artist
                const albumArtistIdForAlbum = track.albumArtistId || track.artistId
                // Déterminer si c'est une compilation : soit via le paramètre, soit via détection automatique
                const isCompilation = forceCompilation || 
                                      albumArtistForAlbum.toLowerCase().includes('various') || 
                                      albumArtistForAlbum.toLowerCase().includes('compilation') ||
                                      albumArtistForAlbum.toLowerCase().includes('various artists') ||
                                      albumArtistForAlbum.toLowerCase() === 'various'
                // Pour les compilations, utiliser uniquement albumId comme clé
                const albumKey = isCompilation ? track.albumId : `${albumArtistIdForAlbum}-${track.albumId}`
                if (!albumsMap.has(albumKey)) {
                  // Vérifier si l'album existe déjà dans la bibliothèque (chercher par albumId pour les compilations)
                  const existingAlbum = albums.find(a => a.id === track.albumId)
                  if (existingAlbum) {
                    // Utiliser l'album existant et ajouter le googleDriveFolderId s'il n'est pas déjà défini
                    albumsMap.set(albumKey, {
                      ...existingAlbum,
                      googleDriveFolderId: existingAlbum.googleDriveFolderId || fileId,
                      trackCount: (existingAlbum.trackCount || 0) + 1,
                      cdCount: cdFolders.length > 0 ? cdFolders.length : existingAlbum.cdCount,
                    })
                    console.log(`[GOOGLE DRIVE] Album existant mis à jour: ${track.album}`)
                  } else {
                    // Créer un nouvel album
                    albumsMap.set(albumKey, {
                      id: track.albumId,
                      title: track.album || 'Album Inconnu',
                      artist: isCompilation ? 'Various Artists' : albumArtistForAlbum,
                      artistId: isCompilation ? generateId('Various Artists') : albumArtistIdForAlbum,
                      year: track.year,
                      genre: track.genre,
                      trackCount: 1,
                      coverArt: coverArt ?? undefined,
                      googleDriveFolderId: fileId, // Associer le dossier Google Drive
                      cdCount: cdFolders.length > 0 ? cdFolders.length : undefined, // Nombre de CDs détectés
                    })
                    console.log(`[GOOGLE DRIVE] Nouvel album créé: ${track.album} (compilation: ${isCompilation}${cdFolders.length > 0 ? `, ${cdFolders.length} CD(s)` : ''})`)
                  }
                } else {
                  const album = albumsMap.get(albumKey)!
                  album.trackCount = (album.trackCount || 0) + 1
                  if (!album.coverArt && coverArt) {
                    album.coverArt = coverArt
                  }
                  album.googleDriveFolderId = album.googleDriveFolderId || fileId
                  // Mettre à jour le nombre de CDs si des CDs ont été détectés
                  if (cdFolders.length > 0 && (!album.cdCount || album.cdCount < cdFolders.length)) {
                    album.cdCount = cdFolders.length
                  }
                  console.log(`[GOOGLE DRIVE] Album mis à jour: ${track.album} (${album.trackCount} pistes${album.cdCount ? `, ${album.cdCount} CD(s)` : ''})`)
                }
                
                // Créer ou mettre à jour les artistes (séparer les artistes multiples)
                const artistNames = splitArtists(track.artist)
                artistNames.forEach((artistName: string) => {
                  const artistId = generateId(artistName)
                  if (!artistsMap.has(artistId)) {
                    artistsMap.set(artistId, {
                      id: artistId,
                      name: artistName,
                      trackCount: 1,
                    })
                  } else {
                    const artist = artistsMap.get(artistId)!
                    artist.trackCount = (artist.trackCount || 0) + 1
                  }
                })
              } else {
                console.error(`[GOOGLE DRIVE] ✗ Échec de l'extraction des métadonnées pour ${file.name}`)
                console.error(`[GOOGLE DRIVE] Le fichier téléchargé n'est peut-être pas un fichier audio valide ou est corrompu`)
                console.error(`[GOOGLE DRIVE] Taille du fichier: ${stats.size} octets, Extension: ${ext}`)
                errorCount++
                // Supprimer le fichier temporaire même en cas d'erreur
                if (tempFilePath) {
                  await fs.unlink(tempFilePath).catch(() => {})
                }
              }
            } catch (error: any) {
              console.error(`[GOOGLE DRIVE] ✗ Erreur lors du traitement de ${file.name}:`, error)
              console.error(`[GOOGLE DRIVE] Stack trace:`, error.stack)
              errorCount++
              // Nettoyer le fichier temporaire en cas d'erreur
              if (tempFilePath) {
                await fs.unlink(tempFilePath).catch(() => {})
              }
            } finally {
              processedCount++
            }
          }))
          
          console.log(`[GOOGLE DRIVE] Progression: ${Math.min(i + BATCH_SIZE, newAudioFiles.length)}/${newAudioFiles.length} fichiers traités (${successCount} succès, ${errorCount} erreurs)`)
        }
        
        console.log(`[GOOGLE DRIVE] Traitement terminé: ${processedCount} fichier(s) traité(s), ${successCount} succès, ${errorCount} erreur(s), ${newTracks.length} piste(s) extraite(s)`)
        
        if (newTracks.length === 0) {
          console.error(`[GOOGLE DRIVE] ⚠️ ATTENTION: Aucune piste extraite après traitement de ${newAudioFiles.length} fichier(s)`)
          console.error(`[GOOGLE DRIVE] Raisons possibles:`)
          console.error(`[GOOGLE DRIVE] - Les fichiers ne sont pas des fichiers audio valides`)
          console.error(`[GOOGLE DRIVE] - Les métadonnées ne peuvent pas être extraites`)
          console.error(`[GOOGLE DRIVE] - Erreurs lors du téléchargement`)
        } else {
          console.log(`[GOOGLE DRIVE] ✓ ${newTracks.length} piste(s) extraite(s) avec succès`)
          console.log(`[GOOGLE DRIVE] Exemples de pistes:`, newTracks.slice(0, 3).map(t => `${t.title} - ${t.artist}`))
        }
        
        const newAlbums = Array.from(albumsMap.values())
        const newArtists = Array.from(artistsMap.values())
        
        console.log(`[GOOGLE DRIVE] Albums créés/mis à jour: ${newAlbums.length}`)
        console.log(`[GOOGLE DRIVE] Artistes créés/mis à jour: ${newArtists.length}`)
        
        // Compter les albums qui sont vraiment nouveaux (n'existaient pas avant)
        let actuallyNewAlbumsCount = 0
        
        // Mettre à jour les albums existants ou ajouter les nouveaux
        newAlbums.forEach(newAlbum => {
          const existingIndex = albums.findIndex(a => a.id === newAlbum.id)
          if (existingIndex >= 0) {
            // Mettre à jour l'album existant avec le nouveau trackCount
            const existingAlbum = albums[existingIndex]
            albums[existingIndex] = {
              ...existingAlbum,
              ...newAlbum,
              trackCount: newAlbum.trackCount, // Utiliser le nouveau compteur qui inclut les nouvelles pistes
              googleDriveFolderId: newAlbum.googleDriveFolderId || existingAlbum.googleDriveFolderId,
            }
            console.log(`[GOOGLE DRIVE] Album existant mis à jour: ${newAlbum.title}`)
          } else {
            albums.push(newAlbum)
            actuallyNewAlbumsCount++
            console.log(`[GOOGLE DRIVE] Nouvel album ajouté: ${newAlbum.title}`)
          }
        })
        
        // Ajouter seulement les nouvelles pistes (éviter les doublons)
        console.log(`[GOOGLE DRIVE] Vérification des doublons pour ${newTracks.length} piste(s) extraite(s)`)
        const actuallyNewTracks: Track[] = []
        let duplicateByGoogleDriveId = 0
        let duplicateByTrackId = 0
        
        newTracks.forEach(newTrack => {
          // Vérifier si la piste existe déjà par googleDriveId
          const existingByGoogleDriveId = tracks.find(t => t.googleDriveId === newTrack.googleDriveId)
          if (!existingByGoogleDriveId) {
            // Vérifier aussi par ID de piste (même artiste-album-titre)
            const existingByTrackId = tracks.find(t => t.id === newTrack.id)
            if (!existingByTrackId) {
              tracks.push(newTrack)
              actuallyNewTracks.push(newTrack)
              console.log(`[GOOGLE DRIVE] ✓ Nouvelle piste ajoutée: ${newTrack.title} - ${newTrack.artist}`)
            } else {
              duplicateByTrackId++
              console.log(`[GOOGLE DRIVE] ⚠️ Piste déjà existante (par ID) ignorée: ${newTrack.title} - ${newTrack.artist}`)
            }
          } else {
            duplicateByGoogleDriveId++
            console.log(`[GOOGLE DRIVE] ⚠️ Piste déjà existante (par Google Drive ID) ignorée: ${newTrack.title} - ${newTrack.artist}`)
          }
        })
        
        console.log(`[GOOGLE DRIVE] Résultat du filtrage: ${actuallyNewTracks.length} nouvelle(s) piste(s), ${duplicateByGoogleDriveId} doublon(s) par Google Drive ID, ${duplicateByTrackId} doublon(s) par Track ID`)
        
        // Compter les artistes qui sont vraiment nouveaux
        let actuallyNewArtistsCount = 0
        
        // Ajouter les nouveaux artistes
        newArtists.forEach(newArtist => {
          const existingIndex = artists.findIndex(a => a.id === newArtist.id)
          if (existingIndex >= 0) {
            // Recalculer le nombre de pistes de l'artiste
            const artistTracks = tracks.filter(t => t.artistId === newArtist.id)
            artists[existingIndex].trackCount = artistTracks.length
          } else {
            artists.push(newArtist)
            actuallyNewArtistsCount++
          }
        })
        
        // Recalculer les compteurs d'albums après l'ajout
        newAlbums.forEach(newAlbum => {
          const albumTracks = tracks.filter(t => t.albumId === newAlbum.id)
          const albumIndex = albums.findIndex(a => a.id === newAlbum.id)
          if (albumIndex >= 0) {
            albums[albumIndex].trackCount = albumTracks.length
          }
        })
        
        // Sauvegarder les données après modification
        try {
          await saveAllData(albums, tracks, artists)
          console.log('[PERSISTENCE] Données sauvegardées avec succès après Google Drive (dossier)')
          
          // Synchroniser avec Koyeb en arrière-plan (ne pas bloquer la réponse)
          syncToKoyeb(albums, tracks, artists).catch((error) => {
            console.error('[SYNC KOYEB] Erreur lors de la synchronisation après ajout Google Drive (dossier):', error)
          })
        } catch (error) {
          console.error('[PERSISTENCE] Erreur lors de la sauvegarde après Google Drive (dossier):', error)
          // Ne pas échouer la requête si la sauvegarde échoue, mais logger l'erreur
        }
        
        const addedTracksCount = actuallyNewTracks.length
        
        console.log(`[GOOGLE DRIVE] Résumé: ${actuallyNewAlbumsCount} nouvel(aux) album(s), ${addedTracksCount} nouvelle(s) piste(s), ${actuallyNewArtistsCount} nouvel(aux) artiste(s)`)
        
        // Construire le message avec les vrais compteurs
        let message = ''
        if (existingAlbumsFromFolder.length > 0) {
          // Dossier déjà existant
          if (addedTracksCount > 0) {
            message = `${addedTracksCount} nouveau(x) morceau(x) ajouté(s) au dossier existant. ${audioFiles.length - newAudioFiles.length} morceau(x) déjà présent(s).`
          } else {
            message = `Tous les fichiers de ce dossier sont déjà présents dans la bibliothèque.`
          }
        } else {
          // Nouveau dossier
          if (actuallyNewAlbumsCount > 0 || addedTracksCount > 0) {
            const parts: string[] = []
            if (actuallyNewAlbumsCount > 0) {
              parts.push(`${actuallyNewAlbumsCount} album(s) ajouté(s)`)
            }
            if (addedTracksCount > 0) {
              parts.push(`${addedTracksCount} piste(s) ajoutée(s)`)
            }
            message = `${parts.join(', ')} depuis Google Drive`
          } else {
            message = `Aucun nouveau contenu ajouté. Les fichiers sont peut-être déjà présents dans la bibliothèque.`
          }
        }
        
        res.json({
          success: true,
          message: message,
          albums: newAlbums.length > 0 ? newAlbums : existingAlbumsFromFolder,
          tracksCount: addedTracksCount,
          artistsCount: actuallyNewArtistsCount,
        })
        
        return
      } catch (folderError: any) {
        console.error('[GOOGLE DRIVE] Erreur lors du traitement du dossier:', folderError)
        return res.status(500).json({ 
          error: `Erreur lors du traitement du dossier: ${folderError.message || 'Le dossier doit être partagé publiquement.'}` 
        })
      }
    }

    // URL de téléchargement direct (nécessite que le fichier soit partagé publiquement)
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

    console.log(`[GOOGLE DRIVE] Téléchargement du fichier ID: ${fileId}`)

    // Télécharger le fichier depuis Google Drive
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')
    
    const downloadFile = (url: string, dest: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const file = require('fs').createWriteStream(dest)
        const protocol = url.startsWith('https') ? https : http
        
        protocol.get(url, (response: any) => {
          // Gérer les redirections (Google Drive peut rediriger)
          if (response.statusCode === 302 || response.statusCode === 301) {
            return downloadFile(response.headers.location, dest).then(resolve).catch(reject)
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Erreur HTTP: ${response.statusCode}`))
            return
          }
          
          response.pipe(file)
          
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }).on('error', (err: Error) => {
          require('fs').unlink(dest, () => {}) // Supprimer le fichier en cas d'erreur
          reject(err)
        })
      })
    }

    // Télécharger temporairement uniquement pour extraire les métadonnées
    const tempFilePath = path.join(uploadDir, `gdrive-temp-${Date.now()}-${fileId}`)
    
    try {
      await downloadFile(downloadUrl, tempFilePath)
      
      // Extraire les métadonnées du fichier téléchargé
      const { track, coverArt } = await extractTrackMetadataAndCover(tempFilePath)
      
      if (!track) {
        // Supprimer le fichier temporaire
        await fs.unlink(tempFilePath).catch(() => {})
        return res.status(400).json({ error: 'Le fichier téléchargé n\'est pas un fichier audio valide' })
      }

      // Si forceCompilation est activé, recalculer l'albumId pour utiliser uniquement le nom de l'album
      if (forceCompilation) {
        track.albumId = generateId(track.album)
        // Mettre à jour l'artiste de l'album pour "Various Artists" si ce n'est pas déjà le cas
        if (!track.albumArtist?.toLowerCase().includes('various') && 
            !track.albumArtist?.toLowerCase().includes('compilation')) {
          track.albumArtist = 'Various Artists'
          track.albumArtistId = generateId('Various Artists')
        }
      }

      // Stocker l'ID Google Drive au lieu du chemin local
      track.googleDriveId = fileId
      track.filePath = `gdrive://${fileId}` // Format spécial pour identifier les fichiers Google Drive

      // Vérifier si la piste existe déjà par googleDriveId avant de supprimer le fichier temporaire
      const existingTrackByGoogleDriveId = tracks.find(t => t.googleDriveId === fileId)
      if (existingTrackByGoogleDriveId) {
        await fs.unlink(tempFilePath).catch(() => {})
        return res.json({
          success: true,
          message: `Ce morceau est déjà présent dans la bibliothèque : "${track.album || 'Inconnu'}" - "${track.title}"`,
          album: albums.find(a => a.id === track.albumId),
        })
      }

      // Vérifier si la piste existe déjà par ID (même artiste-album-titre)
      const existingTrackById = tracks.find(t => t.id === track.id && t.googleDriveId)
      if (existingTrackById) {
        await fs.unlink(tempFilePath).catch(() => {})
        return res.json({
          success: true,
          message: `Ce morceau est déjà présent dans la bibliothèque : "${track.album || 'Inconnu'}" - "${track.title}"`,
          album: albums.find(a => a.id === track.albumId),
        })
      }
      
      // Supprimer le fichier temporaire après extraction des métadonnées et vérifications
      await fs.unlink(tempFilePath).catch((err) => {
        console.warn(`[GOOGLE DRIVE] Impossible de supprimer le fichier temporaire:`, err)
      })
      console.log(`[GOOGLE DRIVE] Fichier temporaire supprimé, lecture directe depuis Google Drive activée`)

      // Créer ou mettre à jour l'album
      // Utiliser l'artiste de l'album (albumArtist) pour créer l'album, pas l'artiste de la piste
      const albumArtistForAlbum = track.albumArtist || track.artist
      const albumArtistIdForAlbum = track.albumArtistId || track.artistId
      // Déterminer si c'est une compilation : soit via le paramètre, soit via détection automatique
      const isCompilation = forceCompilation || 
                            albumArtistForAlbum.toLowerCase().includes('various') || 
                            albumArtistForAlbum.toLowerCase().includes('compilation') ||
                            albumArtistForAlbum.toLowerCase().includes('various artists') ||
                            albumArtistForAlbum.toLowerCase() === 'various'
      // Pour les compilations, utiliser uniquement albumId comme clé
      const albumKey = isCompilation ? track.albumId : `${albumArtistIdForAlbum}-${track.albumId}`
      const existingAlbumIndex = albums.findIndex(a => a.id === track.albumId)
      
      if (existingAlbumIndex >= 0) {
        albums[existingAlbumIndex].trackCount = (albums[existingAlbumIndex].trackCount || 0) + 1
        if (!albums[existingAlbumIndex].coverArt && coverArt) {
          albums[existingAlbumIndex].coverArt = coverArt
        }
      } else {
        albums.push({
          id: track.albumId,
          title: track.album || 'Album Inconnu',
          artist: isCompilation ? 'Various Artists' : albumArtistForAlbum,
          artistId: isCompilation ? generateId('Various Artists') : albumArtistIdForAlbum,
          year: track.year,
          genre: track.genre,
          trackCount: 1,
          coverArt: coverArt || undefined,
        })
      }

      // Ajouter la piste
      tracks.push(track)

      // Créer ou mettre à jour les artistes (séparer les artistes multiples)
      const artistNames = splitArtists(track.artist)
      artistNames.forEach((artistName: string) => {
        const artistId = generateId(artistName)
        const existingArtistIndex = artists.findIndex(a => a.id === artistId)
        if (existingArtistIndex >= 0) {
          artists[existingArtistIndex].trackCount = (artists[existingArtistIndex].trackCount || 0) + 1
        } else {
          artists.push({
            id: artistId,
            name: artistName,
            trackCount: 1,
          })
        }
      })

      // Sauvegarder les données après modification
      try {
        await saveAllData(albums, tracks, artists)
        console.log('[PERSISTENCE] Données sauvegardées avec succès après Google Drive (fichier)')
        
        // Synchroniser avec Koyeb en arrière-plan (ne pas bloquer la réponse)
        syncToKoyeb(albums, tracks, artists).catch((error) => {
          console.error('[SYNC KOYEB] Erreur lors de la synchronisation après ajout Google Drive:', error)
        })
      } catch (error) {
        console.error('[PERSISTENCE] Erreur lors de la sauvegarde après Google Drive (fichier):', error)
        // Ne pas échouer la requête si la sauvegarde échoue, mais logger l'erreur
      }

      res.json({
        success: true,
        message: `Album "${track.album || 'Inconnu'}" ajouté avec succès depuis Google Drive (lecture directe, aucun téléchargement)`,
        album: albums.find(a => a.id === track.albumId),
      })
    } catch (downloadError: any) {
      console.error('[GOOGLE DRIVE] Erreur lors du téléchargement:', downloadError)
      
      // Nettoyer le fichier temporaire en cas d'erreur
      try {
        await fs.unlink(tempFilePath)
      } catch {}
      
      return res.status(500).json({ 
        error: 'Impossible de télécharger le fichier depuis Google Drive. Assurez-vous que le fichier est partagé publiquement ou que le lien est accessible.' 
      })
    }
  } catch (error: any) {
    console.error('[GOOGLE DRIVE] Erreur:', error)
    res.status(500).json({ error: error.message || 'Erreur lors de l\'ajout depuis Google Drive' })
  }
})

/**
 * Route pour servir les images de couverture d'album depuis base64
 * Convertit les images base64 en images binaires pour éviter les problèmes de taille
 */
router.get('/album-cover/:albumId', (req: Request, res: Response) => {
  try {
    const { albumId } = req.params
    const album = albums.find(a => a.id === albumId)
    
    if (!album || !album.coverArt) {
      return res.status(404).json({ error: 'Image non trouvée' })
    }
    
    // Si c'est déjà une URL (pas base64), rediriger
    if (album.coverArt.startsWith('http://') || album.coverArt.startsWith('https://')) {
      return res.redirect(album.coverArt)
    }
    
    // Si c'est une data URL (base64), la convertir en image binaire
    if (album.coverArt.startsWith('data:')) {
      const matches = album.coverArt.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        const mimeType = matches[1] || 'image/jpeg'
        const base64Data = matches[2]
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        res.setHeader('Content-Type', mimeType)
        res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache 1 an
        res.setHeader('Access-Control-Allow-Origin', '*')
        return res.send(imageBuffer)
      }
    }
    
    // Si c'est un chemin de fichier, servir le fichier
    if (album.coverArt.startsWith('/') || album.coverArt.includes('\\')) {
      const fs = require('fs')
      const path = require('path')
      if (fs.existsSync(album.coverArt)) {
        const mimeType = album.coverArt.endsWith('.png') ? 'image/png' : 
                        album.coverArt.endsWith('.gif') ? 'image/gif' : 'image/jpeg'
        res.setHeader('Content-Type', mimeType)
        res.setHeader('Cache-Control', 'public, max-age=31536000')
        res.setHeader('Access-Control-Allow-Origin', '*')
        return res.sendFile(path.resolve(album.coverArt))
      }
    }
    
    return res.status(404).json({ error: 'Format d\'image non supporté' })
  } catch (error: any) {
    console.error('[ALBUM COVER] Erreur:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route proxy pour servir les images externes (évite les problèmes CORS)
 */
router.get('/image-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL requise' })
    }

    const decodedUrl = decodeURIComponent(url)
    console.log(`[IMAGE PROXY] Requête reçue`)
    console.log(`[IMAGE PROXY]   URL encodée (query): ${url.substring(0, 150)}...`)
    console.log(`[IMAGE PROXY]   URL décodée: ${decodedUrl}`)
    console.log(`[IMAGE PROXY]   Status code attendu: 200`)

    // Traitement spécial pour les URLs Google Drive
    let finalUrl = decodedUrl
    if (decodedUrl.includes('drive.google.com')) {
      console.log(`[IMAGE PROXY] URL Google Drive détectée`)
      // Si c'est export=view, essayer export=download à la place (plus fiable)
      if (decodedUrl.includes('export=view')) {
        finalUrl = decodedUrl.replace('export=view', 'export=download')
        console.log(`[IMAGE PROXY] Conversion export=view -> export=download`)
      }
    }

    const https = require('https')
    const http = require('http')
    const protocol = finalUrl.startsWith('https') ? https : http

    protocol.get(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000 // Augmenter le timeout pour Google Drive
    }, (response: any) => {
      // Gérer les redirections (Google Drive fait souvent des redirections)
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
        const location = response.headers.location
        if (location) {
          console.log(`[IMAGE PROXY] Redirection ${response.statusCode} vers: ${location.substring(0, 100)}`)
          // Suivre la redirection
          const redirectUrl = location.startsWith('http') ? location : new URL(location, finalUrl).href
          return protocol.get(redirectUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Referer': 'https://www.google.com/'
            },
            timeout: 10000
          }, (redirectResponse: any) => {
            if (redirectResponse.statusCode !== 200) {
              console.warn(`[IMAGE PROXY] Erreur HTTP ${redirectResponse.statusCode} après redirection pour: ${decodedUrl.substring(0, 100)}`)
              // Retourner 204 (No Content) au lieu d'une erreur pour que le frontend puisse gérer gracieusement
              if (!res.headersSent) {
                return res.status(204).end()
              }
              return
            }
            
            // Vérifier que les headers n'ont pas déjà été envoyés
            if (res.headersSent) {
              console.warn(`[IMAGE PROXY] Headers déjà envoyés, impossible de définir les headers pour la redirection`)
              return
            }
            
            const contentType = redirectResponse.headers['content-type'] || 'image/jpeg'
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.setHeader('Access-Control-Allow-Origin', '*')
            redirectResponse.pipe(res)
          }).on('error', (err: Error) => {
            console.error(`[IMAGE PROXY] Erreur lors de la redirection:`, err)
            if (!res.headersSent) {
              res.status(204).end()
            }
          })
        }
      }
      
      if (response.statusCode !== 200) {
        console.warn(`[IMAGE PROXY] Erreur HTTP ${response.statusCode} pour: ${decodedUrl.substring(0, 100)}`)
        // Retourner 204 (No Content) au lieu d'une erreur pour que le frontend puisse gérer gracieusement
        // Le frontend pourra alors utiliser une image par défaut ou masquer l'image
        if (!res.headersSent) {
          return res.status(204).end()
        }
        return
      }

      // Vérifier que les headers n'ont pas déjà été envoyés
      if (res.headersSent) {
        console.warn(`[IMAGE PROXY] Headers déjà envoyés, impossible de définir les headers`)
        return
      }

      const contentType = response.headers['content-type'] || 'image/jpeg'
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400') // Cache 24h
      res.setHeader('Access-Control-Allow-Origin', '*')

      response.pipe(res)

      response.on('error', (err: Error) => {
        console.error(`[IMAGE PROXY] Erreur lors du streaming:`, err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erreur lors du chargement de l\'image' })
        }
      })
    }).on('error', (err: Error) => {
      console.error(`[IMAGE PROXY] Erreur réseau:`, err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur réseau lors du chargement de l\'image' })
      }
    }).on('timeout', () => {
      console.error(`[IMAGE PROXY] Timeout pour: ${decodedUrl.substring(0, 100)}`)
      if (!res.headersSent) {
        res.status(504).json({ error: 'Timeout lors du chargement de l\'image' })
      }
    })
  } catch (error: any) {
    console.error('[IMAGE PROXY] Erreur:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message })
    }
  }
})

/**
 * Route pour importer des données (albums, tracks, artists) depuis un export
 * Utile pour synchroniser les données locales vers le backend déployé
 */
router.post('/import-data', async (req: Request, res: Response) => {
  try {
    const { albums: importedAlbums, tracks: importedTracks, artists: importedArtists } = req.body

    if (!importedAlbums || !importedTracks || !importedArtists) {
      return res.status(400).json({ 
        error: 'Données incomplètes. Format attendu: { albums: [], tracks: [], artists: [] }' 
      })
    }

    // Valider que ce sont bien des tableaux
    if (!Array.isArray(importedAlbums) || !Array.isArray(importedTracks) || !Array.isArray(importedArtists)) {
      return res.status(400).json({ 
        error: 'Les données doivent être des tableaux' 
      })
    }

    console.log(`[IMPORT] Import de ${importedAlbums.length} album(s), ${importedTracks.length} piste(s), ${importedArtists.length} artiste(s)`)

    // ⚠️ PROTECTION : Ne JAMAIS supprimer les données existantes si les données importées sont vides
    // Si les données importées sont vides, garder les données existantes
    const hasImportedData = importedAlbums.length > 0 || importedTracks.length > 0 || importedArtists.length > 0
    const hasExistingData = albums.length > 0 || tracks.length > 0 || artists.length > 0
    
    if (!hasImportedData && hasExistingData) {
      console.warn('[IMPORT] ⚠️ ATTENTION: Tentative d\'import de données vides alors que des données existent déjà!')
      console.warn('[IMPORT] ⚠️ Les données existantes sont PRÉSERVÉES pour éviter la perte de données.')
      console.warn(`[IMPORT] ⚠️ Données existantes: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)
      return res.status(400).json({ 
        error: 'Impossible d\'importer des données vides. Les données existantes sont préservées pour éviter la perte de données.',
        existingCounts: {
          albums: albums.length,
          tracks: tracks.length,
          artists: artists.length
        }
      })
    }

    // Si les données importées sont valides, remplacer les données existantes
    // REMPLACER complètement les données pour synchroniser correctement les suppressions
    // Les données importées remplacent complètement les données existantes
    // Cela permet de synchroniser les suppressions d'albums depuis le local vers Railway
    albums = importedAlbums
    tracks = importedTracks
    artists = importedArtists
    dataLoaded = true // Marquer les données comme chargées
    genresCache = null // Invalider le cache des genres
    
    console.log(`[IMPORT] ✅ Données remplacées: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)

    // Sauvegarder les données
    await saveAllData(albums, tracks, artists)

    console.log(`[IMPORT] Import réussi: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)

    res.json({
      success: true,
      message: 'Données importées avec succès',
      counts: {
        albums: albums.length,
        tracks: tracks.length,
        artists: artists.length
      }
    })
  } catch (error: any) {
    console.error('[IMPORT] Erreur lors de l\'import:', error)
    res.status(500).json({ 
      error: 'Erreur lors de l\'import des données',
      details: error.message 
    })
  }
})

/**
 * Route pour exporter toutes les données (albums, tracks, artists)
 * Utile pour sauvegarder ou synchroniser les données
 */
router.get('/export-data', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      albums,
      tracks,
      artists,
      counts: {
        albums: albums.length,
        tracks: tracks.length,
        artists: artists.length
      }
    })
  } catch (error: any) {
    console.error('[EXPORT] Erreur lors de l\'export:', error)
    res.status(500).json({ 
      error: 'Erreur lors de l\'export des données',
      details: error.message 
    })
  }
})

/**
 * Route pour analyser les tags d'un fichier MP3
 * Utile pour déboguer et voir tous les tags disponibles
 */
router.post('/analyze-tags', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' })
    }

    const filePath = req.file.path
    console.log(`[ANALYZE] Analyse des tags du fichier: ${req.file.originalname}`)

    try {
      const metadata = await parseFile(filePath)
      
      // Extraire les tags communs (normalisés)
      const commonTags = {
        title: metadata.common.title,
        artist: metadata.common.artist,
        album: metadata.common.album,
        albumArtist: metadata.common.albumartist,
        genre: metadata.common.genre,
        year: metadata.common.year,
        track: metadata.common.track,
        disk: metadata.common.disk,
        comment: metadata.common.comment,
        composer: metadata.common.composer,
        conductor: metadata.common.conductor,
        remixer: metadata.common.remixer,
        label: metadata.common.label,
        bpm: metadata.common.bpm,
        rating: metadata.common.rating,
        picture: metadata.common.picture ? {
          count: metadata.common.picture.length,
          formats: metadata.common.picture.map(p => p.format)
        } : null
      }

      // Extraire tous les tags natifs (ID3v2, etc.)
      const nativeTags: any[] = []
      if (metadata.native && Array.isArray(metadata.native)) {
        for (const tag of metadata.native) {
          nativeTags.push({
            id: tag.id,
            value: tag.value,
            type: Array.isArray(tag.value) ? 'array' : typeof tag.value,
            length: Array.isArray(tag.value) ? tag.value.length : undefined
          })
        }
      }

      // Informations sur le format
      const formatInfo = {
        container: metadata.format.container,
        codec: metadata.format.codec,
        codecProfile: metadata.format.codecProfile,
        duration: metadata.format.duration,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        bitsPerSample: metadata.format.bitsPerSample,
        numberOfChannels: metadata.format.numberOfChannels,
        lossless: metadata.format.lossless
      }

      // Tags ID3 spécifiques recherchés
      const specificTags: Record<string, any> = {
        TPE1: null, // Lead artist/Performer
        TPE2: null, // Band/Orchestra/Accompaniment
        TPE3: null, // Conductor/Performer refinement
        TPE4: null, // Interpreted, remixed, or otherwise modified by
        TALB: null, // Album
        TIT2: null, // Title
        TYER: null, // Year
        TCON: null, // Genre
        TRCK: null, // Track number
        TPOS: null, // Disc number
        TCOM: null, // Composer
      }

      // Chercher les tags spécifiques dans les tags natifs
      if (metadata.native && Array.isArray(metadata.native)) {
        for (const tag of metadata.native) {
          if (tag.id in specificTags && tag.value) {
            specificTags[tag.id as keyof typeof specificTags] = Array.isArray(tag.value) ? tag.value[0] : tag.value
          }
        }
      }

      const result = {
        success: true,
        filename: req.file.originalname,
        commonTags,
        nativeTags: {
          count: nativeTags.length,
          tags: nativeTags
        },
        specificTags,
        formatInfo,
        summary: {
          title: metadata.common.title || 'Non défini',
          artist: metadata.common.artist || 'Non défini',
          album: metadata.common.album || 'Non défini',
          albumArtist: metadata.common.albumartist || 'Non défini',
          hasTPE1: specificTags.TPE1 !== null,
          hasTPE2: specificTags.TPE2 !== null,
          hasTPE3: specificTags.TPE3 !== null,
          hasTPE4: specificTags.TPE4 !== null,
          totalNativeTags: nativeTags.length
        }
      }

      // Nettoyer le fichier temporaire
      await fs.unlink(filePath).catch(() => {})

      res.json(result)
    } catch (error: any) {
      // Nettoyer le fichier temporaire en cas d'erreur
      await fs.unlink(filePath).catch(() => {})
      
      console.error('[ANALYZE] Erreur lors de l\'analyse:', error)
      res.status(500).json({
        error: 'Erreur lors de l\'analyse du fichier',
        details: error.message
      })
    }
  } catch (error: any) {
    console.error('[ANALYZE] Erreur:', error)
    res.status(500).json({
      error: 'Erreur lors du traitement de la requête',
      details: error.message
    })
  }
})

/**
 * Route pour ré-analyser tous les fichiers existants et mettre à jour les tags TPE2, TPE3, TPE4
 * Utile pour mettre à jour les pistes qui ont été ajoutées avant l'extraction de ces tags
 */
router.post('/reanalyze-tags', async (req: Request, res: Response) => {
  try {
    console.log('[REANALYZE] Début de la ré-analyse des tags pour toutes les pistes')
    
    let updatedCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    // Traiter les pistes par batches pour éviter la surcharge
    const BATCH_SIZE = 5
    
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE)
      
      await Promise.all(batch.map(async (track) => {
        // Déclarer les variables avant le try pour qu'elles soient accessibles dans le catch
        let filePathToAnalyze: string | null = null
        let isTempFile = false
        
        try {
          // Vérifier si le fichier existe
          if (!track.filePath) {
            console.warn(`[REANALYZE] Piste ${track.id} n'a pas de filePath, ignorée`)
            skippedCount++
            return
          }
          
          // Gérer les fichiers Google Drive
          if (track.filePath.startsWith('gdrive://')) {
            if (!track.googleDriveId) {
              console.warn(`[REANALYZE] Piste ${track.id} est sur Google Drive mais n'a pas de googleDriveId, ignorée (${track.title})`)
              skippedCount++
              return
            }
            
            console.log(`[REANALYZE] Téléchargement temporaire depuis Google Drive: ${track.title} (ID: ${track.googleDriveId})`)
            
            // Télécharger temporairement le fichier depuis Google Drive
            const https = require('https')
            const http = require('http')
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${track.googleDriveId}`
            filePathToAnalyze = path.join(uploadDir, `reanalyze-temp-${Date.now()}-${track.googleDriveId}`)
            isTempFile = true
            
            try {
              const downloadFile = (url: string, dest: string): Promise<void> => {
                return new Promise((resolve, reject) => {
                  const file = require('fs').createWriteStream(dest)
                  let redirectCount = 0
                  const MAX_REDIRECTS = 5
                  
                  const download = (downloadUrl: string): void => {
                    if (redirectCount > MAX_REDIRECTS) {
                      require('fs').unlink(dest, () => {})
                      reject(new Error('Trop de redirections'))
                      return
                    }
                    
                    const protocol = downloadUrl.startsWith('https') ? https : http
                    protocol.get(downloadUrl, { 
                      headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*'
                      } 
                    }, (response: any) => {
                      // Gérer les redirections
                      if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 303) {
                        redirectCount++
                        const location = response.headers.location
                        if (location) {
                          return download(location)
                        }
                      }
                      
                      // Vérifier le type de contenu (Google Drive peut retourner du HTML pour les fichiers non partagés)
                      const contentType = response.headers['content-type'] || ''
                      if (contentType.includes('text/html')) {
                        require('fs').unlink(dest, () => {})
                        reject(new Error('Le fichier Google Drive retourne du HTML au lieu d\'un fichier audio. Le fichier doit être partagé publiquement.'))
                        return
                      }
                      
                      if (response.statusCode !== 200) {
                        require('fs').unlink(dest, () => {})
                        reject(new Error(`Erreur HTTP: ${response.statusCode} - ${response.statusMessage}`))
                        return
                      }
                      
                      response.pipe(file)
                      
                      file.on('finish', () => {
                        file.close()
                        resolve()
                      })
                    }).on('error', (err: Error) => {
                      require('fs').unlink(dest, () => {})
                      reject(err)
                    })
                  }
                  
                  download(url)
                })
              }
              
              await downloadFile(downloadUrl, filePathToAnalyze)
              console.log(`[REANALYZE] Fichier Google Drive téléchargé: ${filePathToAnalyze}`)
            } catch (downloadError: any) {
              console.error(`[REANALYZE] Erreur lors du téléchargement depuis Google Drive pour ${track.title}:`, downloadError.message)
              console.error(`[REANALYZE] Stack trace:`, downloadError.stack)
              // Nettoyer le fichier temporaire s'il a été créé
              if (filePathToAnalyze && existsSync(filePathToAnalyze)) {
                try {
                  await fs.unlink(filePathToAnalyze)
                } catch {}
              }
              skippedCount++
              return
            }
          } else {
            // Fichier local
            if (!existsSync(track.filePath)) {
              console.warn(`[REANALYZE] Fichier local non trouvé: ${track.filePath} (${track.title})`)
              skippedCount++
              return
            }
            filePathToAnalyze = track.filePath
          }
          
          // Vérifier que filePathToAnalyze est défini
          if (!filePathToAnalyze) {
            console.warn(`[REANALYZE] filePathToAnalyze n'est pas défini pour ${track.title}`)
            skippedCount++
            return
          }
          
          console.log(`[REANALYZE] Analyse de: ${track.title} - ${track.artist} (${filePathToAnalyze})`)
          
          // Ré-analyser le fichier pour extraire les tags
          const metadata = await parseFile(filePathToAnalyze)
          const common = metadata.common
          
          // Extraire l'Album Artist et les tags TPE2, TPE3, TPE4
          const albumArtist = common.albumartist || undefined
          let band: string | undefined = undefined
          let conductor: string | undefined = undefined
          let remixer: string | undefined = undefined
          let albumArtistFromTPE2: string | undefined = undefined
          
          try {
            if (metadata.native && Array.isArray(metadata.native)) {
              for (const tag of metadata.native) {
                try {
                  if (tag && tag.id && tag.value) {
                    if (tag.id === 'TPE2') {
                      const tpe2Value = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                      band = tpe2Value
                      // Si pas d'albumartist dans common, TPE2 est probablement l'Album Artist
                      if (!albumArtist) {
                        albumArtistFromTPE2 = tpe2Value
                      }
                    } else if (tag.id === 'TPE3') {
                      conductor = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                    } else if (tag.id === 'TPE4') {
                      remixer = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                    }
                  }
                } catch (tagError) {
                  // Ignorer les erreurs sur un tag individuel
                }
              }
            }
          } catch (nativeError) {
            console.warn(`[REANALYZE] Erreur lors de l'extraction des tags natifs pour ${track.title}:`, nativeError)
          }
          
          // Déterminer l'artiste de l'album : Album Artist > TPE2 > Artist
          const finalAlbumArtist = albumArtist || albumArtistFromTPE2 || track.artist
          const albumArtistId = generateId(finalAlbumArtist)
          
          // Vérifier si des tags ont été trouvés ou si l'albumArtist a changé
          const hasNewTags = band || conductor || remixer
          const hasExistingTags = track.band || track.conductor || track.remixer
          const albumArtistChanged = track.albumArtist !== finalAlbumArtist
          
          // Mettre à jour la piste si des tags ont été trouvés ou si l'albumArtist a changé
          if (hasNewTags || albumArtistChanged) {
            const oldTags = {
              band: track.band,
              conductor: track.conductor,
              remixer: track.remixer,
              albumArtist: track.albumArtist,
              albumArtistId: track.albumArtistId
            }
            
            track.band = band
            track.albumArtist = finalAlbumArtist
            track.albumArtistId = albumArtistId
            track.conductor = conductor
            track.remixer = remixer
            
            updatedCount++
            console.log(`[REANALYZE] ✓ ${track.title} - Tags mis à jour:`, {
              avant: oldTags,
              après: { band, conductor, remixer, albumArtist: finalAlbumArtist, albumArtistId }
            })
          } else if (!hasExistingTags && !albumArtistChanged) {
            // Pas de tags trouvés et pas de tags existants et pas de changement d'albumArtist
            console.log(`[REANALYZE] - ${track.title} - Aucun tag TPE2/TPE3/TPE4 trouvé et albumArtist inchangé`)
          }
          
          // Nettoyer le fichier temporaire si c'était un fichier Google Drive
          if (isTempFile && filePathToAnalyze) {
            try {
              await fs.unlink(filePathToAnalyze)
              console.log(`[REANALYZE] Fichier temporaire supprimé: ${filePathToAnalyze}`)
            } catch (unlinkError) {
              console.warn(`[REANALYZE] Impossible de supprimer le fichier temporaire: ${filePathToAnalyze}`)
            }
          }
          
        } catch (error: any) {
          errorCount++
          console.error(`[REANALYZE] ✗ Erreur lors de l'analyse de ${track.title}:`, error.message)
          console.error(`[REANALYZE] Stack trace:`, error.stack)
          
          // Nettoyer le fichier temporaire en cas d'erreur
          if (isTempFile && filePathToAnalyze) {
            try {
              await fs.unlink(filePathToAnalyze).catch(() => {})
              console.log(`[REANALYZE] Fichier temporaire supprimé après erreur: ${filePathToAnalyze}`)
            } catch (unlinkError) {
              console.warn(`[REANALYZE] Impossible de supprimer le fichier temporaire après erreur: ${filePathToAnalyze}`)
            }
          }
        }
      }))
      
      console.log(`[REANALYZE] Progression: ${Math.min(i + BATCH_SIZE, tracks.length)}/${tracks.length} pistes traitées`)
    }
    
    // Sauvegarder les données après mise à jour
    try {
      await saveAllData(albums, tracks, artists)
      console.log('[REANALYZE] Données sauvegardées avec succès')
    } catch (error) {
      console.error('[REANALYZE] Erreur lors de la sauvegarde:', error)
    }
    
    // Compter les raisons de skip
    let googleDriveCount = 0
    let fileNotFoundCount = 0
    let noFilePathCount = 0
    
    // Analyser les pistes pour compter les raisons de skip (approximatif basé sur les logs)
    tracks.forEach(track => {
      if (!track.filePath) {
        noFilePathCount++
      } else if (track.filePath.startsWith('gdrive://')) {
        googleDriveCount++
      }
    })
    
    const result = {
      success: true,
      message: `Ré-analyse terminée: ${updatedCount} piste(s) mise(s) à jour, ${skippedCount} ignorée(s), ${errorCount} erreur(s)`,
      stats: {
        total: tracks.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
        breakdown: {
          googleDrive: googleDriveCount,
          fileNotFound: fileNotFoundCount,
          noFilePath: noFilePathCount
        }
      }
    }
    
    console.log('[REANALYZE] Résultat final:', result)
    res.json(result)
    
  } catch (error: any) {
    console.error('[REANALYZE] Erreur lors de la ré-analyse:', error)
    console.error('[REANALYZE] Stack trace:', error.stack)
    res.status(500).json({
      error: 'Erreur lors de la ré-analyse des tags',
      details: error.message || 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * Route pour signaler qu'un utilisateur est actif (heartbeat)
 */
router.post('/active-users/heartbeat', (req: Request, res: Response) => {
  try {
    // Générer un ID de session unique pour cet utilisateur
    const sessionId = req.headers['x-session-id'] as string || 
                      req.ip + '-' + (req.headers['user-agent'] || 'unknown')
    
    // Mettre à jour le timestamp de dernière activité
    activeUsers.set(sessionId, Date.now())
    
    // Nettoyer les utilisateurs inactifs (plus vieux que 2 minutes)
    const now = Date.now()
    for (const [id, timestamp] of activeUsers.entries()) {
      if (now - timestamp > ACTIVE_USER_TIMEOUT) {
        activeUsers.delete(id)
      }
    }
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Erreur lors du heartbeat:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route pour obtenir le nombre d'utilisateurs actifs
 */
router.get('/active-users/count', (req: Request, res: Response) => {
  try {
    // Nettoyer les utilisateurs inactifs avant de compter
    const now = Date.now()
    for (const [id, timestamp] of activeUsers.entries()) {
      if (now - timestamp > ACTIVE_USER_TIMEOUT) {
        activeUsers.delete(id)
      }
    }
    
    const count = activeUsers.size
    res.json({ count })
  } catch (error: any) {
    console.error('Erreur lors du comptage des utilisateurs actifs:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
