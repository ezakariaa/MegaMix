import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Artist, getArtistAlbums, getAlbumTracks, buildImageUrl } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import './AlbumGrid.css' // Réutiliser les styles d'AlbumGrid

interface ArtistGridProps {
  artists: Artist[]
}

function ArtistGrid({ artists }: ArtistGridProps) {
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [loadingArtistId, setLoadingArtistId] = useState<string | null>(null)

  const handleArtistClick = (artist: Artist) => {
    // Naviguer vers la page de recherche avec le nom de l'artiste
    // Cela affichera les albums, compilations et pistes de cet artiste
    navigate(`/search?q=${encodeURIComponent(artist.name)}`)
  }

  const handlePlayClick = async (e: React.MouseEvent, artist: Artist) => {
    e.stopPropagation()

    if (loadingArtistId === artist.id) return

    setLoadingArtistId(artist.id)
    try {
      // Récupérer tous les albums de l'artiste
      const albums = await getArtistAlbums(artist.id)
      
      // Récupérer toutes les pistes de tous les albums de l'artiste
      const allTracks = []
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
        allTracks.push(...playerTracks)
      }

      if (allTracks.length > 0) {
        // Vérifier si une piste de cet artiste est en cours de lecture
        const isArtistPlaying = currentTrack?.artistId === artist.id
        
        if (isArtistPlaying) {
          togglePlay()
        } else {
          // Jouer toutes les pistes de l'artiste
          playAlbum(albums[0]?.id || artist.id, allTracks)
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

        return (
          <div 
            key={artist.id} 
            className="album-card"
            onClick={() => handleArtistClick(artist)}
          >
            <div className="album-cover-container">
              {artistImage ? (
                <img 
                  src={buildImageUrl(artistImage) || ''} 
                  alt={artist.name}
                  className="album-cover"
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
              {artist.trackCount && (
                <p className="album-track-count">
                  {artist.trackCount} {artist.trackCount === 1 ? 'piste' : 'pistes'}
                </p>
              )}
              {artist.albumCount && (
                <p className="album-year">
                  {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ArtistGrid

