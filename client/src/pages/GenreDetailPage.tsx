import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'
import { getGenres, getGenreAlbums, getAlbumTracks, getAlbums, Genre, buildImageUrl, albumBelongsToGenre } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import AlbumGrid from '../components/AlbumGrid'
import './GenreDetailPage.css'

function GenreDetailPage() {
  const { genreId } = useParams<{ genreId: string }>()
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [genre, setGenre] = useState<Genre | null>(null)
  const [albums, setAlbums] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPlay, setLoadingPlay] = useState(false)

  useEffect(() => {
    if (genreId) {
      loadGenreDetails()
    }
  }, [genreId])

  const loadGenreDetails = async () => {
    if (!genreId) return

    setLoading(true)
    try {
      // Charger tous les genres pour trouver celui qui correspond
      const allGenres = await getGenres()
      const genreData = allGenres.find(g => g.id === genreId)
      
      if (genreData) {
        setGenre(genreData)
        // Charger les albums du genre
        const genreAlbums = await getGenreAlbums(genreId)
        setAlbums(genreAlbums)
      } else {
        navigate('/genres')
      }
    } catch (error) {
      console.error('Erreur lors du chargement du genre:', error)
      navigate('/genres')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayGenre = async () => {
    if (!genre || albums.length === 0) return

    setLoadingPlay(true)
    try {
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
        const allAlbums = await getAlbums()
        const currentAlbum = allAlbums.find(a => a.id === currentTrack?.albumId)
        const isGenrePlaying = currentAlbum ? albumBelongsToGenre(currentAlbum, genre.id) : false
        
        if (isGenrePlaying) {
          togglePlay()
        } else {
          playAlbum(albums[0]?.id || genre.id, allTracks)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pistes:', error)
    } finally {
      setLoadingPlay(false)
    }
  }

  if (loading) {
    return (
      <Container fluid className="genre-detail-page">
        <Row>
          <Col>
            <div className="genre-loading">
              <i className="bi bi-arrow-repeat spinning"></i>
              <p>Chargement du genre...</p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  if (!genre) {
    return (
      <Container fluid className="genre-detail-page">
        <Row>
          <Col>
            <div className="genre-not-found">
              <i className="bi bi-exclamation-triangle"></i>
              <h2>Genre non trouvé</h2>
              <button className="btn btn-primary" onClick={() => navigate('/genres')}>
                Retour aux genres
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  // Trouver l'image du genre (couverture du premier album)
  const genreImage = albums.length > 0 ? albums[0]?.coverArt : null
  const isGenrePlaying = currentTrack && (() => {
    const currentAlbum = albums.find(a => a.id === currentTrack.albumId)
    if (!currentAlbum) return false
    return albumBelongsToGenre(currentAlbum, genre.id)
  })()

  return (
    <Container fluid className="genre-detail-page">
      <Row>
        <Col>
          <div className="genre-header">
            <div className="genre-header-content">
              {genreImage && (
                <div className="genre-cover">
                  <img 
                    src={buildImageUrl(genreImage) || ''} 
                    alt={genre.name}
                    className="genre-cover-img"
                  />
                </div>
              )}
              <div className="genre-info">
                <h1 className="genre-title">
                  <i className="bi bi-tags me-2"></i>
                  {genre.name}
                </h1>

                {/* Informations du genre */}
                <div className="genre-stats">
                  {genre.albumCount !== undefined && (
                    <span className="genre-stat">
                      {genre.albumCount} {genre.albumCount === 1 ? 'album' : 'albums'}
                    </span>
                  )}
                  {genre.trackCount !== undefined && (
                    <span className="genre-stat">
                      {genre.trackCount} {genre.trackCount === 1 ? 'piste' : 'pistes'}
                    </span>
                  )}
                </div>
                
                <button 
                  className="genre-play-button" 
                  onClick={handlePlayGenre}
                  disabled={loadingPlay || albums.length === 0}
                  aria-label={isGenrePlaying ? 'Pause' : 'Lire le genre'}
                >
                  {loadingPlay ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                  ) : (
                    <i className={`bi ${isGenrePlaying && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                  )}
                  <span className="ms-2">{isGenrePlaying && isPlaying ? 'Pause' : 'Lire'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Albums du genre */}
          {albums.length > 0 ? (
            <div className="genre-albums-section">
              <h2 className="section-title">
                <i className="bi bi-vinyl me-2"></i>
                Albums ({albums.length})
              </h2>
              <AlbumGrid albums={albums} />
            </div>
          ) : (
            <div className="genre-no-albums">
              <i className="bi bi-vinyl"></i>
              <p>Aucun album disponible pour ce genre</p>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default GenreDetailPage

