import axios from 'axios'
import { getCached, getCachedEvenExpired, setCached, removeCached } from './cacheService'

// Utiliser la variable d'environnement VITE_API_URL si définie, sinon utiliser localhost par défaut
// Construire l'URL de base de l'API en ajoutant /api si nécessaire
const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  // Nettoyer l'URL (retirer le slash final s'il existe)
  const cleanUrl = baseUrl.replace(/\/$/, '')
  // Ajouter /api si ce n'est pas déjà présent
  const apiUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
  return apiUrl
}
const API_BASE_URL = getApiBaseUrl()

// Log de configuration (seulement en développement)
if (import.meta.env.DEV) {
  console.log('[API] Configuration:', {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'localhost:5000',
    API_BASE_URL,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A'
  })
}

// Avertissement si on est sur GitHub Pages et que l'API pointe vers localhost
if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
  if (API_BASE_URL.includes('localhost') || !import.meta.env.VITE_API_URL) {
    console.error('%c⚠️ VITE_API_URL non configuré', 'color: red; font-size: 16px; font-weight: bold;')
    console.error('Configurez le secret VITE_API_URL dans GitHub Settings > Secrets > Actions')
  }
}

/**
 * Construit l'URL complète d'une image (pour les images d'artistes, albums, etc.)
 * Gère les URLs absolues (http/https), les URLs relatives (/api/...), et les data URLs
 */
export function buildImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  
  // Si c'est déjà une URL absolue (http/https), l'utiliser telle quelle
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Si c'est une data URL (base64), l'utiliser telle quelle
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }
  
  // Sinon, construire l'URL avec le backend
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const cleanUrl = baseUrl.replace(/\/$/, '')
  
  // Si l'URL commence déjà par /, l'utiliser directement
  if (imageUrl.startsWith('/')) {
    return `${cleanUrl}${imageUrl}`
  }
  
  // Sinon, ajouter / devant
  return `${cleanUrl}/${imageUrl}`
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year?: number
  genre?: string
  trackCount?: number
  coverArt?: string | null
  cdCount?: number // Nombre de CDs si l'album contient plusieurs CDs
}

export interface Track {
  id: string
  title: string
  artist: string // Artiste de la piste individuelle (TPE1)
  artistId: string // ID de l'artiste de la piste
  album: string
  albumId: string
  albumArtist?: string // Artiste de l'album (Album Artist / TPE2 si utilisé comme Album Artist)
  albumArtistId?: string // ID de l'artiste de l'album
  duration: number
  genre?: string
  filePath: string
  trackNumber?: number
  year?: number
  // Tags ID3 additionnels pour les artistes
  band?: string // TPE2 - Band/Orchestra/Accompaniment (peut être Album Artist)
  conductor?: string // TPE3 - Conductor/Performer refinement
  remixer?: string // TPE4 - Interpreted, remixed, or otherwise modified by
}

export interface Artist {
  id: string
  name: string
  trackCount?: number
  albumCount?: number
  coverArt?: string | null
  genre?: string
  biography?: string | null
  logo?: string | null
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
    
