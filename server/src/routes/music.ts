import express, { Request, Response } from 'express'
import multer from 'multer'
import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { scanMusicFolder } from '../services/musicScanner'
import { parseFile } from 'music-metadata'
import { Album, Track, Artist } from '../types'
import { loadAllData, saveAllData, saveAlbums, saveTracks, saveArtists } from '../utils/dataPersistence'
import { searchArtistImage, searchArtistBackground } from '../utils/artistImageSearch'
import { getArtistBiography } from '../utils/artistBiography'

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

// Charger les données au démarrage
loadAllData().then(({ albums: loadedAlbums, tracks: loadedTracks, artists: loadedArtists }) => {
  albums = loadedAlbums
  tracks = loadedTracks
  artists = loadedArtists
  console.log(`[INIT] Données chargées: ${albums.length} album(s), ${tracks.length} piste(s), ${artists.length} artiste(s)`)
}).catch((error) => {
  console.error('[INIT] Erreur lors du chargement des données:', error)
})

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
          const albumKey = `${track.artistId}-${track.albumId}`
          if (!albumsMap.has(albumKey)) {
            albumsMap.set(albumKey, {
              id: track.albumId,
              title: track.album || 'Album Inconnu',
              artist: track.artist,
              artistId: track.artistId,
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

          // Créer ou mettre à jour l'artiste
          if (!artistsMap.has(track.artistId)) {
            artistsMap.set(track.artistId, {
              id: track.artistId,
              name: track.artist,
              trackCount: 1,
            })
          } else {
            const artist = artistsMap.get(track.artistId)!
            artist.trackCount = (artist.trackCount || 0) + 1
          }
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
 * Extrait les métadonnées ET la couverture d'un fichier audio en une seule passe (optimisé)
 */
async function extractTrackMetadataAndCover(filePath: string): Promise<{ track: Track | null; coverArt: string | null }> {
  try {
    // Parser le fichier une seule fois pour tout extraire
    const metadata = await parseFile(filePath)
    const common = metadata.common

    const artist = common.artist || 'Artiste Inconnu'
    const album = common.album || path.basename(path.dirname(filePath))
    const title = common.title || path.basename(filePath, path.extname(filePath))

    // Générer des IDs simples basés sur les noms
    const artistId = generateId(artist)
    const albumId = generateId(`${artist}-${album}`)
    const trackId = generateId(`${artist}-${album}-${title}`)

    const track: Track = {
      id: trackId,
      title,
      artist,
      artistId,
      album,
      albumId,
      duration: Math.round(metadata.format.duration || 0),
      genre: common.genre?.[0],
      filePath: filePath,
      trackNumber: common.track?.no || undefined,
      year: common.year || undefined,
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
  } catch (error) {
    console.error(`Erreur lors de l'extraction des métadonnées de ${filePath}:`, error)
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
    await saveAllData(albums, tracks, artists).catch((error) => {
      console.error('[PERSISTENCE] Erreur lors de la sauvegarde après scan-path:', error)
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
 */
router.get('/albums', (req: Request, res: Response) => {
  // Retourner les albums en mémoire (chargés au démarrage et mis à jour après chaque modification)
  // Ne pas recharger depuis le fichier à chaque requête pour éviter les problèmes de synchronisation
  res.json({ albums })
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

    res.json({
      success: true,
      message: `${albumsToDelete.length} album(s) supprimé(s) avec succès`,
      deletedAlbums: albumsToDelete.length,
      deletedTracks: tracksToDelete.length,
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
 */
router.get('/artists', (req: Request, res: Response) => {
  // Calculer le nombre d'albums par artiste
  const artistsWithAlbumCount = artists.map(artist => {
    const albumCount = albums.filter(album => album.artistId === artist.id).length
    return {
      ...artist,
      albumCount,
    }
  })
  res.json({ artists: artistsWithAlbumCount })
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
    
    // Rechercher l'image bannière de l'artiste sur plusieurs sources
    let artistBackground: string | null = null
    try {
      artistBackground = await searchArtistBackground(artist.name)
      console.log(`[ARTIST] Image bannière recherchée pour ${artist.name}: ${artistBackground ? 'trouvée' : 'non trouvée'}`)
      
      // Si une image est trouvée, utiliser le proxy pour éviter les problèmes CORS
      if (artistBackground) {
        // Encoder l'URL pour la passer en paramètre
        const encodedUrl = encodeURIComponent(artistBackground)
        artistBackground = `/api/music/image-proxy?url=${encodedUrl}`
        console.log(`[ARTIST] URL proxy générée: ${artistBackground.substring(0, 100)}`)
      }
    } catch (error) {
      console.warn(`[ARTIST] Erreur lors de la recherche d'image bannière pour ${artist.name}:`, error)
    }
    
    // Rechercher la biographie de l'artiste sur Last.fm
    let biography: string | null = null
    try {
      biography = await getArtistBiography(artist.name)
      console.log(`[ARTIST] Biographie recherchée pour ${artist.name}: ${biography ? 'trouvée' : 'non trouvée'}`)
      if (biography) {
        console.log(`[ARTIST] Biographie (premiers 100 caractères): ${biography.substring(0, 100)}`)
      }
    } catch (error) {
      console.warn(`[ARTIST] Erreur lors de la recherche de biographie pour ${artist.name}:`, error)
    }
    
    // Utiliser l'image bannière trouvée, sinon null
    const coverArt = artistBackground || null
    
    const responseData = {
      ...artist,
      albumCount,
      coverArt,
      genre: mostCommonGenre,
      biography,
    }
    
    console.log(`[ARTIST] Réponse finale pour ${artist.name}:`, {
      id: responseData.id,
      name: responseData.name,
      albumCount: responseData.albumCount,
      trackCount: responseData.trackCount,
      genre: responseData.genre,
      hasCoverArt: !!responseData.coverArt,
      hasBiography: !!responseData.biography,
    })
    
    res.json(responseData)
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'artiste:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Route pour obtenir tous les genres
 */
router.get('/genres', (req: Request, res: Response) => {
  // Extraire les genres uniques depuis les albums et pistes
  const genresMap = new Map<string, { id: string; name: string; trackCount: number; albumIds: Set<string> }>()
  
  // Parcourir les albums pour extraire les genres
  albums.forEach(album => {
    if (album.genre) {
      const genreId = album.genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!genresMap.has(genreId)) {
        genresMap.set(genreId, {
          id: genreId,
          name: album.genre,
          trackCount: 0,
          albumIds: new Set(),
        })
      }
      const genre = genresMap.get(genreId)!
      genre.albumIds.add(album.id)
    }
  })
  
  // Compter les pistes par genre
  tracks.forEach(track => {
    if (track.genre) {
      const genreId = track.genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!genresMap.has(genreId)) {
        genresMap.set(genreId, {
          id: genreId,
          name: track.genre,
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
    const { url } = req.body

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
        
        const listFiles = (): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            // Utiliser l'API Google Drive avec la clé API
            const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
            
            if (!GOOGLE_API_KEY) {
              console.log('[GOOGLE DRIVE] Pas de clé API configurée, tentative de scraping HTML')
              return scrapeFolderPage(fileId).then(resolve).catch(reject)
            }
            
            const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${fileId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${GOOGLE_API_KEY}`
            
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
                    return scrapeFolderPage(fileId).then(resolve).catch(reject)
                  }
                  
                  if (!json.files || json.files.length === 0) {
                    console.log('[GOOGLE DRIVE] API réussie mais aucun fichier trouvé dans le dossier')
                    console.log('[GOOGLE DRIVE] Réponse complète:', JSON.stringify(json, null, 2))
                    reject(new Error('Aucun fichier trouvé dans le dossier. Assurez-vous que le dossier est partagé publiquement et contient des fichiers.'))
                    return
                  }
                  
                  console.log(`[GOOGLE DRIVE] API réussie: ${json.files.length} fichier(s) trouvé(s)`)
                  console.log('[GOOGLE DRIVE] Exemples de fichiers:', json.files.slice(0, 3).map((f: any) => `${f.name} (${f.mimeType})`))
                  resolve(json.files || [])
                } catch (error: any) {
                  console.error('[GOOGLE DRIVE] Erreur parsing API:', error)
                  console.log('[GOOGLE DRIVE] Réponse brute:', data.substring(0, 1000))
                  console.log('[GOOGLE DRIVE] Fallback vers scraping HTML')
                  return scrapeFolderPage(fileId).then(resolve).catch(reject)
                }
              })
            }).on('error', (err: Error) => {
              console.error('[GOOGLE DRIVE] Erreur réseau API:', err)
              console.log('[GOOGLE DRIVE] Fallback vers scraping HTML')
              scrapeFolderPage(fileId).then(resolve).catch(reject)
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
        
        const files = await listFiles()
        
        if (files.length === 0) {
          return res.status(400).json({ 
            error: 'Aucun fichier trouvé dans le dossier. Assurez-vous que le dossier est partagé publiquement.' 
          })
        }
        
        // Filtrer uniquement les fichiers audio
        const audioFiles = files.filter((f: any) => {
          const name = f.name?.toLowerCase() || ''
          return name.endsWith('.mp3') || name.endsWith('.m4a') || name.endsWith('.flac') || 
                 name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.aac') ||
                 f.mimeType?.startsWith('audio/')
        })
        
        if (audioFiles.length === 0) {
          return res.status(400).json({ 
            error: 'Aucun fichier audio trouvé dans le dossier.' 
          })
        }
        
        console.log(`[GOOGLE DRIVE] ${audioFiles.length} fichier(s) audio trouvé(s) dans le dossier`)
        
        // Vérifier si ce dossier Google Drive a déjà été ajouté
        // Chercher les albums qui proviennent de ce dossier
        const existingAlbumsFromFolder = albums.filter(a => a.googleDriveFolderId === fileId)
        const existingGoogleDriveIds = new Set<string>()
        
        // Récupérer tous les IDs Google Drive des pistes existantes de ces albums
        if (existingAlbumsFromFolder.length > 0) {
          console.log(`[GOOGLE DRIVE] Dossier déjà ajouté, ${existingAlbumsFromFolder.length} album(s) existant(s)`)
          existingAlbumsFromFolder.forEach(album => {
            const albumTracks = tracks.filter(t => t.albumId === album.id)
            albumTracks.forEach(track => {
              if (track.googleDriveId) {
                existingGoogleDriveIds.add(track.googleDriveId)
              }
            })
          })
          console.log(`[GOOGLE DRIVE] ${existingGoogleDriveIds.size} fichier(s) déjà présent(s) dans la bibliothèque`)
        }
        
        // Filtrer uniquement les nouveaux fichiers (ceux qui ne sont pas déjà dans la bibliothèque)
        const newAudioFiles = audioFiles.filter((f: any) => !existingGoogleDriveIds.has(f.id))
        
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
        
        // Télécharger chaque fichier
        const albumsMap = new Map<string, Album>()
        const newTracks: Track[] = []
        const artistsMap = new Map<string, Artist>()
        
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
        const BATCH_SIZE = 3
        for (let i = 0; i < newAudioFiles.length; i += BATCH_SIZE) {
          const batch = newAudioFiles.slice(i, i + BATCH_SIZE)
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
              const { track, coverArt } = await extractTrackMetadataAndCover(tempFilePath)
              
              if (track) {
                console.log(`[GOOGLE DRIVE] Métadonnées extraites: ${track.title} - ${track.artist} (${track.album})`)
                
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
                
                newTracks.push(track)
                
                const albumKey = `${track.artistId}-${track.albumId}`
                if (!albumsMap.has(albumKey)) {
                  // Vérifier si l'album existe déjà dans la bibliothèque
                  const existingAlbum = albums.find(a => a.id === track.albumId)
                  if (existingAlbum) {
                    // Utiliser l'album existant et ajouter le googleDriveFolderId s'il n'est pas déjà défini
                    albumsMap.set(albumKey, {
                      ...existingAlbum,
                      googleDriveFolderId: existingAlbum.googleDriveFolderId || fileId,
                      trackCount: (existingAlbum.trackCount || 0) + 1,
                    })
                    console.log(`[GOOGLE DRIVE] Album existant mis à jour: ${track.album}`)
                  } else {
                    // Créer un nouvel album
                    albumsMap.set(albumKey, {
                      id: track.albumId,
                      title: track.album || 'Album Inconnu',
                      artist: track.artist,
                      artistId: track.artistId,
                      year: track.year,
                      genre: track.genre,
                      trackCount: 1,
                      coverArt: coverArt ?? undefined,
                      googleDriveFolderId: fileId, // Associer le dossier Google Drive
                    })
                    console.log(`[GOOGLE DRIVE] Nouvel album créé: ${track.album}`)
                  }
                } else {
                  const album = albumsMap.get(albumKey)!
                  album.trackCount = (album.trackCount || 0) + 1
                  if (!album.coverArt && coverArt) {
                    album.coverArt = coverArt
                  }
                  album.googleDriveFolderId = album.googleDriveFolderId || fileId
                  console.log(`[GOOGLE DRIVE] Album mis à jour: ${track.album} (${album.trackCount} pistes)`)
                }
                
                if (!artistsMap.has(track.artistId)) {
                  artistsMap.set(track.artistId, {
                    id: track.artistId,
                    name: track.artist,
                    trackCount: 1,
                  })
                } else {
                  const artist = artistsMap.get(track.artistId)!
                  artist.trackCount = (artist.trackCount || 0) + 1
                }
              } else {
                console.error(`[GOOGLE DRIVE] Échec de l'extraction des métadonnées pour ${file.name}`)
                console.error(`[GOOGLE DRIVE] Le fichier téléchargé n'est peut-être pas un fichier audio valide`)
                // Supprimer le fichier temporaire même en cas d'erreur
                if (tempFilePath) {
                  await fs.unlink(tempFilePath).catch(() => {})
                }
              }
            } catch (error: any) {
              console.error(`[GOOGLE DRIVE] Erreur lors du traitement de ${file.name}:`, error)
              console.error(`[GOOGLE DRIVE] Stack trace:`, error.stack)
              // Nettoyer le fichier temporaire en cas d'erreur
              if (tempFilePath) {
                await fs.unlink(tempFilePath).catch(() => {})
              }
            }
          }))
          
          console.log(`[GOOGLE DRIVE] Téléchargés ${Math.min(i + BATCH_SIZE, newAudioFiles.length)}/${newAudioFiles.length} nouveaux fichiers`)
        }
        
        const newAlbums = Array.from(albumsMap.values())
        const newArtists = Array.from(artistsMap.values())
        
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
          } else {
            albums.push(newAlbum)
          }
        })
        
        // Ajouter seulement les nouvelles pistes (éviter les doublons)
        const actuallyNewTracks: Track[] = []
        newTracks.forEach(newTrack => {
          // Vérifier si la piste existe déjà par googleDriveId
          const existingByGoogleDriveId = tracks.find(t => t.googleDriveId === newTrack.googleDriveId)
          if (!existingByGoogleDriveId) {
            // Vérifier aussi par ID de piste (même artiste-album-titre)
            const existingByTrackId = tracks.find(t => t.id === newTrack.id)
            if (!existingByTrackId) {
              tracks.push(newTrack)
              actuallyNewTracks.push(newTrack)
            } else {
              console.log(`[GOOGLE DRIVE] Piste déjà existante (par ID) ignorée: ${newTrack.title}`)
            }
          } else {
            console.log(`[GOOGLE DRIVE] Piste déjà existante (par Google Drive ID) ignorée: ${newTrack.title}`)
          }
        })
        
        // Ajouter les nouveaux artistes
        newArtists.forEach(newArtist => {
          const existingIndex = artists.findIndex(a => a.id === newArtist.id)
          if (existingIndex >= 0) {
            // Recalculer le nombre de pistes de l'artiste
            const artistTracks = tracks.filter(t => t.artistId === newArtist.id)
            artists[existingIndex].trackCount = artistTracks.length
          } else {
            artists.push(newArtist)
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
        } catch (error) {
          console.error('[PERSISTENCE] Erreur lors de la sauvegarde après Google Drive (dossier):', error)
          // Ne pas échouer la requête si la sauvegarde échoue, mais logger l'erreur
        }
        
        const addedTracksCount = actuallyNewTracks.length
        
        res.json({
          success: true,
          message: existingAlbumsFromFolder.length > 0 
            ? `${addedTracksCount} nouveau(x) morceau(x) ajouté(s) au dossier existant. ${audioFiles.length - newAudioFiles.length} morceau(x) déjà présent(s).`
            : `${newAlbums.length} album(s) ajouté(s), ${addedTracksCount} piste(s) ajoutée(s) depuis Google Drive`,
          albums: newAlbums.length > 0 ? newAlbums : existingAlbumsFromFolder,
          tracksCount: addedTracksCount,
          artistsCount: newArtists.length,
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
      const albumKey = `${track.artistId}-${track.albumId}`
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
          artist: track.artist,
          artistId: track.artistId,
          year: track.year,
          genre: track.genre,
          trackCount: 1,
          coverArt: coverArt || undefined,
        })
      }

      // Ajouter la piste
      tracks.push(track)

      // Créer ou mettre à jour l'artiste
      const existingArtistIndex = artists.findIndex(a => a.id === track.artistId)
      if (existingArtistIndex >= 0) {
        artists[existingArtistIndex].trackCount = (artists[existingArtistIndex].trackCount || 0) + 1
      } else {
        artists.push({
          id: track.artistId,
          name: track.artist,
          trackCount: 1,
        })
      }

      // Sauvegarder les données après modification
      try {
        await saveAllData(albums, tracks, artists)
        console.log('[PERSISTENCE] Données sauvegardées avec succès après Google Drive (fichier)')
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
 * Route proxy pour servir les images externes (évite les problèmes CORS)
 */
router.get('/image-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL requise' })
    }

    const decodedUrl = decodeURIComponent(url)
    console.log(`[IMAGE PROXY] Requête pour: ${decodedUrl.substring(0, 100)}`)

    const https = require('https')
    const http = require('http')
    const protocol = decodedUrl.startsWith('https') ? https : http

    protocol.get(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 10000
    }, (response: any) => {
      // Gérer les redirections
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
        const location = response.headers.location
        if (location) {
          console.log(`[IMAGE PROXY] Redirection vers: ${location.substring(0, 100)}`)
          // Suivre la redirection
          const redirectUrl = location.startsWith('http') ? location : new URL(location, decodedUrl).href
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
              return res.status(204).end()
            }
            const contentType = redirectResponse.headers['content-type'] || 'image/jpeg'
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.setHeader('Access-Control-Allow-Origin', '*')
            redirectResponse.pipe(res)
          }).on('error', () => {
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
        return res.status(204).end()
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

    // Fusionner avec les données existantes (éviter les doublons)
    const albumsMap = new Map<string, Album>()
    const tracksMap = new Map<string, Track>()
    const artistsMap = new Map<string, Artist>()

    // Charger les données existantes
    albums.forEach(album => albumsMap.set(album.id, album))
    tracks.forEach(track => tracksMap.set(track.id, track))
    artists.forEach(artist => artistsMap.set(artist.id, artist))

    // Ajouter/remplacer avec les données importées
    importedAlbums.forEach((album: Album) => {
      albumsMap.set(album.id, album)
    })
    importedTracks.forEach((track: Track) => {
      tracksMap.set(track.id, track)
    })
    importedArtists.forEach((artist: Artist) => {
      artistsMap.set(artist.id, artist)
    })

    // Convertir les Maps en tableaux
    albums = Array.from(albumsMap.values())
    tracks = Array.from(tracksMap.values())
    artists = Array.from(artistsMap.values())

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

export default router
