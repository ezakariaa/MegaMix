import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Genre, getGenreAlbums, getAlbumTracks, getAlbums, Album, albumBelongsToGenre, buildImageUrl } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import './AlbumGrid.css' // Réutiliser les styles d'AlbumGrid

interface GenreGridProps {
  genres: Genre[]
}

function GenreGrid({ genres }: GenreGridProps) {
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [loadingGenreId, setLoadingGenreId] = useState<string | null>(null)
  const [allAlbums, setAllAlbums] = useState<Album[]>([])

  // Charger tous les albums pour trouver les couvertures (utilise le cache en priorité)
  useEffect(() => {
    // Utiliser le cache pour un chargement rapide
    getAlbums(true).then(setAllAlbums).catch(console.error)
  }, [])

  // Créer un map pour trouver rapidement la couverture du premier album de chaque genre
  const genreCoverMap = useMemo(() => {
    const map = new Map<string, { coverArt: string | null; albumId?: string }>()
    genres.forEach(genre => {
      const firstAlbum = allAlbums.find(album => albumBelongsToGenre(album, genre.id))
      if (firstAlbum) {
        map.set(genre.id, { 
          coverArt: firstAlbum.coverArt || null,
          albumId: firstAlbum.id
        })
      } else {
        map.set(genre.id, { coverArt: null })
      }
    })
    return map
  }, [genres, allAlbums])

  const handleGenreClick = (genre: Genre) => {
    navigate(`/genre/${genre.id}`)
  }

  const handlePlayClick = async (e: React.MouseEvent, genre: Genre) => {
    e.stopPropagation()

    if (loadingGenreId === genre.id) return

    setLoadingGenreId(genre.id)
    try {
      // Récupérer tous les albums du genre
      const albums = await getGenreAlbums(genre.id)
      
      // Récupérer toutes les pistes de tous les albums du genre
      const allTracks = []
      for (const album of albums) {
        const tracks = await getAlbumTracks(album.id)
        const playerTracks = tracks.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          artistId: track.artistId,
          album: track.album,
          albumId: track.albumId,
          coverArt: album.coverArt,
          duration: track.duration,
          filePath: track.filePath,
        }))
        allTracks.push(...playerTracks)
      }

      if (allTracks.length > 0) {
        // Vérifier si une piste de ce genre est en cours de lecture
        // On compare par le genre de la piste actuelle
        const currentAlbum = currentTrack?.albumId 
          ? allAlbums.find(a => a.id === currentTrack.albumId)
          : null
        
        const isGenrePlaying = currentAlbum ? albumBelongsToGenre(currentAlbum, genre.id) : false
        
        if (isGenrePlaying) {
          togglePlay()
        } else {
          // Jouer toutes les pistes du genre
          playAlbum(albums[0]?.id || genre.id, allTracks)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pistes du genre:', error)
    } finally {
      setLoadingGenreId(null)
    }
  }

  if (genres.length === 0) {
    return (
      <div className="album-grid-empty">
        <i className="bi bi-tags"></i>
        <p>Aucun genre dans votre bibliothèque</p>
        <p className="text-muted">Ajoutez des albums pour voir vos genres</p>
      </div>
    )
  }

  return (
    <div className="album-grid">
      {genres.map((genre) => {
        // Utiliser la couverture du premier album du genre
        const genreImageData = genreCoverMap.get(genre.id)
        const genreImage = genreImageData?.coverArt
        const albumId = genreImageData?.albumId

        return (
          <div 
            key={genre.id} 
            className="album-card"
            onClick={() => handleGenreClick(genre)}
          >
            <div className="album-cover-container">
              {genreImage ? (
                <img 
                  src={buildImageUrl(genreImage, albumId) || genreImage} 
                  alt={genre.name}
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
                        placeholder.innerHTML = '<i class="bi bi-music-note-beamed"></i>'
                        container.appendChild(placeholder)
                      }
                    }
                  }}
                />
              ) : (
                <div className="album-cover-placeholder">
                  <i className="bi bi-music-note-beamed"></i>
                </div>
              )}
              <div className="album-cover-overlay">
                <button
                  className="play-button"
                  onClick={(e) => handlePlayClick(e, genre)}
                  aria-label="Lecture"
                >
                  {loadingGenreId === genre.id ? (
                    <div className="spinner-border spinner-border-sm text-white" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                  ) : (
                    <i className="bi bi-play-fill"></i>
                  )}
                </button>
              </div>
            </div>
            <div className="album-info">
              <h3 className="album-title" title={genre.name}>
                {genre.name}
              </h3>
              {genre.trackCount && (
                <p className="album-track-count">
                  {genre.trackCount} {genre.trackCount === 1 ? 'piste' : 'pistes'}
                </p>
              )}
              {genre.albumCount && (
                <p className="album-year">
                  {genre.albumCount} {genre.albumCount === 1 ? 'album' : 'albums'}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default GenreGrid




