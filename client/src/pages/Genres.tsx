import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import GenreGrid from '../components/GenreGrid'
import { getGenres, Genre } from '../services/musicService'
import './Home.css'

function Genres() {
  const [genres, setGenres] = useState<Genre[]>([])

  useEffect(() => {
    loadGenres()
  }, [])

  const loadGenres = async () => {
    try {
      const loadedGenres = await getGenres()
      setGenres(loadedGenres)
    } catch (error) {
      console.error('Erreur lors du chargement des genres:', error)
    }
  }

  return (
    <Container fluid className="genres-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-tags me-2"></i>
            Genres
          </h1>
          <GenreGrid genres={genres} />
        </Col>
      </Row>
    </Container>
  )
}

export default Genres
