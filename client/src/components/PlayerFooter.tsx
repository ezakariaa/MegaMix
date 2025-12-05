import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../contexts/PlayerContext'
import './PlayerFooter.css'

function PlayerFooter() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    isShuffled,
    repeatMode,
    togglePlay,
    setVolume,
    setShuffled,
    setRepeatMode,
    nextTrack,
    previousTrack,
  } = usePlayer()
  
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [isVolumeHovered, setIsVolumeHovered] = useState(false)
  const previousVolumeRef = useRef<number>(50) // Volume par défaut si aucun n'était sauvegardé

  const handleCoverClick = () => {
    if (currentTrack?.albumId) {
      navigate(`/album/${currentTrack.albumId}`)
    }
  }

  const handleVolumeToggle = () => {
    if (volume > 0) {
      // Sauvegarder le volume actuel et mettre à mute
      previousVolumeRef.current = volume
      setVolume(0)
    } else {
      // Restaurer le volume précédent
      setVolume(previousVolumeRef.current > 0 ? previousVolumeRef.current : 50)
    }
  }

  // Si aucune piste n'est sélectionnée, afficher un état par défaut
  if (!currentTrack) {
    return (
      <div className="player-footer">
        <div className="player-footer-content">
          <div className="player-left">
            <div className="player-track-info">
              <p className="player-track-title">Aucune piste sélectionnée</p>
              <p className="player-track-artist">Sélectionnez une piste pour commencer</p>
            </div>
          </div>
          <div className="player-center">
            <div className="player-controls">
              <button className="player-control-btn" disabled>
                <i className="bi bi-shuffle"></i>
              </button>
              <button className="player-control-btn" disabled>
                <i className="bi bi-skip-start-fill"></i>
              </button>
              <button className="player-control-btn player-play-btn" disabled>
                <i className="bi bi-play-fill"></i>
              </button>
              <button className="player-control-btn" disabled>
                <i className="bi bi-skip-end-fill"></i>
              </button>
              <button className="player-control-btn" disabled>
                <i className="bi bi-repeat"></i>
              </button>
            </div>
            <div className="player-progress">
              <span className="player-time-current">0:00</span>
              <div className="player-progress-bar">
                <div className="player-progress-filled" style={{ width: '0%' }}></div>
              </div>
              <span className="player-time-total">0:00</span>
            </div>
          </div>
          <div className="player-right">
            <div className="player-extra-controls">
              <button className="player-extra-btn" disabled>
                <i className="bi bi-camera-video"></i>
              </button>
              <button className="player-extra-btn" disabled>
                <i className="bi bi-mic"></i>
              </button>
              <button className="player-extra-btn" disabled>
                <i className="bi bi-list-ul"></i>
              </button>
              <button className="player-extra-btn" disabled>
                <i className="bi bi-device-hdd"></i>
              </button>
              <div className="player-volume-control">
                <button className="player-extra-btn" onClick={handleVolumeToggle}>
                  <i className="bi bi-volume-down"></i>
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  onMouseEnter={() => setIsVolumeHovered(true)}
                  onMouseLeave={() => setIsVolumeHovered(false)}
                  className="player-volume-slider"
                  style={{
                    background: `linear-gradient(to right, ${isVolumeHovered ? 'var(--spotify-green)' : '#ffffff'} ${volume}%, rgba(255, 255, 255, 0.3) ${volume}%)`
                  }}
                />
              </div>
              <button className="player-extra-btn" disabled>
                <i className="bi bi-arrows-fullscreen"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = currentTrack.duration > 0 
    ? (currentTime / currentTrack.duration) * 100 
    : 0

  return (
    <div className="player-footer">
      <div className="player-footer-content">
        {/* Section gauche : Album art + Info */}
        <div className="player-left">
          <div 
            className="player-album-art"
            onClick={handleCoverClick}
            style={{ cursor: currentTrack.albumId ? 'pointer' : 'default' }}
            title={currentTrack.albumId ? 'Voir l\'album' : undefined}
          >
            {currentTrack.coverArt ? (
              <img src={currentTrack.coverArt} alt={currentTrack.album} />
            ) : (
              <div className="player-album-art-placeholder">
                <i className="bi bi-music-note-beamed"></i>
              </div>
            )}
          </div>
          <div className="player-track-info">
            <div className="player-track-title-wrapper">
              <p className="player-track-title">{currentTrack.title}</p>
              <button
                className={`player-like-btn ${isLiked ? 'liked' : ''}`}
                onClick={() => setIsLiked(!isLiked)}
                aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <i className={`bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              </button>
            </div>
            <p className="player-track-artist">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Section centrale : Contrôles de lecture */}
        <div className="player-center">
          <div className="player-controls">
            <button
              className={`player-control-btn ${isShuffled ? 'active' : ''}`}
              onClick={() => setShuffled(!isShuffled)}
              aria-label="Activer/désactiver le mode aléatoire"
            >
              <i className="bi bi-shuffle"></i>
              {isShuffled && <span className="player-control-indicator"></span>}
            </button>
            <button
              className="player-control-btn"
              onClick={previousTrack}
              aria-label="Piste précédente"
              disabled={!currentTrack}
            >
              <i className="bi bi-skip-start-fill"></i>
            </button>
            <button
              className="player-control-btn player-play-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              disabled={!currentTrack}
            >
              <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
            </button>
            <button
              className="player-control-btn"
              onClick={nextTrack}
              aria-label="Piste suivante"
              disabled={!currentTrack}
            >
              <i className="bi bi-skip-end-fill"></i>
            </button>
            <button
              className={`player-control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
              onClick={() => {
                const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
                const currentIndex = modes.indexOf(repeatMode)
                setRepeatMode(modes[(currentIndex + 1) % modes.length])
              }}
              aria-label={`Mode répétition: ${repeatMode}`}
            >
              <i className={`bi ${repeatMode === 'one' ? 'bi-repeat-1' : 'bi-repeat'}`}></i>
              {repeatMode !== 'off' && <span className="player-control-indicator"></span>}
            </button>
          </div>
          <div className="player-progress">
            <span className="player-time-current">{formatTime(currentTime)}</span>
            <div className="player-progress-bar">
              <div
                className="player-progress-filled"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="player-progress-handle"></div>
              </div>
            </div>
            <span className="player-time-total">{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Section droite : Contrôles supplémentaires */}
        <div className="player-right">
          <div className="player-extra-controls">
            <button className="player-extra-btn" aria-label="Vidéo">
              <i className="bi bi-camera-video"></i>
            </button>
            <button className="player-extra-btn" aria-label="Paroles">
              <i className="bi bi-mic"></i>
            </button>
            <button className="player-extra-btn" aria-label="File d'attente">
              <i className="bi bi-list-ul"></i>
            </button>
            <button className="player-extra-btn" aria-label="Connecter un appareil">
              <i className="bi bi-device-hdd"></i>
            </button>
            <div className="player-volume-control">
              <button className="player-extra-btn" onClick={handleVolumeToggle} aria-label="Volume">
                <i className={`bi ${volume === 0 ? 'bi-volume-mute' : volume < 50 ? 'bi-volume-down' : 'bi-volume-up'}`}></i>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onMouseEnter={() => setIsVolumeHovered(true)}
                onMouseLeave={() => setIsVolumeHovered(false)}
                className="player-volume-slider"
                style={{
                  background: `linear-gradient(to right, ${isVolumeHovered ? '#f1c40f' : '#ffffff'} ${volume}%, rgba(255, 255, 255, 0.3) ${volume}%)`
                }}
                aria-label="Volume"
              />
            </div>
            <button className="player-extra-btn" aria-label="Plein écran">
              <i className="bi bi-arrows-fullscreen"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerFooter

