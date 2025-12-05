import { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner } from 'react-bootstrap'
import AlbumGrid from '../components/AlbumGrid'
import { getAlbums, Album } from '../services/musicService'
import './Home.css'

function Compilations() {
  const [compilations, setCompilations] = useState<Album[]>([])
  const [loading, setLoading] = useState(false) // Ne pas afficher de loader par défaut

  useEffect(() => {
    // Charger immédiatement sans loader (utilise le cache)
    loadCompilations()
  }, [])

  const loadCompilations = async () => {
    try {
      // getAlbums() utilise automatiquement le cache s'il est disponible
      const allAlbums = await getAlbums()
      // Filtrer les compilations : albums avec "Various", "Compilation", "Various Artists" dans l'artiste
      const filtered = allAlbums.filter(album => {
        const artistLower = album.artist.toLowerCase()
        return artistLower.includes('various') || 
               artistLower.includes('compilation') ||
               artistLower.includes('various artists') ||
               artistLower === 'various'
      })
      setCompilations(filtered)
    } catch (error) {
      console.error('Erreur lors du chargement des compilations:', error)
    }
  }

  return (
    <Container fluid className="albums-page">
      <Row>
        <Col>
          <h1 className="page-title">
            <i className="bi bi-collection-play me-2"></i>
            Compilations
          </h1>
          {compilations.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-collection-play" style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '16px' }}></i>
              <p className="text-muted">Aucune compilation dans votre bibliothèque</p>
            </div>
          ) : (
            <AlbumGrid albums={compilations} />
          )}
        </Col>
      </Row>
    </Container>
  )
}

export default Compilations

