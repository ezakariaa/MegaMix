import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, Album } from '../services/musicService'
import './Home.css'

function Albums() {
  const [albums, setAlbums] = useState<Album[]>([])

  useEffect(() => {
    loadAlbums()
  }, [])

  const loadAlbums = async () => {
    try {
      const loadedAlbums = await getAlbums()
      setAlbums(loadedAlbums)
    } catch (error) {
      console.error('Erreur lors du chargement des albums:', error)
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
          <AlbumGrid albums={albums} />
        </Col>
      </Row>
    </Container>
  )
}

export default Albums
