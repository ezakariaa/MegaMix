import { useState, useEffect } from 'react'
import { usePlayer } from '../contexts/PlayerContext'
import { getArtistById, getArtistAlbums, getAlbumTracks, Artist, buildImageUrl } from '../services/musicService'
import './RightSidebar.css'

function RightSidebar() {
  const { currentTrack, playAlbum, isPlaying, togglePlay, recentlyPlayed, playTrack } = usePlayer()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loadingArtist, setLoadingArtist] = useState(false)
  const [loadingPlay, setLoadingPlay] = useState(false)

  useEffect(() => {
    console.log('[RightSidebar] useEffect déclenché, currentTrack:', currentTrack)
    if (currentTrack?.artistId) {
      console.log('[RightSidebar] Chargement de l\'artiste avec ID:', currentTrack.artistId)
      setLoadingArtist(true)
      
      // Charger l'artiste immédiatement
      getArtistById(currentTrack.artistId)
        .then((artistData) => {
          console.log('[RightSidebar] Artiste chargé:', artistData)
          console.log('[RightSidebar] coverArt (brut):', artistData?.coverArt)
          const builtUrl = artistData?.coverArt ? buildImageUrl(artistData.coverArt) : null
          console.log('[RightSidebar] coverArt URL complète (buildImageUrl):', builtUrl)
          setArtist(artistData)
          
          // Si l'artiste n'a pas d'image, réessayer rapidement (Google Drive est rapide)
          if (!artistData?.coverArt) {
            let attempts = 0
            const maxAttempts = 5 // Réduit à 5 tentatives car Google Drive est rapide
            const checkImage = () => {
              attempts++
              // Délai court : 500ms, 1s, 1.5s, puis 2s pour les suivantes
              const delay = attempts <= 3 ? attempts * 500 : 2000
              setTimeout(() => {
                console.log(`[RightSidebar] Tentative ${attempts}/${maxAttempts} pour récupérer l'image Google Drive`)
                getArtistById(currentTrack.artistId)
                  .then((updatedArtist) => {
                    console.log('[RightSidebar] Artiste mis à jour:', updatedArtist)
                    console.log('[RightSidebar] coverArt mis à jour:', updatedArtist?.coverArt)
                    if (updatedArtist?.coverArt) {
                      setArtist(updatedArtist)
                    } else if (attempts < maxAttempts) {
                      checkImage()
                    } else {
                      console.log('[RightSidebar] Nombre maximum de tentatives atteint')
                    }
                  })
                  .catch((error) => {
                    console.error('[RightSidebar] Erreur lors de la récupération de l\'image:', error)
                    if (attempts < maxAttempts) {
                      checkImage()
                    }
                  })
              }, delay)
            }
            // Démarrer la première tentative après 500ms
            setTimeout(checkImage, 500)
          }
        })
        .catch((error) => {
          console.error('[RightSidebar] Erreur lors du chargement de l\'artiste:', error)
        })
        .finally(() => setLoadingArtist(false))
    } else {
      console.log('[RightSidebar] Pas d\'artistId, réinitialisation de l\'artiste')
      setArtist(null)
    }
  }, [currentTrack?.artistId])

  const handlePlayArtist = async () => {
    if (!artist) return
    
    // Si l'artiste est déjà en cours de lecture, toggle play/pause
    if (currentTrack?.artistId === artist.id) {
      togglePlay()
      return
    }
    
    setLoadingPlay(true)
    try {
      // Récupérer tous les albums de l'artiste
      const albums = await getArtistAlbums(artist.id)
      
      // Récupérer toutes les pistes de tous les albums
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
        playAlbum(albums[0]?.id || artist.id, allTracks)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pistes de l\'artiste:', error)
    } finally {
      setLoadingPlay(false)
    }
  }

  const isCurrentArtistPlaying = currentTrack?.artistId === artist?.id && isPlaying

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-content">
        <div className="right-sidebar-section">
          <h3 className="right-sidebar-title">En cours de lecture</h3>
          {currentTrack ? (
            <div className="now-playing">
              <div className="now-playing-cover">
                {currentTrack.coverArt ? (
                  <img 
                    src={currentTrack.coverArt} 
                    alt={`${currentTrack.album} - ${currentTrack.artist}`}
                    className="now-playing-cover-img"
                  />
                ) : (
                  <div className="now-playing-cover-placeholder">
                    <i className="bi bi-vinyl"></i>
                  </div>
                )}
              </div>
              <div className="now-playing-info">
                <h2 className="now-playing-title">{currentTrack.title}</h2>
                <p className="now-playing-artist">{currentTrack.artist}</p>
              </div>
            </div>
          ) : (
            <div className="right-sidebar-placeholder">
              <i className="bi bi-music-note-beamed"></i>
              <p>Aucune piste en cours</p>
            </div>
          )}
        </div>

        {/* Bannière de l'artiste */}
        {currentTrack && (artist || currentTrack.artistId) && (
          <div className="right-sidebar-section right-sidebar-section-artist">
            <div className="artist-banner">
              {/* Image bannière avec overlay */}
              <div className="artist-banner-image-container">
                {artist?.coverArt ? (
                  <img 
                    src={buildImageUrl(artist.coverArt) || ''}
                    alt={artist.name}
                    className="artist-banner-image"
                    onLoad={() => {
                      console.log('[RightSidebar] ✓ Image bannière chargée avec succès:', buildImageUrl(artist.coverArt))
                    }}
                    onError={(e) => {
                      const imageUrl = buildImageUrl(artist.coverArt)
                      console.error('[RightSidebar] ✗ Erreur chargement image bannière:', {
                        originalUrl: artist.coverArt,
                        builtUrl: imageUrl,
                        artistName: artist.name
                      })
                      // Masquer l'image en cas d'erreur
                      const target = e.target as HTMLImageElement
                      if (target) {
                        target.style.display = 'none'
                        // Afficher le placeholder
                        const container = target.parentElement
                        if (container) {
                          let placeholder = container.querySelector('.artist-banner-image-placeholder') as HTMLElement
                          if (!placeholder) {
                            placeholder = document.createElement('div')
                            placeholder.className = 'artist-banner-image-placeholder'
                            placeholder.innerHTML = '<i class="bi bi-person-circle"></i>'
                            container.appendChild(placeholder)
                          }
                          placeholder.style.display = 'flex'
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="artist-banner-image-placeholder">
                    <i className="bi bi-person-circle"></i>
                    {console.warn('[RightSidebar] Aucune coverArt pour l\'artiste:', artist?.name)}
                  </div>
                )}
                <div className="artist-banner-overlay">
                  <h2 className="artist-banner-name-overlay">{artist?.name || currentTrack.artist}</h2>
                </div>
              </div>

              {/* Section info avec stats et synopsis */}
              {artist && (
                <div className="artist-banner-info">
                  <div className="artist-banner-header">
                    <div className="artist-banner-header-left">
                      <div className="artist-banner-stats">
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
                    </div>
                    <button 
                      className="artist-play-button" 
                      onClick={handlePlayArtist}
                      disabled={loadingPlay}
                      aria-label={isCurrentArtistPlaying ? 'Pause' : 'Lire l\'artiste'}
                    >
                      {loadingPlay ? (
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                      ) : (
                        <i className={`bi ${isCurrentArtistPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                      )}
                    </button>
                  </div>

                  {/* Synopsis/Biographie */}
                  {artist.biography && (
                    <div className="artist-banner-biography">
                      <h4 className="artist-biography-title">À propos</h4>
                      <p className="artist-biography-text">{artist.biography}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Debug: Afficher les infos même si pas d'artiste chargé */}
        {currentTrack && !artist && !loadingArtist && currentTrack.artistId && (
          <div className="right-sidebar-section">
            <div className="right-sidebar-placeholder">
              <p>Artiste non trouvé</p>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                ID: {currentTrack.artistId}<br />
                Nom: {currentTrack.artist}
              </p>
            </div>
          </div>
        )}

        <div className="right-sidebar-section">
          <h3 className="right-sidebar-title">Récemment joués</h3>
          {recentlyPlayed.length > 0 ? (
            <div className="recently-played-list">
              {recentlyPlayed.map((track) => (
                <div
                  key={track.id}
                  className="recently-played-item"
                  onClick={() => playTrack(track)}
                >
                  <div className="recently-played-cover">
                    {track.coverArt ? (
                      <img 
                        src={track.coverArt} 
                        alt={`${track.album} - ${track.artist}`}
                        className="recently-played-cover-img"
                      />
                    ) : (
                      <div className="recently-played-cover-placeholder">
                        <i className="bi bi-vinyl"></i>
                      </div>
                    )}
                  </div>
                  <div className="recently-played-info">
                    <div className="recently-played-title">{track.title}</div>
                    <div className="recently-played-artist">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="right-sidebar-placeholder">
              <p>Vos morceaux récents apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RightSidebar
