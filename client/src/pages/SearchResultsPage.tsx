import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'
import { searchAll, SearchResults as SearchResultsType } from '../services/musicService'
import AlbumGrid from '../components/AlbumGrid'
import ArtistGrid from '../components/ArtistGrid'
import './SearchResultsPage.css'

function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResultsType>({
    albums: [],
    artists: [],
    tracks: [],
    genres: [],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim()) {
      performSearch(query.trim())
    } else {
      setResults({ albums: [], artists: [], tracks: [], genres: [] })
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    try {
      const searchResults = await searchAll(searchQuery)
      setResults(searchResults)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
      setResults({ albums: [], artists: [], tracks: [], genres: [] })
    } finally {
      setLoading(false)
    }
  }

  const hasResults = 
    results.albums.length > 0 || 
    results.artists.length > 0 || 
    results.tracks.length > 0 || 
    results.genres.length > 0

  if (loading) {
    return (
      <Container fluid className="search-results-page">
        <Row>
          <Col>
            <div className="search-loading">
              <i className="bi bi-arrow-repeat spinning"></i>
              <p>Recherche en cours...</p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  if (!query.trim()) {
    return (
      <Container fluid className="search-results-page">
        <Row>
          <Col>
            <div className="search-empty">
              <i className="bi bi-search"></i>
              <h2>Rechercher dans votre bibliothèque</h2>
              <p>Saisissez un terme de recherche dans la barre de recherche pour commencer</p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  if (!hasResults) {
    return (
      <Container fluid className="search-results-page">
        <Row>
          <Col>
            <h1 className="page-title">
              <i className="bi bi-search"></i>
              Résultats de recherche pour "{query}"
            </h1>
            <div className="search-no-results">
              <i className="bi bi-search"></i>
              <p>Aucun résultat trouvé pour "{query}"</p>
              <p className="search-suggestions">
                Essayez de rechercher par nom d'artiste, titre d'album, titre de morceau ou genre
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container fluid className="search-results-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-search"></i>
            Résultats de recherche pour "{query}"
          </h1>

          {/* Section Albums */}
          {results.albums.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <h2 className="search-section-title">
                  <i className="bi bi-vinyl"></i>
                  Albums ({results.albums.length})
                </h2>
              </div>
              <AlbumGrid albums={results.albums} />
            </div>
          )}

          {/* Section Artistes */}
          {results.artists.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <h2 className="search-section-title">
                  <i className="bi bi-person-circle"></i>
                  Artistes ({results.artists.length})
                </h2>
              </div>
              <ArtistGrid artists={results.artists} />
            </div>
          )}

          {/* Section Morceaux */}
          {results.tracks.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <h2 className="search-section-title">
                  <i className="bi bi-music-note-beamed"></i>
                  Morceaux ({results.tracks.length})
                </h2>
              </div>
              <div className="search-tracks-list">
                {results.tracks.map((track) => (
                  <Link
                    key={track.id}
                    to={`/album/${track.albumId}`}
                    className="search-track-item"
                  >
                    <div className="search-track-info">
                      <div className="search-track-title-artist">
                        <span className="search-track-title">{track.title}</span>
                        <span className="search-track-artist">{track.artist}</span>
                      </div>
                    </div>
                    <i className="bi bi-play-circle search-track-play"></i>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section Genres */}
          {results.genres.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <h2 className="search-section-title">
                  <i className="bi bi-tags"></i>
                  Genres ({results.genres.length})
                </h2>
              </div>
              <div className="search-genres-grid">
                {results.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to="/genres"
                    className="search-genre-item"
                  >
                    <div className="search-genre-cover">
                      <i className="bi bi-tags"></i>
                    </div>
                    <div className="search-genre-info">
                      <div className="search-genre-name">{genre.name}</div>
                      {genre.albumCount !== undefined && (
                        <div className="search-genre-count">
                          {genre.albumCount} album{genre.albumCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default SearchResultsPage