    // NE PAS invalider le cache immédiatement après ajout
    // La synchronisation avec Railway prend du temps
    // On va recharger les albums pour mettre à jour le cache avec les nouvelles données
    // Mais on garde l'ancien cache en cas d'erreur réseau
    if (result.success) {
      // Recharger les albums pour mettre à jour le cache avec les nouvelles données
      // Mais ne pas supprimer le cache avant, pour éviter d'afficher "aucun album"
      try {
        const updatedAlbums = await getAlbums(false) // Ne pas utiliser le cache, forcer le rechargement
        if (updatedAlbums.length > 0) {
          // Mettre à jour le cache avec les nouvelles données
          setCached('albums', updatedAlbums)
        }
      } catch (error) {
        // Si erreur, garder l'ancien cache pour éviter d'afficher "aucun album"
        console.warn('[SCAN] Erreur lors du rechargement, conservation du cache existant')
      }
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
/**
 * Crée une version légère d'un album (sans données volumineuses)
 * Supprime les images base64 qui sont très volumineuses
 * UNIQUEMENT sur GitHub Pages (production) pour éviter les problèmes de quota localStorage
 */
function createLightweightAlbum(album: Album): Album {
  // Vérifier si on est sur GitHub Pages (production)
  const isGitHubPages = typeof window !== 'undefined' && 
                        (window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('github.com'))
  
  // Si coverArt est une data URL (base64), la supprimer SEULEMENT sur GitHub Pages
  let coverArt = album.coverArt
  if (isGitHubPages && coverArt && coverArt.startsWith('data:')) {
    // Sur GitHub Pages, supprimer les images base64 pour réduire la taille du cache
    coverArt = null
  }
  // Sur localhost, garder toutes les images (y compris base64)
  
  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    artistId: album.artistId,
    year: album.year,
    genre: album.genre,
    trackCount: album.trackCount,
    coverArt: coverArt,
    cdCount: album.cdCount,
  }
}

export async function getAlbums(useCache: boolean = true): Promise<Album[]> {
  // Si le cache est activé, retourner immédiatement le cache s'il existe (chargement instantané)
  if (useCache) {
    const cached = getCached<Album[]>('albums')
    if (cached && cached.length > 0) {
      // Rafraîchir en arrière-plan sans bloquer
      refreshAlbumsInBackground().catch(() => {
        // Ignorer les erreurs en arrière-plan
      })
      return cached
    }
    // Si cache expiré mais existe, l'utiliser quand même pour affichage immédiat
    const expiredCache = getCachedEvenExpired<Album[]>('albums')
    if (expiredCache && expiredCache.length > 0) {
      // Rafraîchir en arrière-plan
      refreshAlbumsInBackground().catch(() => {})
      return expiredCache
    }
  }
  
  const url = `${API_BASE_URL}/music/albums`
  
  try {
    const response = await axios.get<{ albums: Album[] }>(url, {
      timeout: 20000, // Timeout augmenté à 20 secondes pour Railway (peut être lent au démarrage)
      // Note: Le navigateur gère automatiquement Accept-Encoding, pas besoin de le définir
    })
    const albums = response.data.albums
    
    // Mettre en cache les albums (avec gestion d'erreur silencieuse)
    // Si le cache échoue (quota dépassé), on continue sans cache mais l'app fonctionne
    if (useCache && albums.length > 0) {
      // Vérifier si on est sur GitHub Pages (production)
      const isGitHubPages = typeof window !== 'undefined' && 
                            (window.location.hostname.includes('github.io') || 
                             window.location.hostname.includes('github.com'))
      
      // Sur GitHub Pages, utiliser la version légère pour éviter les problèmes de quota
      // Sur localhost, utiliser les albums complets avec images
      const albumsToCache = isGitHubPages ? albums.map(createLightweightAlbum) : albums
      
      try {
        setCached('albums', albumsToCache)
      } catch (cacheError: any) {
        // Si le cache échoue encore (quota dépassé), nettoyer et réessayer
        const isQuotaError = 
          (cacheError instanceof DOMException && (cacheError.code === 22 || cacheError.name === 'QuotaExceededError')) ||
          cacheError.name === 'QuotaExceededError'
        
        if (isQuotaError) {
          console.warn('[API] Quota localStorage dépassé, nettoyage du cache...')
          try {
            // Nettoyer les anciens caches
            removeCached('tracks') // Les tracks sont souvent volumineux
            removeCached('artists') // Les artists peuvent aussi être volumineux
            // Réessayer avec version légère (même sur localhost en cas d'erreur)
            const lightweightAlbums = albums.map(createLightweightAlbum)
            setCached('albums', lightweightAlbums)
          } catch (retryError) {
            // Si ça échoue encore, continuer sans cache (l'app fonctionne quand même)
            console.warn('[API] Impossible de mettre en cache, continuation sans cache')
          }
        }
      }
    }
    
    return albums
  } catch (error: any) {
    const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io')
    const isCorsError = error.message?.includes('CORS') || error.code === 'ERR_NETWORK' || 
                       (error.response?.status === 0 && isGitHubPages)
    
    if (import.meta.env.DEV) {
      console.error('[API] Erreur albums:', error.message || error.code)
    }
    
    // Afficher des instructions spécifiques selon le type d'erreur
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      console.warn('⏱️ Timeout: Le backend Railway prend trop de temps à répondre')
    } else if (isCorsError && isGitHubPages) {
      console.error('🚫 Erreur CORS: Configurez ALLOWED_ORIGINS sur Railway')
    } else if (isGitHubPages && (!import.meta.env.VITE_API_URL || API_BASE_URL.includes('localhost'))) {
      console.error('🚫 VITE_API_URL non configuré dans GitHub Secrets')
    }
    
    // Si erreur réseau, essayer de retourner le cache même expiré
    if (useCache) {
      // D'abord essayer le cache valide
      const cached = getCached<Album[]>('albums')
      if (cached && cached.length > 0) {
        console.warn('[API] Utilisation du cache valide en raison d\'une erreur réseau')
        // Rafraîchir en arrière-plan
        refreshAlbumsInBackground()
        return cached
      }
      // Si pas de cache valide, essayer le cache expiré
      const expiredCache = getCachedEvenExpired<Album[]>('albums')
      if (expiredCache && expiredCache.length > 0) {
        console.warn('[API] Utilisation du cache expiré en raison d\'une erreur réseau')
        // Rafraîchir en arrière-plan
        refreshAlbumsInBackground()
        return expiredCache
      }
    }
    
    // Ne pas afficher d'erreur si le serveur n'est pas démarré (normal au démarrage)
    const is404Error = error.response?.status === 404
    const isLocalhost = typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1')
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || is404Error) {
      if (is404Error && isLocalhost) {
        console.warn('[API] Serveur backend non démarré. Démarrez-le avec: cd server && npm run dev')
      } else {
        console.warn('[API] Serveur backend non disponible:', error.message)
      }
    } else {
      console.error('[API] Erreur lors de la récupération des albums:', error)
    }
    // Retourner un tableau vide au lieu de lancer l'erreur (comme getArtists)
    // Cela permet à la page de s'afficher immédiatement avec le cache
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
      { timeout: 60000 } // Augmenté à 60 secondes pour Railway
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
      timeout: 60000, // Augmenté à 60 secondes pour Railway
      // Note: Le navigateur gère automatiquement Accept-Encoding
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
    // Inclure les albums où l'artiste est l'albumArtist OU où l'artiste apparaît dans les pistes (compilations)
    const albumIdsWithArtistTracks = new Set(
      allTracks
        .filter(track => track.artist.toLowerCase().includes(searchTerm))
        .map(track => track.albumId)
    )
    
