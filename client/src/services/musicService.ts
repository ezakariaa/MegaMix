import axios from 'axios'
import { getCached, setCached, removeCached } from './cacheService'

// Utiliser la variable d'environnement VITE_API_URL si définie, sinon utiliser localhost par défaut
// Construire l'URL de base de l'API en ajoutant /api si nécessaire
const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  // Nettoyer l'URL (retirer le slash final s'il existe)
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Ajouter /api si ce n'est pas déjà présent
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}
const API_BASE_URL = getApiBaseUrl()

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year?: number
  genre?: string
  trackCount?: number
  coverArt?: string | null
}

export interface Track {
  id: string
  title: string
  artist: string
  artistId: string
  album: string
  albumId: string
  duration: number
  genre?: string
  filePath: string
  trackNumber?: number
  year?: number
}

export interface Artist {
  id: string
  name: string
  trackCount?: number
  albumCount?: number
  coverArt?: string | null
  genre?: string
  biography?: string | null
}

export interface Genre {
  id: string
  name: string
  trackCount?: number
  albumCount?: number
}

export interface ScanResult {
  success: boolean
  albums: Album[]
  tracksCount: number
  artistsCount: number
  message: string
}

export interface GoogleDriveAddResult {
  success: boolean
  message?: string
  error?: string
  album?: Album
}

/**
 * Envoie les fichiers audio au serveur pour analyse avec suivi de progression
 */
