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

    // Nettoyer les anciens liens de préchargement avant d'en ajouter de nouveaux
    const existingLinks = document.querySelectorAll('link[rel="preload"][as="image"][data-artist-preload]')
    existingLinks.forEach(link => link.remove())

    // Précharger toutes les images en parallèle pour un chargement rapide
    const preloadImages = () => {
      artists.forEach((artist) => {
        if (artist.coverArt) {
          const imageUrl = buildImageUrl(artist.coverArt)
          if (imageUrl) {
            // Créer un objet Image pour forcer le préchargement dans le cache du navigateur
            const img = new Image()
            img.src = imageUrl
            
            // Précharger via link rel="preload" pour les navigateurs modernes
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = imageUrl
            link.setAttribute('data-artist-preload', artist.id) // Marquer pour faciliter le nettoyage
            document.head.appendChild(link)
          }
        }
      })
    }

    // Précharger immédiatement
    preloadImages()
    
    // Cleanup function pour nettoyer les liens lors du démontage
    return () => {
      const links = document.querySelectorAll('link[rel="preload"][as="image"][data-artist-preload]')
      links.forEach(link => link.remove())
    }
  }, [artists])

  // Charger tous les albums et pistes pour vérifier les compilations EN ARRIÈRE-PLAN
  // Ne pas bloquer l'affichage initial
  useEffect(() => {
    const loadData = async () => {
      setCompilationsLoading(true)
      try {
        // Utiliser requestIdleCallback pour ne pas bloquer le rendu initial
        const scheduleLoad = () => {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(async () => {
              const [albums, tracks] = await Promise.all([
                getAlbums(),
                getTracks()
              ])
              setAllAlbums(albums)
              setAllTracks(tracks)
              setCompilationsLoading(false)
            }, { timeout: 3000 })
          } else {
            // Fallback : charger après un court délai
            setTimeout(async () => {
              const [albums, tracks] = await Promise.all([
                getAlbums(),
                getTracks()
              ])
              setAllAlbums(albums)
              setAllTracks(tracks)
              setCompilationsLoading(false)
            }, 500)
          }
        }
        scheduleLoad()
      } catch (error) {
        console.error('Erreur lors du chargement des albums et pistes:', error)
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
    // Sauvegarder l'ID de l'artiste et la position de scroll avant de naviguer
    const scrollPosition = window.scrollY || window.pageYOffset || 0
    const mainContent = document.querySelector('.main-content') as HTMLElement
    const mainContentScroll = mainContent ? mainContent.scrollTop : 0
    
    // Trouver la position de la carte de l'artiste
    const artistCard = document.querySelector(`[data-artist-id="${artist.id}"]`) as HTMLElement
    const cardOffsetTop = artistCard ? artistCard.getBoundingClientRect().top + scrollPosition : scrollPosition
    
    sessionStorage.setItem('artistsScrollPosition', JSON.stringify({
      windowScroll: scrollPosition,
      mainContentScroll: mainContentScroll,
      cardOffsetTop: cardOffsetTop,
      artistId: artist.id,
      timestamp: Date.now()
    }))
    
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

  // Afficher le message "Aucun artiste" seulement s'il n'y a vraiment aucun artiste
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

        // Pas de logs pour optimiser les performances

        return (
          <div 
            key={artist.id} 
            className="album-card"
            data-artist-id={artist.id}
            onClick={() => handleArtistClick(artist)}
          >
            <div className="album-cover-container">
              {artistImage && builtImageUrl ? (
                <img 
                  src={builtImageUrl} 
                  alt={artist.name}
                  className="album-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
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
                  className="album-play-button-overlay"
                  onClick={(e) => handlePlayClick(e, artist)}
                  aria-label={currentTrack?.artistId === artist.id && isPlaying ? 'Pause' : 'Lecture'}
                >
                  {loadingArtistId === artist.id ? (
                    <div className="spinner-border spinner-border-sm" role="status">
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