    const filteredAlbums = allAlbums.filter(album => 
      album.title.toLowerCase().includes(searchTerm) ||
      album.artist.toLowerCase().includes(searchTerm) ||
      (album.genre && album.genre.toLowerCase().includes(searchTerm)) ||
      albumIdsWithArtistTracks.has(album.id) // Inclure les compilations où l'artiste apparaît
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
  // Si le cache existe, retourner immédiatement (chargement instantané)
  const cached = getCached<Artist[]>('artists')
  if (cached && cached.length > 0) {
    // Rafraîchir en arrière-plan sans bloquer
    refreshArtistsInBackground().catch(() => {
      // Ignorer les erreurs en arrière-plan
    })
    return cached
  }
  
  try {
    const response = await axios.get<{ artists: Artist[] }>(`${API_BASE_URL}/music/artists`, {
      timeout: 60000, // Augmenté à 60 secondes pour Railway
      // Note: Le navigateur gère automatiquement Accept-Encoding
    })
    const artists = response.data.artists
    
    // Mettre en cache seulement si succès et non vide
    if (artists.length > 0) {
      setCached('artists', artists)
    }
    
    return artists
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré
    // D'abord essayer le cache valide
    const cached = getCached<Artist[]>('artists')
    if (cached && cached.length > 0) {
      refreshArtistsInBackground()
      return cached
    }
    // Si pas de cache valide, essayer le cache expiré
    const expiredCache = getCachedEvenExpired<Artist[]>('artists')
      if (expiredCache && expiredCache.length > 0) {
      refreshArtistsInBackground()
      return expiredCache
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
export async function getGenres(useCache: boolean = true): Promise<Genre[]> {
  // Si le cache est activé, retourner immédiatement le cache s'il existe (chargement instantané)
  if (useCache) {
    const cached = getCached<Genre[]>('genres')
      if (cached && cached.length > 0) {
      // Rafraîchir en arrière-plan sans bloquer
      refreshGenresInBackground().catch(() => {
        // Ignorer les erreurs en arrière-plan
      })
      return cached
    }
  }
  
  try {
    const response = await axios.get<{ genres: Genre[] }>(`${API_BASE_URL}/music/genres`, {
      timeout: 20000, // Timeout augmenté à 20 secondes pour Railway (peut être lent au démarrage)
      // Note: Le navigateur gère automatiquement Accept-Encoding
    })
    const genres = response.data.genres
    
    // Mettre en cache seulement si succès et non vide
    if (useCache && genres.length > 0) {
      setCached('genres', genres)
    }
    
    return genres
  } catch (error: any) {
    // Si erreur, essayer le cache même expiré (PRIORITÉ ABSOLUE)
    if (useCache) {
      // D'abord essayer le cache valide
      const cached = getCached<Genre[]>('genres')
      if (cached && cached.length > 0) {
        refreshGenresInBackground().catch(() => {})
        return cached
      }
      // Si pas de cache valide, essayer le cache expiré (même très ancien)
      const expiredCache = getCachedEvenExpired<Genre[]>('genres')
      if (expiredCache && expiredCache.length > 0) {
        refreshGenresInBackground().catch(() => {})
        return expiredCache
      }
    }
    // Si pas de cache du tout, retourner tableau vide
    return []
  }
}

/**
 * Fonction utilitaire pour séparer les genres multiples (séparés par virgule)
 */
export function splitGenres(genreString: string | undefined): string[] {
  if (!genreString || genreString.trim() === '') {
    return []
  }
  return genreString
    .split(',')
    .map(genre => genre.trim())
    .filter(genre => genre.length > 0)
}

/**
 * Fonction utilitaire pour générer un ID de genre à partir d'un nom
 */
export function generateGenreId(genreName: string): string {
  return genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Vérifie si un album appartient à un genre donné (en tenant compte des genres multiples)
 */
export function albumBelongsToGenre(album: Album, genreId: string): boolean {
  if (!album.genre) return false
  
  const genreList = splitGenres(album.genre)
  return genreList.some(genreName => {
    const albumGenreId = generateGenreId(genreName)
    return albumGenreId === genreId
  })
}

/**
 * Récupère les albums d'un genre
 */
export async function getGenreAlbums(genreId: string): Promise<Album[]> {
  try {
    const allAlbums = await getAlbums()
    return allAlbums.filter(album => {
      if (!album.genre) return false
      
      // Séparer les genres multiples (ex: "Rock, Pop" -> ["Rock", "Pop"])
      const genreList = splitGenres(album.genre)
      
      // Vérifier si l'un des genres de l'album correspond au genreId recherché
      return genreList.some(genreName => {
        const albumGenreId = generateGenreId(genreName)
        return albumGenreId === genreId
      })
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des albums du genre:', error)
    return []
  }
}

/**
 * Supprime des albums de la bibliothèque
 */
export async function deleteAlbums(albumIds: string[]): Promise<Album[]> {
  try {
    const response = await axios.delete<{
      success: boolean
      message?: string
      error?: string
      albums?: Album[]
    }>(
      `${API_BASE_URL}/music/albums`,
      {
        data: { albumIds },
        timeout: 10000,
      }
    )
    if (!response.data.success) {
      throw new Error(response.data.error || 'Erreur lors de la suppression des albums')
    }
    
    // Invalider les caches
    removeCached('artists')
    removeCached('genres')
    // Invalider aussi les caches des pistes des albums supprimés
    albumIds.forEach(albumId => {
      removeCached(`album_tracks_${albumId}`)
    })
    
    // Mettre à jour le cache avec les albums restants si fournis par le serveur
    const remainingAlbums = response.data.albums || []
    if (remainingAlbums.length > 0) {
      try {
        setCached('albums', remainingAlbums)
      } catch (cacheError) {
        // Si le cache échoue, continuer sans cache
        console.warn('[API] Impossible de mettre à jour le cache après suppression')
      }
    } else {
      // Si pas d'albums retournés, invalider le cache
      removeCached('albums')
    }
    
    return remainingAlbums
  } catch (error: any) {
    console.error('Erreur lors de la suppression des albums:', error)
    throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la suppression des albums')
  }
}

/**
 * Ajoute de la musique depuis un lien Google Drive
 */
/**
 * Ré-analyse tous les fichiers existants pour mettre à jour les tags TPE2, TPE3, TPE4
 */
export async function reanalyzeTags(): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/music/reanalyze-tags`,
      {},
      { timeout: 600000 } // 10 minutes pour la ré-analyse complète
    )
    
    // Invalider le cache après ré-analyse
    if (response.data.success) {
      removeCached('albums')
      removeCached('tracks')
      removeCached('artists')
    }
    
    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la ré-analyse:', error)
    return {
      success: false,
      message: error.response?.data?.error || error.message || 'Erreur lors de la ré-analyse',
      stats: {}
    }
  }
}

/**
 * Scanne un dossier de musique via son chemin (depuis le serveur local uniquement)
 */
/**
 * Signale qu'un utilisateur est actif (heartbeat)
 */
export async function sendActiveUserHeartbeat(): Promise<void> {
  try {
    // Générer un ID de session unique si ce n'est pas déjà fait
    if (!sessionStorage.getItem('userSessionId')) {
      const sessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('userSessionId', sessionId)
    }
    
    const sessionId = sessionStorage.getItem('userSessionId')
    
    await axios.post(
      `${API_BASE_URL}/music/active-users/heartbeat`,
      {},
      {
        headers: {
          'X-Session-Id': sessionId || undefined,
        },
        timeout: 15000, // 15 secondes pour Railway
      }
    )
  } catch (error) {
    // Ignorer silencieusement les erreurs de heartbeat
    // pour ne pas polluer la console
  }
}

/**
 * Récupère le nombre d'utilisateurs actifs
 */
export async function getActiveUsersCount(): Promise<number> {
  try {
    const response = await axios.get<{ count: number }>(
      `${API_BASE_URL}/music/active-users/count`,
      {
        timeout: 15000, // 15 secondes pour Railway
      }
    )
    return response.data.count || 0
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'utilisateurs actifs:', error)
    return 0
  }
}

export async function scanMusicFolder(folderPath: string): Promise<ScanResult> {
  try {
    const response = await axios.post<ScanResult>(
      `${API_BASE_URL}/music/scan-path`,
      { folderPath },
      { timeout: 300000 } // 5 minutes pour les gros dossiers
    )
    const result = response.data
    
    // Mettre à jour le cache après scan
    if (result.success) {
      try {
        const updatedAlbums = await getAlbums(false) // Forcer le rechargement
        if (updatedAlbums.length > 0) {
          setCached('albums', updatedAlbums)
        }
      } catch (error) {
        console.warn('[SCAN FOLDER] Erreur lors du rechargement, conservation du cache existant')
      }
    }
    
    return result
  } catch (error: any) {
    console.error('Erreur lors du scan du dossier:', error)
    throw new Error(error.response?.data?.error || error.message || 'Erreur lors du scan du dossier')
  }
}

export async function addMusicFromGoogleDrive(url: string, isCompilation: boolean = false): Promise<GoogleDriveAddResult> {
  try {
    const response = await axios.post<GoogleDriveAddResult>(
      `${API_BASE_URL}/music/add-from-google-drive`,
      { url, isCompilation },
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

