import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import ArtistGrid from '../components/ArtistGrid'
import { getArtists, Artist } from '../services/musicService'
import './Home.css'

function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])

  useEffect(() => {
    loadArtists()
  }, [])

  const loadArtists = async () => {
    try {
      const loadedArtists = await getArtists()
      setArtists(loadedArtists)
    } catch (error) {
      console.error('Erreur lors du chargement des artistes:', error)
    }
  }

  return (
    <Container fluid className="artists-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-person-badge me-2"></i>
            Artistes
          </h1>
          <ArtistGrid artists={artists} />
        </Col>
      </Row>
    </Container>
  )
}

export default Artists
