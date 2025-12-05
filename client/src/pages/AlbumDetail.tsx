import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { Album, getAlbumTracks, Track, buildImageUrl } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import { getAlbums } from '../services/musicService'
import './AlbumDetail.css'

function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>()
  const navigate = useNavigate()
  const { playAlbum, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)

  useEffect(() => {
    if (albumId) {
      loadAlbumDetails()
    }
  }, [albumId])

  useEffect(() => {
    if (currentTrack) {
      setPlayingTrackId(currentTrack.id)
    } else {
      setPlayingTrackId(null)
    }
  }, [currentTrack])

  const loadAlbumDetails = async () => {
    if (!albumId) return

    setLoading(true)
    try {
      // Charger l'album et les pistes en parallèle pour optimiser le chargement
      const [allAlbums, albumTracks] = await Promise.all([
        getAlbums(), // Utilise le cache si disponible
        getAlbumTracks(albumId) // Charger les pistes en parallèle
      ])
      
      const foundAlbum = allAlbums.find(a => a.id === albumId)

      if (foundAlbum) {
        setAlbum(foundAlbum)
        // Log pour déboguer les tags
        console.log('[ALBUM DETAIL] Pistes chargées:', albumTracks.map(t => ({
          title: t.title,
          artist: t.artist,
          band: t.band,
          conductor: t.conductor,
          remixer: t.remixer
        })))
        setTracks(albumTracks)
      } else {
        console.error('Album non trouvé')
        navigate('/library')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'album:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAlbum = () => {
    if (tracks.length === 0) return

    const playerTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      artistId: track.artistId, // Ajouter artistId
      album: track.album,
      albumId: track.albumId, // Ajouter albumId
      coverArt: album?.coverArt,
      duration: track.duration,
      filePath: track.filePath,
    }))

    playAlbum(albumId!, playerTracks)
  }

  const handlePlayTrack = (track: Track) => {
    const playerTracks = tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId, // Ajouter artistId
      album: t.album,
      albumId: t.albumId, // Ajouter albumId
      coverArt: album?.coverArt,
      duration: t.duration,
      filePath: t.filePath,
    }))

    const trackIndex = tracks.findIndex(t => t.id === track.id)
    if (trackIndex >= 0) {
      // Si c'est la même piste qui est en cours, toggle play/pause
      if (currentTrack?.id === track.id) {
        togglePlay()
      } else {
        // Jouer l'album à partir de la piste sélectionnée
        playAlbum(albumId!, playerTracks, trackIndex)
      }
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalDuration = (): number => {
    return tracks.reduce((total, track) => total + track.duration, 0)
  }

  // Grouper les pistes par disque
  const groupTracksByDisc = (tracks: Track[]): Map<number | null, Track[]> => {
    const grouped = new Map<number | null, Track[]>()
    
    tracks.forEach(track => {
      const discNum = track.discNumber || null
      if (!grouped.has(discNum)) {
        grouped.set(discNum, [])
      }
      grouped.get(discNum)!.push(track)
    })
    
    // Trier les disques (null en premier, puis par numéro croissant)
    const sortedDiscs = Array.from(grouped.keys()).sort((a, b) => {
      if (a === null) return -1
      if (b === null) return 1
      return a - b
    })
    
    // Créer une nouvelle Map triée
    const sortedMap = new Map<number | null, Track[]>()
    sortedDiscs.forEach(discNum => {
      sortedMap.set(discNum, grouped.get(discNum)!)
    })
    
    return sortedMap
  }

  const tracksByDisc = groupTracksByDisc(tracks)

  if (loading) {
    return (
      <Container fluid className="album-detail-page">
        <div className="loading-spinner">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      </Container>
    )
  }

  if (!album) {
    return (
      <Container fluid className="album-detail-page">
        <div className="album-not-found">
          <p>Album non trouvé</p>
        </div>
      </Container>
    )
  }

  const totalDuration = getTotalDuration()
  const totalMinutes = Math.floor(totalDuration / 60)
  const totalSeconds = totalDuration % 60

  return (
    <Container fluid className="album-detail-page">
      {/* Header avec couverture et infos */}
      <div className="album-detail-header">
        <div className="album-detail-cover">
          {album.coverArt ? (
            <img src={buildImageUrl(album.coverArt) || ''} alt={`${album.title} - ${album.artist}`} />
          ) : (
            <div className="album-cover-placeholder-large">
              <i className="bi bi-vinyl"></i>
            </div>
          )}
        </div>
        <div className="album-detail-info">
          <h1 className="album-detail-title">{album.title}</h1>
          <div className="album-detail-meta">
            <span className="album-detail-artist">{album.artist}</span>
            {album.year && <span>• {album.year}</span>}
            <span>• {tracks.length} {tracks.length === 1 ? 'titre' : 'titres'}</span>
            {album.cdCount && album.cdCount > 1 && (
              <span> • {album.cdCount} CD{album.cdCount > 1 ? 's' : ''}</span>
            )}
            {totalDuration > 0 && (
              <span>, {totalMinutes} min {totalSeconds} s</span>
            )}
          </div>
        </div>
      </div>

      {/* Barre de contrôles */}
      <div className="album-detail-controls">
        <button
          className="album-play-button"
          onClick={handlePlayAlbum}
          aria-label="Lire l'album"
        >
          <i className={`bi ${isPlaying && playingTrackId ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
        </button>
        <button className="album-control-button" aria-label="Shuffle">
          <i className="bi bi-shuffle"></i>
        </button>
        <button className="album-control-button" aria-label="Ajouter à la playlist">
          <i className="bi bi-plus-circle"></i>
        </button>
        <button className="album-control-button" aria-label="Plus d'options">
          <i className="bi bi-three-dots"></i>
        </button>
      </div>

      {/* Liste des pistes */}
      <div className="album-tracklist">
        <div className="tracklist-header">
          <div className="tracklist-header-number">#</div>
          <div className="tracklist-header-title">Titre</div>
          <div className="tracklist-header-duration">
            <i className="bi bi-clock"></i>
          </div>
        </div>
        <div className="tracklist-body">
          {tracks.length === 0 ? (
            <div className="tracklist-empty">
              <p>Aucune piste disponible</p>
            </div>
          ) : (
            (() => {
              let globalTrackIndex = 0
              return Array.from(tracksByDisc.entries()).map(([discNumber, discTracks]) => {
                const discStartIndex = globalTrackIndex
                globalTrackIndex += discTracks.length
                
                return (
                  <div key={discNumber || 'no-disc'} className="tracklist-disc-group">
                    {discNumber !== null && (
                      <div className="tracklist-disc-header">
                        <h3 className="tracklist-disc-title">Disque {discNumber}</h3>
                      </div>
                    )}
                    {discTracks.map((track, discTrackIndex) => {
                      const globalIndex = discStartIndex + discTrackIndex
                      return (
                      <div
                        key={track.id}
                        className={`tracklist-item ${playingTrackId === track.id ? 'playing' : ''}`}
                        onClick={() => handlePlayTrack(track)}
                      >
                        <div className="tracklist-item-number">
                          {playingTrackId === track.id && isPlaying ? (
                            <i className="bi bi-pause-fill playing-icon"></i>
                          ) : (
                            <span>{globalIndex + 1}</span>
                          )}
                        </div>
                        <div className="tracklist-item-info">
                          <div className="tracklist-item-title-artist">
                            <span className="tracklist-item-title">{track.title}</span>
                            {/* Toujours afficher l'artiste de la piste (TPE1) */}
                            <span className="tracklist-item-separator"> - </span>
                            <span className="tracklist-item-artist">{track.artist}</span>
                            {/* Afficher les artistes additionnels (TPE2, TPE3, TPE4) si présents */}
                            {(track.band || track.conductor || track.remixer) && (
                              <>
                                <span className="tracklist-item-separator"> • </span>
                                <span className="tracklist-item-artist-additional">
                                  {[
                                    track.band && `Groupe: ${track.band}`,
                                    track.conductor && `Chef: ${track.conductor}`,
                                    track.remixer && `Remix: ${track.remixer}`
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="tracklist-item-duration">
                          {formatDuration(track.duration)}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )
              })
            })()
          )}
        </div>
      </div>
    </Container>
  )
}

export default AlbumDetail

