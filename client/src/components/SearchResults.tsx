import { Link } from 'react-router-dom'
import { Album, Artist, Track, Genre, SearchResults as SearchResultsType, buildImageUrl } from '../services/musicService'
import './SearchResults.css'

interface SearchResultsProps {
  results: SearchResultsType
  searchQuery?: string
  onClose?: () => void
}

function SearchResults({ results, searchQuery = '', onClose }: SearchResultsProps) {
  const { albums, artists, tracks, genres } = results
  
  const hasResults = albums.length > 0 || artists.length > 0 || tracks.length > 0 || genres.length > 0

  if (!hasResults) {
    return (
      <div className="search-results-container">
        <div className="search-results-empty">
          <i className="bi bi-search"></i>
          <p>Aucun résultat trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results-container">
      {/* Section Albums */}
      {albums.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-section-title">
            <i className="bi bi-vinyl"></i>
            Albums
          </h3>
          <div className="search-results-grid">
            {albums.slice(0, 6).map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                className="search-results-item"
                onClick={onClose}
              >
                <div className="search-results-item-cover">
                  {album.coverArt ? (
                    <img src={album.coverArt} alt={album.title} />
                  ) : (
                    <div className="search-results-item-placeholder">
                      <i className="bi bi-vinyl"></i>
                    </div>
                  )}
                </div>
                <div className="search-results-item-info">
                  <div className="search-results-item-title">{album.title}</div>
                  <div className="search-results-item-subtitle">{album.artist}</div>
                </div>
              </Link>
            ))}
          </div>
          {albums.length > 6 && (
            <div className="search-results-more">
              <Link to={`/search?q=${encodeURIComponent(searchQuery)}`} onClick={onClose}>
                Voir tous les albums ({albums.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Section Artistes */}
      {artists.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-section-title">
            <i className="bi bi-person-circle"></i>
            Artistes
          </h3>
          <div className="search-results-grid">
            {artists.slice(0, 6).map((artist) => (
              <Link
                key={artist.id}
                to="/artists"
                className="search-results-item"
                onClick={onClose}
              >
                <div className="search-results-item-cover search-results-item-cover-round">
                  {artist.coverArt ? (
                    <img 
                      src={buildImageUrl(artist.coverArt) || ''} 
                      alt={artist.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        if (target) {
                          target.style.display = 'none'
                          const container = target.parentElement
                          if (container && !container.querySelector('.search-results-item-placeholder')) {
                            const placeholder = document.createElement('div')
                            placeholder.className = 'search-results-item-placeholder'
                            placeholder.innerHTML = '<i class="bi bi-person-circle"></i>'
                            container.appendChild(placeholder)
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="search-results-item-placeholder">
                      <i className="bi bi-person-circle"></i>
                    </div>
                  )}
                </div>
                <div className="search-results-item-info">
                  <div className="search-results-item-title">{artist.name}</div>
                  {artist.albumCount !== undefined && (
                    <div className="search-results-item-subtitle">
                      {artist.albumCount} album{artist.albumCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {artists.length > 6 && (
            <div className="search-results-more">
              <Link to={`/search?q=${encodeURIComponent(searchQuery)}`} onClick={onClose}>
                Voir tous les artistes ({artists.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Section Morceaux */}
      {tracks.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-section-title">
            <i className="bi bi-music-note-beamed"></i>
            Morceaux
          </h3>
          <div className="search-results-list">
            {tracks.slice(0, 8).map((track) => (
              <Link
                key={track.id}
                to={`/album/${track.albumId}`}
                className="search-results-track-item"
                onClick={onClose}
              >
                <div className="search-results-track-info">
                  <div className="search-results-track-title-artist">
                    <span className="search-results-track-title">{track.title}</span>
                    <span className="search-results-track-artist">{track.artist}</span>
                  </div>
                </div>
                <i className="bi bi-play-circle search-results-track-play"></i>
              </Link>
            ))}
          </div>
          {tracks.length > 8 && (
            <div className="search-results-more">
              <Link to={`/search?q=${encodeURIComponent(searchQuery)}`} onClick={onClose}>
                Voir tous les morceaux ({tracks.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Section Genres */}
      {genres.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-section-title">
            <i className="bi bi-tags"></i>
            Genres
          </h3>
          <div className="search-results-grid">
            {genres.slice(0, 6).map((genre) => (
              <Link
                key={genre.id}
                to="/genres"
                className="search-results-item search-results-genre-item"
                onClick={onClose}
              >
                <div className="search-results-item-cover search-results-genre-cover">
                  <div className="search-results-item-placeholder">
                    <i className="bi bi-tags"></i>
                  </div>
                </div>
                <div className="search-results-item-info">
                  <div className="search-results-item-title">{genre.name}</div>
                  {genre.albumCount !== undefined && (
                    <div className="search-results-item-subtitle">
                      {genre.albumCount} album{genre.albumCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {genres.length > 6 && (
            <div className="search-results-more">
              <Link to={`/search?q=${encodeURIComponent(searchQuery)}`} onClick={onClose}>
                Voir tous les genres ({genres.length})
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchResults

