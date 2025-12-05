import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Album, getAlbumTracks } from '../services/musicService'
import { usePlayer } from '../contexts/PlayerContext'
import './AlbumGrid.css'

interface AlbumGridProps {
  albums: Album[]
  selectionMode?: boolean
  selectedAlbums?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
}

function AlbumGrid({ albums, selectionMode = false, selectedAlbums = new Set(), onSelectionChange }: AlbumGridProps) {
  const navigate = useNavigate()
  const { playAlbum } = usePlayer()
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null)

  const handleAlbumClick = (album: Album) => {
    if (selectionMode) {
      // En mode sélection, toggle la sélection
      const newSelected = new Set(selectedAlbums)
      if (newSelected.has(album.id)) {
        newSelected.delete(album.id)
      } else {
        newSelected.add(album.id)
      }
      onSelectionChange?.(newSelected)
    } else {
      // Naviguer vers la page de détail de l'album
      navigate(`/album/${album.id}`)
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation()
    const newSelected = new Set(selectedAlbums)
    if (newSelected.has(album.id)) {
      newSelected.delete(album.id)
    } else {
      newSelected.add(album.id)
    }
    onSelectionChange?.(newSelected)
  }

  const handlePlayClick = async (e: React.MouseEvent, album: Album) => {
    // Empêcher la propagation pour ne pas déclencher handleAlbumClick
    e.stopPropagation()
    
    if (loadingAlbumId === album.id) return

    setLoadingAlbumId(album.id)
    try {
      const tracks = await getAlbumTracks(album.id)
      
      if (tracks.length > 0) {
        // Convertir les pistes au format attendu par le player
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
        
        playAlbum(album.id, playerTracks)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pistes:', error)
    } finally {
      setLoadingAlbumId(null)
    }
  }

  if (albums.length === 0) {
    return (
      <div className="album-grid-empty">
        <i className="bi bi-music-note-beamed"></i>
        <p>Aucun album dans votre bibliothèque</p>
        <p className="text-muted">Glissez un dossier de musique pour commencer</p>
      </div>
    )
  }

  return (
    <div className="album-grid">
      {albums.map((album) => (
        <div 
          key={album.id} 
          className={`album-card ${selectionMode && selectedAlbums.has(album.id) ? 'selected' : ''}`}
          onClick={() => handleAlbumClick(album)}
        >
          <div className="album-cover-container">
            {album.coverArt ? (
              <img 
                src={album.coverArt} 
                alt={`${album.title} - ${album.artist}`}
                className="album-cover"
              />
            ) : (
              <div className="album-cover-placeholder">
                <i className="bi bi-vinyl"></i>
              </div>
            )}
            {selectionMode && (
              <div className="album-checkbox-container">
                <input
                  type="checkbox"
                  checked={selectedAlbums.has(album.id)}
                  onChange={() => {}}
                  onClick={(e) => handleCheckboxClick(e, album)}
                  className="album-checkbox"
                />
              </div>
            )}
            {!selectionMode && (
              <div className="album-cover-overlay">
                <button
                  className="album-play-button-overlay"
                  onClick={(e) => handlePlayClick(e, album)}
                  aria-label="Lire l'album"
                >
                  {loadingAlbumId === album.id ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                  ) : (
                    <i className="bi bi-play-fill"></i>
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="album-info">
            <h3 className="album-title" title={album.title}>
              {album.title}
            </h3>
            <p className="album-artist" title={album.artist}>
              {album.artist}
            </p>
            {album.year && (
              <p className="album-year">{album.year}</p>
            )}
            {album.trackCount && (
              <p className="album-track-count">
                {album.trackCount} {album.trackCount === 1 ? 'piste' : 'pistes'}
                {album.cdCount && album.cdCount > 1 && (
                  <span> • {album.cdCount} CD{album.cdCount > 1 ? 's' : ''}</span>
                )}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AlbumGrid
