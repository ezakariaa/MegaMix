import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Artist, getArtistAlbums, getAlbumTracks, getAlbums, Album } from '../services/musicService'
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

  // Charger tous les albums pour trouver les couvertures
  useEffect(() => {
    getAlbums().then(setAllAlbums).catch(console.error)
  }, [])

  // Créer un map pour trouver rapidement la couverture du premier album de chaque artiste
  const artistCoverMap = useMemo(() => {
    const map = new Map<string, string | null>()
    artists.forEach(artist => {
      const firstAlbum = allAlbums.find(album => album.artistId === artist.id)
      map.set(artist.id, firstAlbum?.coverArt || null)
    })
    return map
  }, [artists, allAlbums])

  const handleArtistClick = (artist: Artist) => {
    // Pour l'instant, on peut naviguer vers une page de détail de l'artiste
    // Ou afficher ses albums - à implémenter plus tard
    console.log('Clic sur artiste:', artist.name)
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
        // Utiliser la couverture du premier album de l'artiste
        const artistImage = artistCoverMap.get(artist.id)

        return (
          <div 
            key={artist.id} 
            className="album-card"
            onClick={() => handleArtistClick(artist)}
          >
            <div className="album-cover-container">
              {artistImage ? (
                <img 
                  src={artistImage} 
                  alt={artist.name}
                  className="album-cover"
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

