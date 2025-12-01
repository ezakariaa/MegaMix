import * as fs from 'fs/promises'
import * as path from 'path'
import { parseFile } from 'music-metadata'
import { Album, Track, Artist } from '../types'

// Import conditionnel de sharp (peut ne pas être installé)
let sharp: any = null
try {
  sharp = require('sharp')
} catch (error) {
  console.warn('Sharp n\'est pas installé. Les images ne seront pas optimisées.')
}

// Extensions de fichiers audio supportées
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma']

/**
 * Scanne un dossier et extrait les métadonnées des fichiers musicaux
 */
export async function scanMusicFolder(folderPath: string): Promise<{
  albums: Album[]
  tracks: Track[]
  artists: Artist[]
}> {
  const albumsMap = new Map<string, Album>()
  const tracks: Track[] = []
  const artistsMap = new Map<string, Artist>()

  try {
    // Lire les fichiers du dossier
    const entries = await fs.readdir(folderPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name)

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (AUDIO_EXTENSIONS.includes(ext)) {
          try {
            const track = await extractTrackMetadata(fullPath)
            if (track) {
              tracks.push(track)

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
                  coverArt: undefined,
                })
              } else {
                const album = albumsMap.get(albumKey)!
                album.trackCount = (album.trackCount || 0) + 1
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
          } catch (error) {
            console.error(`Erreur lors de l'extraction de ${fullPath}:`, error)
          }
        }
      } else if (entry.isDirectory()) {
        // Scanner récursivement les sous-dossiers
        const subResult = await scanMusicFolder(fullPath)
        tracks.push(...subResult.tracks)
        subResult.albums.forEach(album => {
          const albumKey = `${album.artistId}-${album.id}`
          if (!albumsMap.has(albumKey)) {
            albumsMap.set(albumKey, album)
          } else {
            const existingAlbum = albumsMap.get(albumKey)!
            existingAlbum.trackCount = (existingAlbum.trackCount || 0) + (album.trackCount || 0)
          }
        })
        subResult.artists.forEach(artist => {
          if (!artistsMap.has(artist.id)) {
            artistsMap.set(artist.id, artist)
          } else {
            const existingArtist = artistsMap.get(artist.id)!
            existingArtist.trackCount = (existingArtist.trackCount || 0) + (artist.trackCount || 0)
          }
        })
      }
    }
  } catch (error) {
    console.error(`Erreur lors du scan du dossier ${folderPath}:`, error)
    throw error
  }

  // Extraire les couvertures d'album des pistes
  for (const track of tracks) {
    const albumKey = `${track.artistId}-${track.albumId}`
    const album = albumsMap.get(albumKey)
    if (album && !album.coverArt) {
      const coverArt = await extractCoverArt(track.filePath)
      if (coverArt) {
        album.coverArt = coverArt
      }
    }
  }

  return {
    albums: Array.from(albumsMap.values()),
    tracks,
    artists: Array.from(artistsMap.values()),
  }
}

/**
 * Extrait les métadonnées d'un fichier audio
 */
async function extractTrackMetadata(filePath: string): Promise<Track | null> {
  try {
    const metadata = await parseFile(filePath)
    const common = metadata.common

    // Artist (TPE1) = Artiste de la piste individuelle
    const trackArtist = common.artist || 'Artiste Inconnu'
    // Album Artist (TPE2 ou common.albumartist) = Artiste de l'album (pour les compilations)
    const albumArtist = common.albumartist || undefined
    const album = common.album || path.basename(path.dirname(filePath))
    const title = common.title || path.basename(filePath, path.extname(filePath))

    // Extraire les tags ID3 additionnels (TPE2, TPE3, TPE4) depuis metadata.native
    let band: string | undefined = undefined // TPE2 (peut être Album Artist ou Band)
    let conductor: string | undefined = undefined // TPE3
    let remixer: string | undefined = undefined // TPE4
    
    // Si TPE2 existe et qu'il n'y a pas d'albumartist dans common, utiliser TPE2 comme Album Artist
    let albumArtistFromTPE2: string | undefined = undefined

    try {
      if (metadata.native && Array.isArray(metadata.native)) {
        // Chercher dans les tags natifs
        for (const tag of metadata.native) {
          try {
            if (tag && tag.id && tag.value) {
              if (tag.id === 'TPE2') {
                // TPE2 - Band/Orchestra/Accompaniment (ou Album Artist dans certains cas)
                const tpe2Value = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
                band = tpe2Value
                // Si pas d'albumartist dans common, TPE2 est probablement l'Album Artist
                if (!albumArtist) {
                  albumArtistFromTPE2 = tpe2Value
                }
              } else if (tag.id === 'TPE3') {
                // TPE3 - Conductor/Performer refinement
                conductor = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
              } else if (tag.id === 'TPE4') {
                // TPE4 - Interpreted, remixed, or otherwise modified by
                remixer = Array.isArray(tag.value) ? tag.value[0] : String(tag.value)
              }
            }
          } catch (tagError) {
            // Ignorer les erreurs sur un tag individuel et continuer
            console.warn(`[METADATA] Erreur lors de l'extraction du tag ${tag?.id}:`, tagError)
          }
        }
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

    return {
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
      filePath,
      trackNumber: common.track?.no || undefined,
      year: common.year || undefined,
      band,
      conductor,
      remixer,
    }
  } catch (error) {
    console.error(`Erreur lors de l'extraction des métadonnées de ${filePath}:`, error)
    return null
  }
}

/**
 * Extrait la couverture d'album d'un fichier audio (optimisée)
 */
async function extractCoverArt(filePath: string): Promise<string | null> {
  try {
    const metadata = await parseFile(filePath)
    const picture = metadata.common.picture?.[0]

    if (picture && picture.data) {
      try {
        // Optimiser l'image : redimensionner et compresser
        return await optimizeCoverImage(picture.data, picture.format)
      } catch (error) {
        console.error('Erreur lors de l\'optimisation de la couverture:', error)
        // Fallback : utiliser l'image originale si l'optimisation échoue
        const base64 = picture.data.toString('base64')
        const mimeType = picture.format || 'image/jpeg'
        return `data:${mimeType};base64,${base64}`
      }
    }
  } catch (error) {
    console.error(`Erreur lors de l'extraction de la couverture de ${filePath}:`, error)
  }
  return null
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