export async function scanMusicFiles(
  files: File[],
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<ScanResult> {
  const formData = new FormData()
  
  // Ajouter tous les fichiers audio
  files.forEach((file) => {
    formData.append('files', file)
  })

  try {
    const response = await axios.post<ScanResult>(
      `${API_BASE_URL}/music/scan-files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Suivi de la progression de l'upload
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage,
            })
          }
        },
        // Timeout augmenté pour les gros dossiers
        timeout: 300000, // 5 minutes
      }
    )
    const result = response.data
    
    // Invalider le cache après ajout
    if (result.success) {
      removeCached('albums')
      removeCached('artists')
      removeCached('genres')
    }
    
    return result
  } catch (error: any) {
    console.error('Erreur lors du scan des fichiers:', error)
    
    // Gestion spécifique des erreurs de connexion
    if (error.code === 'ECONNREFUSED' || error.message?.includes('CONNECTION_REFUSED')) {
      throw new Error('Le serveur backend n\'est pas démarré. Veuillez démarrer le serveur avec "npm run dev" dans le dossier server.')
    }
    
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez que le serveur est démarré sur le port 5000.')
    }
    
    if (error.response?.status === 413) {
      throw new Error('Les fichiers sont trop volumineux. Réduisez la taille des fichiers ou ajoutez-les par petits lots.')
    }
    
    throw new Error(error.response?.data?.error || error.message || 'Erreur lors du scan des fichiers')
  }
}

/**
 * Récupère tous les albums avec cache
 */
export async function getAlbums(useCache: boolean = true): Promise<Album[]> {
  try {
    const response = await axios.get<{ albums: Album[] }>(`${API_BASE_URL}/music/albums`, {
      timeout: 10000, // Augmenté à 10 secondes pour Railway
    })
    const albums = response.data.albums
    
    // Mettre en cache seulement si succès
    if (useCache && albums.length > 0) {
      setCached('albums', albums)
    }
    
    return albums
  } catch (error: any) {
    // Si erreur réseau, essayer de retourner le cache même expiré
    if (useCache) {
      const cached = getCached<Album[]>('albums')
      if (cached && cached.length > 0) {
        console.warn('Utilisation du cache en raison d\'une erreur réseau')
        // Rafraîchir en arrière-plan
        refreshAlbumsInBackground()
        return cached
      }
    }
    
    // Ne pas afficher d'erreur si le serveur n'est pas démarré (normal au démarrage)
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Serveur backend non disponible:', error.message)
    } else {
      console.error('Erreur lors de la récupération des albums:', error)
    }
    return []
  }
}

/**
 * Rafraîchit les albums en arrière-plan et met à jour le cache
 */
async function refreshAlbumsInBackground(): Promise<void> {
  try {
    const response = await axios.get<{ albums: Album[] }>(`${API_BASE_URL}/music/albums`, {
      timeout: 10000,
    })
    setCached('albums', response.data.albums)
  } catch (error) {
    // Ignorer les erreurs en arrière-plan
    console.debug('Erreur lors du rafraîchissement en arrière-plan:', error)
  }
}

/**
 * Rafraîchit les pistes d'un album en arrière-plan
 */
async function refreshAlbumTracksInBackground(albumId: string, cacheKey: string): Promise<void> {
  try {
    const response = await axios.get<{ tracks: Track[] }>(
      `${API_BASE_URL}/music/albums/${albumId}/tracks`,
      { timeout: 10000 }
    )
    setCached(cacheKey, response.data.tracks)
  } catch (error) {
    // Ignorer les erreurs en arrière-plan
    console.debug('Erreur lors du rafraîchissement des pistes en arrière-plan:', error)
  }
}

/**
 * Rafraîchit les artistes en arrière-plan
 */
async function refreshArtistsInBackground(): Promise<void> {
  try {
    const response = await axios.get<{ artists: Artist[] }>(`${API_BASE_URL}/music/artists`, {
      timeout: 10000,
    })
    setCached('artists', response.data.artists)
  } catch (error) {
    console.debug('Erreur lors du rafraîchissement des artistes en arrière-plan:', error)
  }
}

/**
 * Rafraîchit les genres en arrière-plan
 */
async function refreshGenresInBackground(): Promise<void> {
  try {
    const response = await axios.get<{ genres: Genre[] }>(`${API_BASE_URL}/music/genres`, {
      timeout: 10000,
    })
    setCached('genres', response.data.genres)
  } catch (error) {
    console.debug('Erreur lors du rafraîchissement des genres en arrière-plan:', error)
  }
}

/**
 * Récupère les pistes d'un album
 */
export async function getAlbumTracks(albumId: string): Promise<Track[]> {
  const cacheKey = `album_tracks_${albumId}`
  
  try {
    const response = await axios.get<{ tracks: Track[] }>(
      `${API_BASE_URL}/music/albums/${albumId}/tracks`,
      { timeout: 10000 } // Augmenté à 10 secondes
    )
    const tracks = response.data.tracks
    
    // Mettre en cache seulement si succès et non vide
    if (tracks.length > 0) {
      setCached(cacheKey, tracks)
    }
    
    return tracks
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré
    const cached = getCached<Track[]>(cacheKey)
    if (cached && cached.length > 0) {
      console.warn('Utilisation du cache en raison d\'une erreur réseau')
      // Rafraîchir en arrière-plan
      refreshAlbumTracksInBackground(albumId, cacheKey)
      return cached
    }
    console.error('Erreur lors de la récupération des pistes:', error)
    return []
  }
}

/**
 * Récupère toutes les pistes
 */
export async function getTracks(): Promise<Track[]> {
  try {
    const response = await axios.get<{ tracks: Track[] }>(`${API_BASE_URL}/music/tracks`, {
      timeout: 10000,
    })
    const tracks = response.data.tracks
    
    // Mettre en cache seulement si succès et non vide
    if (tracks.length > 0) {
      setCached('tracks', tracks)
    }
    
    return tracks
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré
    const cached = getCached<Track[]>('tracks')
    if (cached && cached.length > 0) {
      console.warn('Utilisation du cache en raison d\'une erreur réseau')
      return cached
    }
    // Ne pas afficher d'erreur si le serveur n'est pas démarré (normal au démarrage)
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Serveur backend non disponible:', error.message)
    } else {
      console.error('Erreur lors de la récupération des pistes:', error)
    }
    return []
  }
}

/**
 * Interface pour les résultats de recherche
 */
export interface SearchResults {
  albums: Album[]
  artists: Artist[]
  tracks: Track[]
  genres: Genre[]
}

/**
 * Recherche dans albums, artistes, pistes et genres
 */
export async function searchAll(query: string): Promise<SearchResults> {
  if (!query || query.trim().length === 0) {
    return { albums: [], artists: [], tracks: [], genres: [] }
  }

  const searchTerm = query.toLowerCase().trim()
  
  try {
    // Récupérer toutes les données en parallèle
    const [allAlbums, allArtists, allTracks, allGenres] = await Promise.all([
      getAlbums(),
      getArtists(),
      getTracks(),
      getGenres(),
    ])

    // Filtrer les albums
    const filteredAlbums = allAlbums.filter(album => 
      album.title.toLowerCase().includes(searchTerm) ||
      album.artist.toLowerCase().includes(searchTerm) ||
      (album.genre && album.genre.toLowerCase().includes(searchTerm))
    )

    // Filtrer les artistes
    const filteredArtists = allArtists.filter(artist =>
      artist.name.toLowerCase().includes(searchTerm)
    )

    // Filtrer les pistes
    const filteredTracks = allTracks.filter(track =>
      track.title.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      (track.album && track.album.toLowerCase().includes(searchTerm)) ||
      (track.genre && track.genre.toLowerCase().includes(searchTerm))
    )

    // Filtrer les genres
    const filteredGenres = allGenres.filter(genre =>
      genre.name.toLowerCase().includes(searchTerm)
    )

    return {
      albums: filteredAlbums,
      artists: filteredArtists,
      tracks: filteredTracks,
      genres: filteredGenres,
    }
  } catch (error) {
    console.error('Erreur lors de la recherche:', error)
    return { albums: [], artists: [], tracks: [], genres: [] }
  }
}

/**
 * Récupère tous les artistes
 */
export async function getArtists(): Promise<Artist[]> {
  try {
    const response = await axios.get<{ artists: Artist[] }>(`${API_BASE_URL}/music/artists`, {
      timeout: 10000, // Augmenté à 10 secondes
    })
    const artists = response.data.artists
    
    // Mettre en cache seulement si succès et non vide
    if (artists.length > 0) {
      setCached('artists', artists)
    }
    
    return artists
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré
    const cached = getCached<Artist[]>('artists')
    if (cached && cached.length > 0) {
      console.warn('Utilisation du cache en raison d\'une erreur réseau')
      refreshArtistsInBackground()
      return cached
    }
    // Ne pas afficher d'erreur si le serveur n'est pas démarré (normal au démarrage)
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Serveur backend non disponible:', error.message)
    } else {
      console.error('Erreur lors de la récupération des artistes:', error)
    }
    return []
  }
}

/**
 * Récupère les albums d'un artiste
 */
export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  try {
    const allAlbums = await getAlbums()
    return allAlbums.filter(album => album.artistId === artistId)
  } catch (error: any) {
    console.error('Erreur lors de la récupération des albums de l\'artiste:', error)
    return []
  }
}

/**
 * Récupère les détails d'un artiste par ID
 */
export async function getArtistById(artistId: string): Promise<Artist | null> {
  // Vérifier le cache d'abord (via la liste complète des artistes)
  const cachedArtists = getCached<Artist[]>('artists')
  if (cachedArtists) {
    const artist = cachedArtists.find(a => a.id === artistId)
    if (artist) {
      return artist
    }
  }

  try {
    const response = await axios.get<Artist>(`${API_BASE_URL}/music/artists/${artistId}`, {
      timeout: 10000, // Augmenté à 10 secondes
    })
    return response.data
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Serveur backend non disponible:', error.message)
    } else {
      console.error('Erreur lors de la récupération de l\'artiste:', error)
    }
    return null
  }
}

/**
 * Récupère tous les genres
 */
export async function getGenres(): Promise<Genre[]> {
  try {
    const response = await axios.get<{ genres: Genre[] }>(`${API_BASE_URL}/music/genres`, {
      timeout: 10000, // Augmenté à 10 secondes
    })
    const genres = response.data.genres
    
    // Mettre en cache seulement si succès et non vide
    if (genres.length > 0) {
      setCached('genres', genres)
    }
    
    return genres
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré
    const cached = getCached<Genre[]>('genres')
    if (cached && cached.length > 0) {
      console.warn('Utilisation du cache en raison d\'une erreur réseau')
      refreshGenresInBackground()
      return cached
    }
    // Ne pas afficher d'erreur si le serveur n'est pas démarré (normal au démarrage)
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.warn('Serveur backend non disponible:', error.message)
    } else {
      console.error('Erreur lors de la récupération des genres:', error)
    }
    return []
  }
}

/**
 * Récupère les albums d'un genre
 */
export async function getGenreAlbums(genreId: string): Promise<Album[]> {
  try {
    const allAlbums = await getAlbums()
    return allAlbums.filter(album => {
      // Générer l'ID du genre depuis le nom du genre de l'album
      const albumGenreId = album.genre 
        ? album.genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : null
      return albumGenreId === genreId
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des albums du genre:', error)
    return []
  }
}

/**
 * Supprime des albums de la bibliothèque
 */
export async function deleteAlbums(albumIds: string[]): Promise<void> {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/music/albums`,
      {
        data: { albumIds },
        timeout: 10000,
      }
    )
    if (!response.data.success) {
      throw new Error(response.data.error || 'Erreur lors de la suppression des albums')
    }
    
    // Invalider le cache après suppression
    removeCached('albums')
    removeCached('artists')
    removeCached('genres')
    // Invalider aussi les caches des pistes des albums supprimés
    albumIds.forEach(albumId => {
      removeCached(`album_tracks_${albumId}`)
    })
  } catch (error: any) {
    console.error('Erreur lors de la suppression des albums:', error)
    throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la suppression des albums')
  }
}

/**
 * Ajoute de la musique depuis un lien Google Drive
 */
export async function addMusicFromGoogleDrive(url: string): Promise<GoogleDriveAddResult> {
  try {
    const response = await axios.post<GoogleDriveAddResult>(
      `${API_BASE_URL}/music/add-from-google-drive`,
      { url },
      { timeout: 300000 } // 5 minutes pour le téléchargement
    )
    
    // Invalider le cache après ajout
    if (response.data.success) {
      removeCached('albums')
      removeCached('artists')
      removeCached('genres')
    }
    
    return response.data
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout depuis Google Drive:', error)
    
    // Gestion spécifique des erreurs de connexion
    if (error.code === 'ECONNREFUSED' || error.message?.includes('CONNECTION_REFUSED')) {
      return {
        success: false,
        error: 'Le serveur backend n\'est pas démarré. Veuillez démarrer le serveur avec "npm run dev" dans le dossier server.',
      }
    }
    
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      return {
        success: false,
        error: 'Impossible de se connecter au serveur. Vérifiez que le serveur est démarré sur le port 5000.',
      }
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Erreur lors de l\'ajout depuis Google Drive',
    }
  }
}

