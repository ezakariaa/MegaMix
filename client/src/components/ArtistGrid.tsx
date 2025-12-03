import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Artist, getArtistAlbums, getAlbumTracks, buildImageUrl, getAlbums, getTracks, Album, Track } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import './AlbumGrid.css' // Réutiliser les styles d'AlbumGrid

interface ArtistGridProps {
  artists: Artist[]
}

function ArtistGrid({ artists }: ArtistGridProps) {
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [loadingArtistId, setLoadingArtistId] = useState<string | null>(null)
  const [allAlbums, setAllAlbums] = useState<Album[]>([])
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [compilationsLoading, setCompilationsLoading] = useState(true)

  // Précharger toutes les images en parallèle dès que les artistes sont disponibles
  useEffect(() => {
    if (artists.length === 0) return

    // Précharger toutes les images en parallèle pour un chargement rapide
    const preloadImages = () => {
      artists.forEach((artist) => {
        if (artist.coverArt) {
          const imageUrl = buildImageUrl(artist.coverArt)
          if (imageUrl) {
            // Créer un objet Image pour forcer le préchargement dans le cache du navigateur
            const img = new Image()
            img.src = imageUrl
            // Optionnel : précharger aussi via link rel="preload" pour les navigateurs modernes
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = imageUrl
            document.head.appendChild(link)
          }
        }
      })
    }

    // Précharger immédiatement
    preloadImages()
  }, [artists])

  // Charger tous les albums et pistes pour vérifier les compilations
  useEffect(() => {
    const loadData = async () => {
      setCompilationsLoading(true)
      try {
        const [albums, tracks] = await Promise.all([
          getAlbums(),
          getTracks()
        ])
        setAllAlbums(albums)
        setAllTracks(tracks)
      } catch (error) {
        console.error('Erreur lors du chargement des albums et pistes:', error)
      } finally {
        setCompilationsLoading(false)
      }
    }
    loadData()
  }, [])

  // Fonction pour vérifier si un album est une compilation
  const isCompilationAlbum = (album: Album): boolean => {
    const artistLower = album.artist.toLowerCase()
    return artistLower.includes('various') || 
           artistLower.includes('compilation') ||
           artistLower.includes('various artists') ||
           artistLower === 'various'
  }

  // Calculer les compilations pour chaque artiste
  const artistCompilations = useMemo(() => {
    const compilationsMap = new Map<string, number>()
    
    artists.forEach(artist => {
      let compilationCount = 0
      
      // Trouver toutes les compilations où l'artiste apparaît
      allAlbums.forEach(album => {
        if (isCompilationAlbum(album)) {
          // Vérifier si l'artiste apparaît dans les pistes de cette compilation
          const hasArtistTracks = allTracks.some(track => 
            track.albumId === album.id && track.artistId === artist.id
          )
          
          if (hasArtistTracks) {
            compilationCount++
          }
        }
      })
      
      compilationsMap.set(artist.id, compilationCount)
    })
    
    return compilationsMap
  }, [artists, allAlbums, allTracks])

  const handleArtistClick = (artist: Artist) => {
    // Naviguer vers la page de détail de l'artiste
    navigate(`/artist/${artist.id}`)
  }

  const handlePlayClick = async (e: React.MouseEvent, artist: Artist) => {
    e.stopPropagation()

    if (loadingArtistId === artist.id) return

    setLoadingArtistId(artist.id)
    try {
      // Récupérer tous les albums de l'artiste
      const albums = await getArtistAlbums(artist.id)
      
      // Récupérer toutes les pistes de tous les albums de l'artiste
      const playerTracksList = []
      for (const album of albums) {
        const tracks = await getAlbumTracks(album.id)
        const playerTracks = tracks.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          artistId: track.artistId, // Ajouter artistId
          album: track.album,
          albumId: track.albumId, // Ajouter albumId
          coverArt: album.coverArt,
          duration: track.duration,
          filePath: track.filePath,
        }))
        playerTracksList.push(...playerTracks)
      }

      if (playerTracksList.length > 0) {
        // Vérifier si une piste de cet artiste est en cours de lecture
        const isArtistPlaying = currentTrack?.artistId === artist.id
        
        if (isArtistPlaying) {
          togglePlay()
        } else {
          // Jouer toutes les pistes de l'artiste
          playAlbum(albums[0]?.id || artist.id, playerTracksList)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pistes de l\'artiste:', error)
    } finally {
      setLoadingArtistId(null)
    }
  }

  if (artists.length === 0) {
    return (
      <div className="album-grid-empty">
        <i className="bi bi-person-badge"></i>
        <p>Aucun artiste dans votre bibliothèque</p>
        <p className="text-muted">Ajoutez des albums pour voir vos artistes</p>
      </div>
    )
  }

  return (
    <div className="album-grid">
      {artists.map((artist) => {
        // Utiliser UNIQUEMENT la photo d'artiste (pas de fallback vers couverture d'album)
        const artistImage = artist.coverArt
        const builtImageUrl = artistImage ? buildImageUrl(artistImage) : null

        if (artistImage) {
          console.log(`[ArtistGrid] Artiste: ${artist.name}`)
          console.log(`[ArtistGrid]   coverArt (brut): ${artistImage}`)
          console.log(`[ArtistGrid]   URL construite: ${builtImageUrl}`)
        }

        return (
          <div 
            key={artist.id} 
            className="album-card"
            onClick={() => handleArtistClick(artist)}
          >
            <div className="album-cover-container">
              {artistImage && builtImageUrl ? (
                <img 
                  src={builtImageUrl} 
                  alt={artist.name}
                  className="album-cover"
                  loading="eager"
                  decoding="async"
                  onLoad={() => {
                    console.log(`[ArtistGrid] ✓ Image chargée avec succès pour ${artist.name}`)
                  }}
                  onError={(e) => {
                    console.error(`[ArtistGrid] ✗ Erreur chargement image pour ${artist.name}:`, {
                      originalUrl: artistImage,
                      builtUrl: builtImageUrl
                    })
                    // En cas d'erreur, afficher le placeholder
                    const target = e.target as HTMLImageElement
                    if (target) {
                      target.style.display = 'none'
                      const container = target.parentElement
                      if (container && !container.querySelector('.album-cover-placeholder')) {
                        const placeholder = document.createElement('div')
                        placeholder.className = 'album-cover-placeholder'
                        placeholder.innerHTML = '<i class="bi bi-person-circle"></i>'
                        container.appendChild(placeholder)
                      }
                    }
                  }}
                />
              ) : (
                <div className="album-cover-placeholder">
                  <i className="bi bi-person-circle"></i>
                </div>
              )}
              <div className="album-cover-overlay">
                <button
                  className="play-button"
                  onClick={(e) => handlePlayClick(e, artist)}
                  aria-label={currentTrack?.artistId === artist.id && isPlaying ? 'Pause' : 'Lecture'}
                >
                  {loadingArtistId === artist.id ? (
                    <div className="spinner-border spinner-border-sm text-white" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                  ) : (
                    <i className={`bi ${currentTrack?.artistId === artist.id && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                  )}
                </button>
              </div>
            </div>
            <div className="album-info">
              <h3 className="album-title" title={artist.name}>
                {artist.name}
              </h3>
              {artist.trackCount !== undefined && artist.trackCount > 0 && (
                <p className="album-track-count">
                  {artist.trackCount} {artist.trackCount === 1 ? 'piste' : 'pistes'}
                </p>
              )}
              {artist.albumCount !== undefined && (
                <p className="album-track-count">
                  {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                </p>
              )}
              <p className="album-year">
                {compilationsLoading ? (
                  'Synchronisation...'
                ) : (
                  <>
                    {artistCompilations.get(artist.id) || 0} compilation{(artistCompilations.get(artist.id) || 0) !== 1 ? 's' : ''}
                  </>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ArtistGrid

