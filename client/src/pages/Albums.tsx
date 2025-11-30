import { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner } from 'react-bootstrap'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, Album } from '../services/musicService'
import './Home.css'

function Albums() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlbums()
  }, [])

  const loadAlbums = async () => {
    setLoading(true)
    try {
      const loadedAlbums = await getAlbums()
      setAlbums(loadedAlbums)
    } catch (error) {
      console.error('Erreur lors du chargement des albums:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container fluid className="albums-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-vinyl me-2"></i>
            Albums
          </h1>
          {loading && albums.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" className="mb-3">
                <span className="visually-hidden">Chargement...</span>
              </Spinner>
              <p className="text-muted">Chargement des albums...</p>
            </div>
          ) : (
            <AlbumGrid albums={albums} />
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default Albums
