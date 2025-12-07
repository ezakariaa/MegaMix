import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'
import { getArtistById, getArtistAlbums, getAlbumTracks, getTracks, getAlbums, Artist, buildImageUrl } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import AlbumGrid from '../components/AlbumGrid'
import './ArtistDetailPage.css'

function ArtistDetailPage() {
  const { artistId } = useParams<{ artistId: string }>()
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [albums, setAlbums] = useState<any[]>([])
  const [compilations, setCompilations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPlay, setLoadingPlay] = useState(false)

  useEffect(() => {
    if (artistId) {
      loadArtistDetails()
    }
  }, [artistId])

  const loadArtistDetails = async () => {
    if (!artistId) return

    setLoading(true)
    try {
      // Charger les détails de l'artiste, albums et pistes en parallèle
      const [artistData, allAlbums, allTracks] = await Promise.all([
        getArtistById(artistId),
        getAlbums(), // Charger tous les albums
        getTracks() // Charger toutes les pistes pour identifier les compilations
      ])
      
      if (artistData) {
        setArtist(artistData)
        
        // Séparer les albums propres de l'artiste et les compilations
        const artistOwnAlbums: any[] = []
        const compilationAlbums: any[] = []
        
        // Trouver les albums où l'artiste est l'artiste principal (albumArtist)
        artistOwnAlbums.push(...allAlbums.filter(album => album.artistId === artistId))
        
        // Trouver les compilations où l'artiste apparaît dans les pistes mais n'est pas l'artiste principal
        const artistTracks = allTracks.filter(track => track.artistId === artistId)
        const compilationAlbumIds = new Set<string>()
        
        artistTracks.forEach(track => {
          // Si l'album n'est pas un album propre de l'artiste, c'est une compilation
          const isOwnAlbum = artistOwnAlbums.some(album => album.id === track.albumId)
          if (!isOwnAlbum && track.albumId) {
            compilationAlbumIds.add(track.albumId)
          }
        })
        
        // Récupérer les albums de compilation depuis tous les albums
        compilationAlbums.push(...allAlbums.filter(album => 
          compilationAlbumIds.has(album.id) && album.artistId !== artistId
        ))
        
        setAlbums(artistOwnAlbums)
        setCompilations(compilationAlbums)
      } else {
        navigate('/artists')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'artiste:', error)
      navigate('/artists')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayArtist = async () => {
    if (!artist || (albums.length === 0 && compilations.length === 0)) return

    setLoadingPlay(true)
    try {
      // Récupérer toutes les pistes de tous les albums de l'artiste (albums + compilations)
      const allTracks = []
      const allArtistAlbums = [...albums, ...compilations]
      for (const album of allArtistAlbums) {
        const tracks = await getAlbumTracks(album.id)
        // Filtrer pour ne garder que les pistes de cet artiste
        const artistTracks = tracks.filter(track => track.artistId === artist.id)
        const playerTracks = artistTracks.map(track => ({
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
        const isArtistPlaying = currentTrack?.artistId === artist.id
        
        if (isArtistPlaying) {
          togglePlay()
        } else {
          playAlbum(albums[0]?.id || artist.id, allTracks)
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
      <Container fluid className="artist-detail-page">
        <Row>
          <Col>
            <div className="artist-loading">
              <i className="bi bi-arrow-repeat spinning"></i>
              <p>Chargement de l'artiste...</p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  if (!artist) {
    return (
      <Container fluid className="artist-detail-page">
        <Row>
          <Col>
            <div className="artist-not-found">
              <i className="bi bi-exclamation-triangle"></i>
              <h2>Artiste non trouvé</h2>
              <button className="btn btn-primary" onClick={() => navigate('/artists')}>
                Retour aux artistes
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  const isArtistPlaying = currentTrack?.artistId === artist.id

  return (
    <Container fluid className="artist-detail-page">
      <Row>
        <Col>
          <div className="artist-header">
            <h1 className="artist-title">
              <i className="bi bi-person-circle me-2"></i>
              {artist.name}
            </h1>

            {/* Informations de l'artiste */}
            <div className="artist-info">
              <div className="artist-stats">
                {artist.albumCount !== undefined && (
                  <span className="artist-stat">
                    {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                  </span>
                )}
                {artist.trackCount !== undefined && (
                  <span className="artist-stat">
                    {artist.trackCount} {artist.trackCount === 1 ? 'piste' : 'pistes'}
                  </span>
                )}
                {artist.genre && (
                  <span className="artist-stat artist-genre">{artist.genre}</span>
                )}
              </div>
              
              <button 
                className="artist-play-button" 
                onClick={handlePlayArtist}
                disabled={loadingPlay || (albums.length === 0 && compilations.length === 0)}
                aria-label={isArtistPlaying ? 'Pause' : 'Lire l\'artiste'}
              >
                {loadingPlay ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                ) : (
                  <i className={`bi ${isArtistPlaying && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                )}
                <span className="ms-2">{isArtistPlaying && isPlaying ? 'Pause' : 'Lire'}</span>
              </button>
            </div>

            {/* Biographie */}
            {artist.biography && (
              <div className="artist-biography">
                <h3>À propos</h3>
                <p>{artist.biography}</p>
              </div>
            )}
          </div>

          {/* Albums de l'artiste */}
          {albums.length > 0 && (
            <div className="artist-albums-section">
              <h2 className="section-title">
                <i className="bi bi-vinyl me-2"></i>
                Albums ({albums.length})
              </h2>
              <AlbumGrid albums={albums} />
            </div>
          )}

          {/* Compilations où l'artiste apparaît */}
          {compilations.length > 0 && (
            <div className="artist-compilations-section">
              <h2 className="section-title">
                <i className="bi bi-collection me-2"></i>
                Compilations ({compilations.length})
              </h2>
              <AlbumGrid albums={compilations} />
            </div>
          )}

          {/* Message si aucun album ni compilation */}
          {albums.length === 0 && compilations.length === 0 && (
            <div className="artist-no-albums">
              <i className="bi bi-vinyl"></i>
              <p>Aucun album disponible pour cet artiste</p>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default ArtistDetailPage

