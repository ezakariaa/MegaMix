import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

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
    return response.data
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
 * Récupère tous les albums
 */
export async function getAlbums(): Promise<Album[]> {
  try {
    const response = await axios.get<{ albums: Album[] }>(`${API_BASE_URL}/music/albums`, {
      timeout: 5000,
    })
    return response.data.albums
  } catch (error: any) {
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
 * Récupère les pistes d'un album
 */
export async function getAlbumTracks(albumId: string): Promise<Track[]> {
  try {
    const response = await axios.get<{ tracks: Track[] }>(
      `${API_BASE_URL}/music/albums/${albumId}/tracks`,
      { timeout: 5000 }
    )
    return response.data.tracks
  } catch (error: any) {
    console.error('Erreur lors de la récupération des pistes:', error)
    return []
  }
}

/**
 * Récupère tous les artistes
 */
export async function getArtists(): Promise<Artist[]> {
  try {
    const response = await axios.get<{ artists: Artist[] }>(`${API_BASE_URL}/music/artists`, {
      timeout: 5000,
    })
    return response.data.artists
  } catch (error: any) {
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
  try {
    const response = await axios.get<Artist>(`${API_BASE_URL}/music/artists/${artistId}`, {
      timeout: 5000,
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
      timeout: 5000,
    })
    return response.data.genres
  } catch (error: any) {
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

