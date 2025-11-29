import { useState, useEffect } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import DragDropZone from '../components/DragDropZone'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, scanMusicFiles, Album } from '../services/musicService'
import './Home.css'

function Home() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(false)

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

  const handleFilesDropped = async (files: File[]) => {
    setLoading(true)
    try {
      await scanMusicFiles(files)
      await loadAlbums()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DragDropZone onFilesDropped={handleFilesDropped}>
      <Container fluid className="home-page">
      <Row className="mb-2">
        <Col md={6} lg={3} className="mb-4">
          <Card className="spotify-card h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-person-badge me-2"></i>
                Artistes
              </Card.Title>
              <Card.Text>
                Parcourez et gérez tous vos artistes
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-4">
          <Card className="spotify-card h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-vinyl me-2"></i>
                Albums
              </Card.Title>
              <Card.Text>
                Organisez vos albums par artiste
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-4">
          <Card className="spotify-card h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-tags me-2"></i>
                Genres
              </Card.Title>
              <Card.Text>
                Triez votre musique par genre
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} lg={3} className="mb-4">
          <Card className="spotify-card h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-list-ul me-2"></i>
                Playlists
              </Card.Title>
              <Card.Text>
                Créez et gérez vos playlists personnalisées
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {albums.length > 0 && (
        <Row className="mb-5">
          <Col>
            <h2 className="section-title">Vos albums récents</h2>
            <AlbumGrid albums={albums.slice(0, 8)} />
          </Col>
        </Row>
      )}
    </Container>
    </DragDropZone>
  )
}

export default Home
